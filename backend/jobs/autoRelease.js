import cron from 'node-cron';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';

// ====================
// AUTO-RELEASE CRON JOB
// Runs every hour to check for tasks eligible for auto-release
// ====================

const AUTO_RELEASE_HOURS = 72;

export const startAutoReleaseJob = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running auto-release check...');
    
    try {
      await processAutoReleases();
    } catch (error) {
      console.error('❌ Auto-release job error:', error);
    }
  });

  console.log('✅ Auto-release cron job scheduled (runs every hour)');
};

const processAutoReleases = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find tasks in 'review' status with submitted proof older than 72 hours
    const cutoffTime = new Date(Date.now() - AUTO_RELEASE_HOURS * 60 * 60 * 1000);
    
    const eligibleTasks = await Task.find({
      status: 'review',
      paymentStatus: 'held_in_escrow',
      'proofOfWork.submittedAt': { $lte: cutoffTime },
      autoReleasedAt: { $exists: false },
    }).session(session);

    if (eligibleTasks.length === 0) {
      await session.commitTransaction();
      session.endSession();
      console.log('✅ No tasks eligible for auto-release');
      return;
    }

    console.log(`📋 Found ${eligibleTasks.length} tasks eligible for auto-release`);

    let successCount = 0;
    let errorCount = 0;

    for (const task of eligibleTasks) {
      try {
        // Get wallets
        const businessWallet = await Wallet.getOrCreateWallet(task.postedBy);
        const fresherWallet = await Wallet.getOrCreateWallet(task.assignedTo);

        // Release escrow to fresher
        await businessWallet.releaseEscrow(
          task.budget,
          task._id,
          fresherWallet,
          `Auto-release (72h timeout): ${task.title}`
        );

        // Update task
        task.status = 'completed';
        task.paymentStatus = 'released';
        task.completedAt = new Date();
        task.autoReleasedAt = new Date();
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
          task.postedBy,
          {
            $inc: {
              'businessProfile.totalSpent': task.budget,
            },
          },
          { session }
        );

        successCount++;
        console.log(`✅ Auto-released task: ${task._id} - ${task.title}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to auto-release task ${task._id}:`, error.message);
      }
    }

    await session.commitTransaction();
    session.endSession();

    console.log(`✅ Auto-release complete: ${successCount} released, ${errorCount} errors`);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ====================
// MANUAL TRIGGER (for testing or immediate execution)
// ====================
export const triggerAutoRelease = async (req, res, next) => {
  try {
    await processAutoReleases();
    res.status(200).json({
      status: 'success',
      message: 'Auto-release process triggered successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET ELIGIBLE TASKS (for monitoring)
// ====================
export const getEligibleAutoReleaseTasks = async (req, res, next) => {
  try {
    const cutoffTime = new Date(Date.now() - AUTO_RELEASE_HOURS * 60 * 60 * 1000);
    
    const tasks = await Task.find({
      status: 'review',
      paymentStatus: 'held_in_escrow',
      'proofOfWork.submittedAt': { $lte: cutoffTime },
      autoReleasedAt: { $exists: false },
    })
      .populate('postedBy', 'name businessProfile.businessName')
      .populate('assignedTo', 'name email')
      .select('title budget proofOfWork.submittedAt createdAt');

    // Calculate time remaining for each task
    const tasksWithTimeInfo = tasks.map((task) => {
      const hoursInReview =
        (Date.now() - task.proofOfWork.submittedAt.getTime()) / (1000 * 60 * 60);
      const hoursRemaining = Math.max(0, AUTO_RELEASE_HOURS - hoursInReview);

      return {
        ...task.toObject(),
        hoursInReview: Math.round(hoursInReview * 10) / 10,
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        willAutoReleaseAt: new Date(
          task.proofOfWork.submittedAt.getTime() + AUTO_RELEASE_HOURS * 60 * 60 * 1000
        ),
      };
    });

    res.status(200).json({
      status: 'success',
      results: tasksWithTimeInfo.length,
      data: {
        tasks: tasksWithTimeInfo,
      },
    });
  } catch (error) {
    next(error);
  }
};