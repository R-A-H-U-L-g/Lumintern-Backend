import Task from '../models/Task.js';
import User from '../models/User.js';
import Application from '../models/Application.js';
import Wallet from '../models/Wallet.js';
import workNotificationEngine from '../utils/workNotificationEngine.js';

// ====================
// CREATE TASK WITH NOTIFICATIONS
// ====================
export const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      workScale,
      budget,
      deadline,
      skillsRequired,
      tags,
      isUrgent,
    } = req.body;

    // Create task
    const task = await Task.create({
      title,
      description,
      postedBy: req.user._id,
      workScale,
      budget,
      deadline,
      skillsRequired,
      tags,
      isUrgent,
    });

    // Update business posted tasks count
    await req.user.updateOne({
      $inc: { 'businessProfile.postedTasks': 1 },
    });

    // ====================
    // NOTIFICATION: Broadcast to matching freshers
    // ====================
    try {
      // Find top 10 freshers whose skills overlap with task requirements
      const matchingFreshers = await User.find({
        role: 'fresher',
        isActive: true,
        'fresherProfile.skills': { $in: skillsRequired },
      })
        .select('name email fresherProfile.skills fresherProfile.preferredWorkScale')
        .limit(10)
        .lean();

      // Filter by work scale preference
      const filteredFreshers = matchingFreshers.filter((fresher) => {
        const preference = fresher.fresherProfile?.preferredWorkScale;
        return preference === 'both' || preference === workScale;
      });

      if (filteredFreshers.length > 0) {
        // Fire notification event
        workNotificationEngine.emit('work.broadcast', {
          task: {
            _id: task._id,
            title: task.title,
            description: task.description,
            workScale: task.workScale,
            budget: task.budget,
            skillsRequired: task.skillsRequired,
            deadline: task.deadline,
          },
          targetFreshers: filteredFreshers,
        });

        console.log(`📢 Task broadcast sent to ${filteredFreshers.length} matching freshers`);
      }
    } catch (notificationError) {
      // Don't fail the task creation if notifications fail
      console.error('Notification error (non-blocking):', notificationError.message);
    }

    res.status(201).json({
      status: 'success',
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// SUBMIT TASK WORK WITH NOTIFICATIONS
// ====================
export const submitTaskWork = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskId } = req.params;
    const { proofLink, submissionNotes } = req.body;
    const fresherId = req.user._id;

    // Validate proof link
    if (!proofLink) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Proof of work link is required',
      });
    }

    // Fetch task with populated data
    const task = await Task.findById(taskId)
      .populate('postedBy', 'name email businessProfile.businessName')
      .session(session);

    if (!task) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Verify fresher is assigned
    if (task.assignedTo.toString() !== fresherId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        status: 'error',
        message: 'You can only submit work for tasks assigned to you',
      });
    }

    // Verify task is in progress
    if (task.status !== 'in_progress') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Cannot submit work. Task status is "${task.status}"`,
      });
    }

    // Update task with proof of work
    task.proofOfWork = {
      proofLink,
      submissionNotes: submissionNotes || '',
      submittedAt: new Date(),
    };
    task.status = 'review';
    await task.save({ session });

    // Get fresher details for notification
    const fresher = await User.findById(fresherId).select('name email').lean();

    await session.commitTransaction();
    session.endSession();

    // ====================
    // NOTIFICATION: Alert business about submission
    // ====================
    try {
      workNotificationEngine.emit('work.submitted', {
        task: {
          _id: task._id,
          title: task.title,
          budget: task.budget,
          workScale: task.workScale,
          postedBy: task.postedBy,
        },
        fresher: {
          _id: fresher._id,
          name: fresher.name,
          email: fresher.email,
        },
        proofLink,
      });

      console.log(`📤 Work submission notification sent to business: ${task.postedBy.name || task.postedBy.businessProfile?.businessName}`);
    } catch (notificationError) {
      console.error('Notification error (non-blocking):', notificationError.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'Work submitted successfully. Awaiting business review.',
      data: {
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          proofOfWork: task.proofOfWork,
        },
        autoReleaseInfo: 'If the business does not respond within 72 hours, payment will be automatically released.',
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// ====================
// APPROVE AND RELEASE PAYMENT WITH NOTIFICATIONS
// ====================
export const approveAndReleasePayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskId } = req.params;
    const { feedback } = req.body;
    const businessId = req.user._id;

    // Fetch task
    const task = await Task.findById(taskId).session(session);
    if (!task) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Verify business owns task
    if (task.postedBy.toString() !== businessId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        status: 'error',
        message: 'You can only approve tasks you posted',
      });
    }

    // Verify task is in review
    if (task.status !== 'review') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Cannot approve. Task status is "${task.status}"`,
      });
    }

    // Get wallets
    const businessWallet = await Wallet.getOrCreateWallet(businessId);
    const fresherWallet = await Wallet.getOrCreateWallet(task.assignedTo);

    // Release escrow to fresher
    await businessWallet.releaseEscrow(
      task.budget,
      task._id,
      fresherWallet,
      `Payment for task: ${task.title}`
    );

    // Update task status
    task.status = 'completed';
    task.paymentStatus = 'released';
    task.completedAt = new Date();
    await task.save({ session });

    // Update fresher stats
    await User.findByIdAndUpdate(
      task.assignedTo,
      {
        $inc: {
          'fresherProfile.completedTasks': 1,
          'fresherProfile.totalEarnings': task.budget,
        },
      },
      { session }
    );

    // Update business stats
    await User.findByIdAndUpdate(
      businessId,
      {
        $inc: {
          'businessProfile.totalSpent': task.budget,
        },
      },
      { session }
    );

    // Get fresher details AFTER wallet update for accurate balance
    const fresher = await User.findById(task.assignedTo)
      .select('name email')
      .lean();
    
    // Get updated wallet balance
    const updatedFresherWallet = await Wallet.findById(fresherWallet._id).lean();

    await session.commitTransaction();
    session.endSession();

    // ====================
    // NOTIFICATION: Alert fresher about payment
    // ====================
    try {
      workNotificationEngine.emit('work.paid', {
        task: {
          _id: task._id,
          title: task.title,
          workScale: task.workScale,
        },
        fresher: {
          _id: fresher._id,
          name: fresher.name,
          email: fresher.email,
        },
        paymentAmount: task.budget,
        newBalance: updatedFresherWallet.balance,
      });

      console.log(`💰 Payment notification sent to fresher: ${fresher.name} - $${task.budget} - New balance: $${updatedFresherWallet.balance}`);
    } catch (notificationError) {
      console.error('Notification error (non-blocking):', notificationError.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'Task approved and payment released successfully!',
      data: {
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          paymentStatus: task.paymentStatus,
          completedAt: task.completedAt,
        },
        payment: {
          amount: task.budget,
          fresherBalance: updatedFresherWallet.balance,
          businessEscrowBalance: businessWallet.escrowBalance,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};