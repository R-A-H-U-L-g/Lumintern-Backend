import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';

// ====================
// ENDPOINT A: Fund & Start Task (Business Gate)
// ====================
export const fundAndStartTask = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskId } = req.params;
    const businessId = req.user._id;

    // 1) Fetch task with session
    const task = await Task.findById(taskId).session(session);
    if (!task) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // 2) Verify business owns this task
    if (task.postedBy.toString() !== businessId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        status: 'error',
        message: 'You can only fund tasks you posted',
      });
    }

    // 3) Verify task has an assigned fresher
    if (!task.assignedTo) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Task must have an assigned fresher before funding',
      });
    }

    // 4) Verify task status is 'open' or 'in_progress' (not already funded)
    if (task.paymentStatus !== 'unfunded') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Task payment status is already "${task.paymentStatus}". Cannot fund again.`,
      });
    }

    // 5) Get business wallet
    const businessWallet = await Wallet.getOrCreateWallet(businessId);

    // 6) Check sufficient balance
    if (businessWallet.balance < task.budget) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Insufficient balance. Required: $${task.budget}, Available: $${businessWallet.balance}. Please add funds to your wallet.`,
      });
    }

    // 7) Hold funds in escrow
    await businessWallet.holdInEscrow(
      task.budget,
      task._id,
      `Escrow hold for task: ${task.title}`
    );

    // 8) Update task status
    task.paymentStatus = 'held_in_escrow';
    task.status = 'in_progress';
    task.fundedAt = new Date();
    task.initializeMilestones();
    await task.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      message: 'Task funded successfully. Work can now begin.',
      data: {
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          paymentStatus: task.paymentStatus,
          budget: task.budget,
          milestones: task.milestones,
        },
        wallet: {
          balance: businessWallet.balance,
          escrowBalance: businessWallet.escrowBalance,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// ====================
// ENDPOINT B: Submit Task Work (Fresher Gate)
// ====================
export const submitTaskWork = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskId } = req.params;
    const { proofLink, submissionNotes } = req.body;
    const fresherId = req.user._id;

    // 1) Validate proof link is provided
    if (!proofLink) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Proof of work link is required. Please provide a link to your code, design staging, screenshots, or deliverables.',
      });
    }

    // 2) Validate URL format
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
    if (!urlPattern.test(proofLink)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid URL for proof of work',
      });
    }

    // 3) Fetch task
    const task = await Task.findById(taskId).session(session);
    if (!task) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // 4) Verify fresher is assigned to this task
    if (task.assignedTo.toString() !== fresherId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        status: 'error',
        message: 'You can only submit work for tasks assigned to you',
      });
    }

    // 5) Verify task is in progress and funded
    if (task.status !== 'in_progress') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Cannot submit work. Task status is "${task.status}". Task must be "in_progress".`,
      });
    }

    if (task.paymentStatus !== 'held_in_escrow') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Task payment has not been funded yet. Work cannot be submitted.',
      });
    }

    // 6) Update task with proof of work
    task.proofOfWork = {
      proofLink,
      submissionNotes: submissionNotes || '',
      submittedAt: new Date(),
    };
    task.status = 'review';
    await task.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

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
        autoReleaseInfo: 'If the business does not respond within 72 hours, payment will be automatically released to you.',
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// ====================
// ENDPOINT C: Approve & Release Payment (Business Gate)
// ====================
export const approveAndReleasePayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskId } = req.params;
    const { feedback } = req.body;
    const businessId = req.user._id;

    // 1) Fetch task
    const task = await Task.findById(taskId).session(session);
    if (!task) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // 2) Verify business owns this task
    if (task.postedBy.toString() !== businessId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        status: 'error',
        message: 'You can only approve tasks you posted',
      });
    }

    // 3) Verify task is in review status
    if (task.status !== 'review') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Cannot approve. Task status is "${task.status}". Task must be in "review".`,
      });
    }

    // 4) Verify payment is held in escrow
    if (task.paymentStatus !== 'held_in_escrow') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'No payment held in escrow for this task',
      });
    }

    // 5) Get wallets
    const businessWallet = await Wallet.getOrCreateWallet(businessId);
    const fresherWallet = await Wallet.getOrCreateWallet(task.assignedTo);

    // 6) Release escrow to fresher
    await businessWallet.releaseEscrow(
      task.budget,
      task._id,
      fresherWallet,
      `Payment for task: ${task.title}`
    );

    // 7) Update task status
    task.status = 'completed';
    task.paymentStatus = 'released';
    task.completedAt = new Date();
    await task.save({ session });

    // 8) Update fresher stats
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

    // 9) Update business stats
    await User.findByIdAndUpdate(
      businessId,
      {
        $inc: {
          'businessProfile.totalSpent': task.budget,
        },
      },
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

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
          fresherBalance: fresherWallet.balance,
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

// ====================
// ENDPOINT D: Open Dispute
// ====================
export const openDispute = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskId } = req.params;
    const { reason } = req.body;
    const businessId = req.user._id;

    // 1) Validate reason
    if (!reason || reason.trim().length < 20) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a detailed dispute reason (minimum 20 characters)',
      });
    }

    // 2) Fetch task
    const task = await Task.findById(taskId).session(session);
    if (!task) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // 3) Verify business owns this task
    if (task.postedBy.toString() !== businessId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        status: 'error',
        message: 'You can only dispute tasks you posted',
      });
    }

    // 4) Verify task is in review status
    if (task.status !== 'review') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Cannot dispute. Task status is "${task.status}". Task must be in "review".`,
      });
    }

    // 5) Verify payment is held in escrow
    if (task.paymentStatus !== 'held_in_escrow') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'No payment held in escrow to dispute',
      });
    }

    // 6) Update task with dispute
    task.status = 'disputed';
    task.disputeLog = {
      disputedAt: new Date(),
      reason: reason.trim(),
    };
    await task.save({ session });

    // Note: Escrow funds are frozen (remain in escrowBalance)
    // They will be released or refunded by admin

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      message: 'Dispute opened successfully. An admin will review your case.',
      data: {
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          disputeLog: task.disputeLog,
        },
        info: 'Escrow funds are frozen until admin resolution. You will be notified when the dispute is resolved.',
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// ====================
// ADMIN ENDPOINT: Resolve Dispute
// ====================
export const resolveDispute = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { taskId } = req.params;
    const { resolution, resolutionNotes, adminFeePercentage = 0 } = req.body;
    const adminId = req.user._id;

    // 1) Validate resolution
    const validResolutions = ['awarded_to_fresher', 'refunded_to_business', 'partial_split'];
    if (!validResolutions.includes(resolution)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}`,
      });
    }

    // 2) Validate resolution notes
    if (!resolutionNotes || resolutionNotes.trim().length < 20) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Please provide detailed resolution notes (minimum 20 characters)',
      });
    }

    // 3) Fetch task
    const task = await Task.findById(taskId).session(session);
    if (!task) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // 4) Verify task is disputed
    if (task.status !== 'disputed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Task status is "${task.status}". Can only resolve disputed tasks.`,
      });
    }

    // 5) Get wallets
    const businessWallet = await Wallet.getOrCreateWallet(task.postedBy);
    const fresherWallet = await Wallet.getOrCreateWallet(task.assignedTo);

    // 6) Calculate admin fee
    const adminFee = Math.round(task.budget * (adminFeePercentage / 100) * 100) / 100;
    const distributableAmount = task.budget - adminFee;

    // 7) Process resolution
    if (resolution === 'awarded_to_fresher') {
      // Release full amount (minus admin fee) to fresher
      await businessWallet.releaseEscrow(
        distributableAmount,
        task._id,
        fresherWallet,
        `Dispute resolved - Payment awarded: ${task.title}`
      );

      // Update fresher stats
      await User.findByIdAndUpdate(
        task.assignedTo,
        {
          $inc: {
            'fresherProfile.completedTasks': 1,
            'fresherProfile.totalEarnings': distributableAmount,
          },
        },
        { session }
      );

      task.status = 'completed';
      task.paymentStatus = 'released';
      task.completedAt = new Date();
    } else if (resolution === 'refunded_to_business') {
      // Refund full amount (minus admin fee) to business
      await businessWallet.refundEscrow(
        distributableAmount,
        task._id,
        `Dispute resolved - Refund issued: ${task.title}`
      );

      task.status = 'cancelled';
      task.paymentStatus = 'refunded';
    } else if (resolution === 'partial_split') {
      // Split 50/50 (minus admin fee)
      const fresherShare = Math.round(distributableAmount * 0.5 * 100) / 100;
      const businessShare = distributableAmount - fresherShare;

      // Release fresher's share
      await businessWallet.releaseEscrow(
        fresherShare,
        task._id,
        fresherWallet,
        `Dispute resolved - Partial payment: ${task.title}`
      );

      // Refund business's share
      await businessWallet.refundEscrow(
        businessShare,
        task._id,
        `Dispute resolved - Partial refund: ${task.title}`
      );

      // Update fresher stats
      await User.findByIdAndUpdate(
        task.assignedTo,
        {
          $inc: {
            'fresherProfile.totalEarnings': fresherShare,
          },
        },
        { session }
      );

      task.status = 'completed';
      task.paymentStatus = 'released';
      task.completedAt = new Date();
    }

    // 8) Update dispute log
    task.disputeLog.resolvedBy = adminId;
    task.disputeLog.resolvedAt = new Date();
    task.disputeLog.resolution = resolution;
    task.disputeLog.resolutionNotes = resolutionNotes;
    task.disputeLog.adminFee = adminFee;
    await task.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      message: 'Dispute resolved successfully',
      data: {
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          paymentStatus: task.paymentStatus,
          disputeLog: task.disputeLog,
        },
        resolution: {
          type: resolution,
          adminFee,
          distributableAmount,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// ====================
// HELPER: Get Payment Status
// ====================
export const getPaymentStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .select('title status paymentStatus budget proofOfWork disputeLog fundedAt completedAt')
      .populate('postedBy', 'name businessProfile.businessName')
      .populate('assignedTo', 'name email');

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Check if user is authorized to view payment status
    const userId = req.user._id.toString();
    const isBusiness = task.postedBy._id.toString() === userId;
    const isFresher = task.assignedTo && task.assignedTo._id.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isBusiness && !isFresher && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view this payment status',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          paymentStatus: task.paymentStatus,
          budget: task.budget,
          proofOfWork: task.proofOfWork,
          disputeLog: task.disputeLog,
          fundedAt: task.fundedAt,
          completedAt: task.completedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};