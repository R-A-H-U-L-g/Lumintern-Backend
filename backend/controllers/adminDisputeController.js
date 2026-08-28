import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import ChatMessage from '../models/ChatMessage.js';
import ChatRoom from '../models/ChatRoom.js';

// ====================
// GET ALL DISPUTES
// ====================
export const getDisputes = async (req, res, next) => {
  try {
    const { status = 'open', page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const filter = { status: 'disputed' };
    
    // Additional status filter for resolution state
    if (status === 'open') {
      filter['disputeLog.resolvedBy'] = { $exists: false };
    } else if (status === 'resolved') {
      filter['disputeLog.resolvedBy'] = { $exists: true };
    }

    // Fetch disputes with populated data
    const disputes = await Task.find(filter)
      .populate({
        path: 'postedBy',
        select: 'name email role businessProfile',
        model: 'User'
      })
      .populate({
        path: 'assignedTo',
        select: 'name email role fresherProfile',
        model: 'User'
      })
      .populate({
        path: 'disputeLog.resolvedBy',
        select: 'name email',
        model: 'User'
      })
      .sort({ 'disputeLog.disputedAt': -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const total = await Task.countDocuments(filter);

    // Calculate stats
    const stats = await Task.aggregate([
      { $match: { status: 'disputed' } },
      {
        $group: {
          _id: null,
          totalEscrowLocked: { $sum: '$budget' },
          openDisputes: {
            $sum: {
              $cond: [{ $eq: ['$disputeLog.resolvedBy', null] }, 1, 0]
            }
          },
          resolvedDisputes: {
            $sum: {
              $cond: [{ $ne: ['$disputeLog.resolvedBy', null] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Calculate average resolution time
    const avgResolutionTime = await Task.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'cancelled'] },
          'disputeLog.resolvedAt': { $exists: true },
          'disputeLog.disputedAt': { $exists: true }
        }
      },
      {
        $project: {
          resolutionTime: {
            $subtract: ['$disputeLog.resolvedAt', '$disputeLog.disputedAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$resolutionTime' }
        }
      }
    ]);

    const statsData = stats[0] || { totalEscrowLocked: 0, openDisputes: 0, resolvedDisputes: 0 };
    const avgTimeHours = avgResolutionTime[0] 
      ? Math.round(avgResolutionTime[0].avgTime / (1000 * 60 * 60) * 10) / 10
      : 0;

    res.status(200).json({
      status: 'success',
      results: disputes.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      data: {
        disputes,
        stats: {
          totalEscrowLocked: statsData.totalEscrowLocked,
          openDisputes: statsData.openDisputes,
          resolvedDisputes: statsData.resolvedDisputes,
          averageResolutionTimeHours: avgTimeHours
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET SINGLE DISPUTE DETAILS
// ====================
export const getDisputeDetails = async (req, res, next) => {
  try {
    const { disputeId } = req.params;

    const dispute = await Task.findById(disputeId)
      .populate({
        path: 'postedBy',
        select: 'name email role businessProfile',
        model: 'User'
      })
      .populate({
        path: 'assignedTo',
        select: 'name email role fresherProfile',
        model: 'User'
      })
      .populate({
        path: 'disputeLog.resolvedBy',
        select: 'name email',
        model: 'User'
      });

    if (!dispute) {
      return res.status(404).json({
        status: 'error',
        message: 'Dispute not found'
      });
    }

    if (dispute.status !== 'disputed') {
      return res.status(400).json({
        status: 'error',
        message: 'This task is not in disputed status'
      });
    }

    // Get chat room and messages
    const chatRoom = await ChatRoom.findByTask(disputeId);
    let chatMessages = [];
    
    if (chatRoom) {
      chatMessages = await ChatMessage.find({ room: chatRoom._id })
        .populate('sender', 'name role')
        .sort({ createdAt: 1 })
        .limit(100);
    }

    // Get fresher's dispute history
    const fresherDisputeHistory = await Task.countDocuments({
      assignedTo: dispute.assignedTo._id,
      status: 'disputed',
      'disputeLog.resolvedBy': { $exists: true }
    });

    // Get business's dispute history
    const businessDisputeHistory = await Task.countDocuments({
      postedBy: dispute.postedBy._id,
      status: 'disputed',
      'disputeLog.resolvedBy': { $exists: true }
    });

    res.status(200).json({
      status: 'success',
      data: {
        dispute,
        chatMessages,
        fresherDisputeHistory,
        businessDisputeHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// RESOLVE DISPUTE
// ====================
export const resolveDispute = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { disputeId } = req.params;
    const { resolution, notes } = req.body;
    const adminId = req.user._id;

    // 1) Validate resolution
    const validResolutions = ['fresher', 'business'];
    if (!validResolutions.includes(resolution)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}`
      });
    }

    // 2) Validate notes
    if (!notes || notes.trim().length < 50) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Resolution notes must be at least 50 characters'
      });
    }

    // 3) Find the disputed task
    const task = await Task.findById(disputeId).session(session);
    if (!task) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: 'error',
        message: 'Dispute not found'
      });
    }

    // 4) Verify task is in disputed status
    if (task.status !== 'disputed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Task status is "${task.status}". Can only resolve disputed tasks.`
      });
    }

    // 5) Verify dispute hasn't already been resolved
    if (task.disputeLog.resolvedBy) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'This dispute has already been resolved'
      });
    }

    // 6) Get wallets
    const businessWallet = await Wallet.getOrCreateWallet(task.postedBy);
    const fresherWallet = await Wallet.getOrCreateWallet(task.assignedTo);

    // 7) Process resolution based on verdict
    if (resolution === 'fresher') {
      // Release escrow to fresher
      await businessWallet.releaseEscrow(
        task.budget,
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
            'fresherProfile.totalEarnings': task.budget
          }
        },
        { session }
      );

      // Update task status
      task.status = 'completed';
      task.paymentStatus = 'released';
      task.completedAt = new Date();

    } else if (resolution === 'business') {
      // Refund escrow to business
      await businessWallet.refundEscrow(
        task.budget,
        task._id,
        `Dispute resolved - Refund issued: ${task.title}`
      );

      // Update task status
      task.status = 'cancelled';
      task.paymentStatus = 'refunded';
    }

    // 8) Update dispute log
    task.disputeLog.resolvedBy = adminId;
    task.disputeLog.resolvedAt = new Date();
    task.disputeLog.resolution = resolution === 'fresher' ? 'awarded_to_fresher' : 'refunded_to_business';
    task.disputeLog.resolutionNotes = notes.trim();

    await task.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Populate for response
    await task.populate('postedBy', 'name email businessProfile.businessName');
    await task.populate('assignedTo', 'name email');
    await task.populate('disputeLog.resolvedBy', 'name email');

    res.status(200).json({
      status: 'success',
      message: `Dispute resolved successfully. Payment ${resolution === 'fresher' ? 'released to fresher' : 'refunded to business'}.`,
      data: {
        dispute: task,
        resolution: {
          verdict: resolution,
          amount: task.budget,
          recipient: resolution === 'fresher' ? task.assignedTo.name : task.postedBy.name
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// ====================
// GET DISPUTE STATS
// ====================
export const getDisputeStats = async (req, res, next) => {
  try {
    // Total disputes by status
    const statusCounts = await Task.aggregate([
      { $match: { status: 'disputed' } },
      {
        $group: {
          _id: '$disputeLog.resolution',
          count: { $sum: 1 },
          totalAmount: { $sum: '$budget' }
        }
      }
    ]);

    // Monthly dispute trend
    const monthlyTrend = await Task.aggregate([
      {
        $match: {
          status: 'disputed',
          'disputeLog.disputedAt': {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$disputeLog.disputedAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$budget' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top dispute reasons (would need to parse/analyze in production)
    const disputeReasons = await Task.aggregate([
      { $match: { status: 'disputed' } },
      {
        $group: {
          _id: '$workScale',
          count: { $sum: 1 },
          avgBudget: { $avg: '$budget' }
        }
      }
    ]);

    // Resolution distribution
    const resolutionDistribution = await Task.aggregate([
      {
        $match: {
          'disputeLog.resolution': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$disputeLog.resolution',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        statusCounts,
        monthlyTrend,
        disputeReasons,
        resolutionDistribution
      }
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// EXPORT DISPUTE REPORT
// ====================
export const exportDisputeReport = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;

    // Build filter
    const filter = { status: 'disputed' };
    
    if (startDate || endDate) {
      filter['disputeLog.disputedAt'] = {};
      if (startDate) filter['disputeLog.disputedAt'].$gte = new Date(startDate);
      if (endDate) filter['disputeLog.disputedAt'].$lte = new Date(endDate);
    }

    if (status === 'resolved') {
      filter['disputeLog.resolvedBy'] = { $exists: true };
    } else if (status === 'open') {
      filter['disputeLog.resolvedBy'] = { $exists: false };
    }

    const disputes = await Task.find(filter)
      .populate('postedBy', 'name email businessProfile.businessName')
      .populate('assignedTo', 'name email fresherProfile.college')
      .populate('disputeLog.resolvedBy', 'name')
      .sort({ 'disputeLog.disputedAt': -1 });

    // Format for CSV export
    const csvData = disputes.map(d => ({
      'Case ID': d._id,
      'Task Title': d.title,
      'Budget': d.budget,
      'Work Scale': d.workScale,
      'Business': d.postedBy?.name || 'N/A',
      'Business Email': d.postedBy?.email || 'N/A',
      'Fresher': d.assignedTo?.name || 'N/A',
      'Fresher Email': d.assignedTo?.email || 'N/A',
      'Disputed At': d.disputeLog.disputedAt?.toISOString() || 'N/A',
      'Dispute Reason': d.disputeLog.reason || 'N/A',
      'Resolution': d.disputeLog.resolution || 'Pending',
      'Resolved At': d.disputeLog.resolvedAt?.toISOString() || 'N/A',
      'Resolved By': d.disputeLog.resolvedBy?.name || 'N/A',
      'Resolution Notes': d.disputeLog.resolutionNotes || 'N/A'
    }));

    res.status(200).json({
      status: 'success',
      results: csvData.length,
      data: { disputes: csvData }
    });
  } catch (error) {
    next(error);
  }
};