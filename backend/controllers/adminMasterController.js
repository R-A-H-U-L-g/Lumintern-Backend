import mongoose from 'mongoose';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Wallet from '../models/Wallet.js';
import GlobalSetting from '../models/GlobalSetting.js';
import AuditLog from '../models/AuditLog.js';
import ChatMessage from '../models/ChatMessage.js';

// ====================
// TAB A: ANALYTICS OVERVIEW
// ====================
export const getAnalyticsOverview = async (req, res, next) => {
  try {
    // User counts
    const [
      totalFreshers,
      totalBusinesses,
      activeFreshers,
      activeBusinesses,
      suspendedUsers,
    ] = await Promise.all([
      User.countDocuments({ role: 'fresher' }),
      User.countDocuments({ role: 'business' }),
      User.countDocuments({ role: 'fresher', isActive: true }),
      User.countDocuments({ role: 'business', isActive: true }),
      User.countDocuments({ isActive: false }),
    ]);

    // Task counts
    const [
      totalTasks,
      openTasks,
      inProgressTasks,
      completedTasks,
      disputedTasks,
      smallTasks,
      largeTasks,
    ] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: 'open' }),
      Task.countDocuments({ status: 'in_progress' }),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'disputed' }),
      Task.countDocuments({ workScale: 'small' }),
      Task.countDocuments({ workScale: 'large' }),
    ]);

    // Financial aggregations
    const escrowResult = await Task.aggregate([
      { $match: { paymentStatus: 'held_in_escrow' } },
      { $group: { _id: null, total: { $sum: '$budget' } } },
    ]);

    const totalVolumeResult = await Task.aggregate([
      { $match: { paymentStatus: 'released' } },
      { $group: { _id: null, total: { $sum: '$budget' } } },
    ]);

    const totalEscrowLocked = escrowResult.length > 0 ? escrowResult[0].total : 0;
    const totalVolumeProcessed = totalVolumeResult.length > 0 ? totalVolumeResult[0].total : 0;

    // Platform revenue (admin fees)
    const revenueResult = await Task.aggregate([
      { $match: { 'disputeLog.adminFee': { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$disputeLog.adminFee' } } },
    ]);
    const platformRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Recent activity (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      newUsersToday,
      newTasksToday,
      completedToday,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      Task.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      Task.countDocuments({ completedAt: { $gte: twentyFourHoursAgo } }),
    ]);

    // Average task completion time
    const avgCompletionTime = await Task.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $exists: true },
          fundedAt: { $exists: true },
        },
      },
      {
        $project: {
          completionTime: { $subtract: ['$completedAt', '$fundedAt'] },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$completionTime' },
        },
      },
    ]);

    const avgCompletionHours = avgCompletionTime[0]
      ? Math.round(avgCompletionTime[0].avgTime / (1000 * 60 * 60) * 10) / 10
      : 0;

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Task.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          tasks: { $sum: 1 },
          revenue: { $sum: '$budget' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        users: {
          totalFreshers,
          totalBusinesses,
          activeFreshers,
          activeBusinesses,
          suspendedUsers,
          total: totalFreshers + totalBusinesses,
        },
        tasks: {
          total: totalTasks,
          open: openTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          disputed: disputedTasks,
          smallTasks,
          largeTasks,
        },
        financials: {
          totalEscrowLocked,
          totalVolumeProcessed,
          platformRevenue,
        },
        today: {
          newUsers: newUsersToday,
          newTasks: newTasksToday,
          completed: completedToday,
        },
        metrics: {
          avgCompletionHours,
          successRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          disputeRate: totalTasks > 0 ? Math.round((disputedTasks / totalTasks) * 100) : 0,
        },
        monthlyTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TAB A: LIVE ACTIVITY STREAM
// ====================
export const getLiveActivity = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    // Get recent audit logs
    const auditLogs = await AuditLog.getRecentActivity(Number(limit));

    // Get recent tasks
    const recentTasks = await Task.find()
      .populate('postedBy', 'name businessProfile.businessName')
      .populate('assignedTo', 'name')
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title status workScale budget postedBy assignedTo updatedAt');

    // Get recent user registrations
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email role createdAt');

    // Combine and format activity feed
    const activities = [];

    // Add audit log entries
    auditLogs.forEach((log) => {
      activities.push({
        type: 'admin_action',
        timestamp: log.createdAt,
        message: formatAuditLogMessage(log),
        icon: getAuditLogIcon(log.actionType),
        color: getAuditLogColor(log.actionType),
        admin: log.adminId?.name || 'System',
        target: log.targetUserId?.name || null,
      });
    });

    // Add task activities
    recentTasks.forEach((task) => {
      const businessName = task.postedBy?.businessProfile?.businessName || task.postedBy?.name || 'Unknown';
      activities.push({
        type: 'task_update',
        timestamp: task.updatedAt,
        message: formatTaskActivityMessage(task, businessName),
        icon: getTaskStatusIcon(task.status),
        color: getTaskStatusColor(task.status),
        taskTitle: task.title,
      });
    });

    // Add user registrations
    recentUsers.forEach((user) => {
      activities.push({
        type: 'new_user',
        timestamp: user.createdAt,
        message: `${user.name} registered as a ${user.role}`,
        icon: '👤',
        color: user.role === 'fresher' ? 'cyan' : 'purple',
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      status: 'success',
      results: activities.length,
      data: { activities: activities.slice(0, Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TAB B: USER DIRECTORY
// ====================
export const getUsers = async (req, res, next) => {
  try {
    const {
      role,
      search,
      status,
      verified,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'suspended') filter.isActive = false;
    if (verified === 'true') filter['businessProfile.isVerified'] = true;
    if (verified === 'false') filter['businessProfile.isVerified'] = false;

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'fresherProfile.college': { $regex: search, $options: 'i' } },
        { 'businessProfile.businessName': { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query
    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const total = await User.countDocuments(filter);

    // Get wallet data for each user
    const usersWithWallets = await Promise.all(
      users.map(async (user) => {
        const wallet = await Wallet.findOne({ user: user._id });
        return {
          ...user.toObject(),
          wallet: wallet
            ? {
                balance: wallet.balance,
                escrowBalance: wallet.escrowBalance,
                totalEarnings: wallet.totalEarnings,
                totalSpent: wallet.totalSpent,
              }
            : null,
        };
      })
    );

    res.status(200).json({
      status: 'success',
      results: usersWithWallets.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      data: { users: usersWithWallets },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TAB B: GET USER DETAILS
// ====================
export const getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Get wallet
    const wallet = await Wallet.findOne({ user: userId });

    // Get tasks
    let tasks;
    if (user.role === 'fresher') {
      tasks = await Task.find({ assignedTo: userId })
        .populate('postedBy', 'name businessProfile.businessName')
        .sort({ createdAt: -1 })
        .limit(20);
    } else {
      tasks = await Task.find({ postedBy: userId })
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .limit(20);
    }

    // Get audit history
    const auditHistory = await AuditLog.getUserActivity(userId, 20);

    // Get chat activity
    const chatCount = await ChatMessage.countDocuments({ sender: userId });

    res.status(200).json({
      status: 'success',
      data: {
        user,
        wallet: wallet || { balance: 0, escrowBalance: 0, totalEarnings: 0, totalSpent: 0 },
        tasks,
        auditHistory,
        chatCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TAB B: UPDATE USER STATUS
// ====================
export const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, verified, skills, reason } = req.body;
    const adminId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Store previous state for audit
    const previousState = {
      isActive: user.isActive,
      isVerified: user.businessProfile?.isVerified || false,
      skills: user.fresherProfile?.skills || [],
    };

    // Apply updates
    const updates = {};

    // Handle status update
    if (status) {
      if (status === 'suspended') {
        updates.isActive = false;
      } else if (status === 'active') {
        updates.isActive = true;
      } else if (status === 'terminated') {
        updates.isActive = false;
        // Additional termination logic could go here
      }
    }

    // Handle verification update
    if (verified !== undefined && user.role === 'business') {
      updates['businessProfile.isVerified'] = verified;
    }

    // Handle skills update
    if (skills && user.role === 'fresher') {
      updates['fresherProfile.skills'] = skills;
    }

    // Apply updates
    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    // Create audit log
    await AuditLog.log({
      adminId,
      actionType: status === 'suspended' ? 'user_suspend' : 
                  status === 'active' ? 'user_activate' :
                  status === 'terminated' ? 'user_terminate' :
                  verified !== undefined ? (verified ? 'business_verify' : 'business_unverify') :
                  skills ? 'manual_skill_edit' : 'profile_override',
      targetUserId: userId,
      targetResourceType: 'user',
      targetResourceId: userId,
      previousState,
      newState: updates,
      reason: reason || null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      status: 'success',
      message: `User ${status || 'profile'} updated successfully`,
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TAB C: GET SETTINGS
// ====================
export const getSettings = async (req, res, next) => {
  try {
    const settings = await GlobalSetting.getSettings();

    res.status(200).json({
      status: 'success',
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// TAB C: UPDATE SETTINGS
// ====================
export const updateSettings = async (req, res, next) => {
  try {
    const adminId = req.user._id;
    const updates = req.body;

    // Get current settings for audit
    const currentSettings = await GlobalSetting.getSettings();
    const previousState = currentSettings.toObject();

    // Update settings
    const updatedSettings = await GlobalSetting.updateSettings(updates, adminId);

    // Create audit log
    await AuditLog.log({
      adminId,
      actionType: 'setting_update',
      targetResourceType: 'setting',
      targetResourceId: updatedSettings._id,
      previousState,
      newState: updates,
      reason: req.body.reason || 'Settings updated',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      status: 'success',
      message: 'Settings updated successfully',
      data: { settings: updatedSettings },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// AUDIT LOG ENDPOINTS
// ====================
export const getAuditLogs = async (req, res, next) => {
  try {
    const { adminId, targetUserId, actionType, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (adminId) filter.adminId = adminId;
    if (targetUserId) filter.targetUserId = targetUserId;
    if (actionType) filter.actionType = actionType;

    const logs = await AuditLog.find(filter)
      .populate('adminId', 'name email')
      .populate('targetUserId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: logs.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// HELPER FUNCTIONS
// ====================

function formatAuditLogMessage(log) {
  const adminName = log.adminId?.name || 'Admin';
  const targetName = log.targetUserId?.name || 'user';

  switch (log.actionType) {
    case 'user_suspend':
      return `${adminName} suspended ${targetName}'s account`;
    case 'user_activate':
      return `${adminName} reactivated ${targetName}'s account`;
    case 'user_terminate':
      return `${adminName} terminated ${targetName}'s account`;
    case 'business_verify':
      return `${adminName} verified ${targetName}'s business`;
    case 'business_unverify':
      return `${adminName} removed verification from ${targetName}'s business`;
    case 'setting_update':
      return `${adminName} updated platform settings`;
    case 'dispute_resolve':
      return `${adminName} resolved a dispute`;
    case 'dispute_award_fresher':
      return `${adminName} awarded dispute payment to fresher`;
    case 'dispute_refund_business':
      return `${adminName} refunded dispute payment to business`;
    case 'manual_skill_edit':
      return `${adminName} manually edited ${targetName}'s skills`;
    default:
      return `${adminName} performed an action on ${targetName}`;
  }
}

function getAuditLogIcon(actionType) {
  const icons = {
    user_suspend: '🚫',
    user_activate: '✅',
    user_terminate: '❌',
    business_verify: '✓',
    business_unverify: '✗',
    setting_update: '⚙️',
    dispute_resolve: '⚖️',
    dispute_award_fresher: '💰',
    dispute_refund_business: '💸',
    manual_skill_edit: '✏️',
    profile_override: '👤',
    maintenance_toggle: '🔧',
    registration_toggle: '📝',
  };
  return icons[actionType] || '📋';
}

function getAuditLogColor(actionType) {
  const colors = {
    user_suspend: 'amber',
    user_activate: 'green',
    user_terminate: 'red',
    business_verify: 'green',
    business_unverify: 'amber',
    setting_update: 'cyan',
    dispute_resolve: 'purple',
    dispute_award_fresher: 'green',
    dispute_refund_business: 'amber',
    manual_skill_edit: 'cyan',
    profile_override: 'cyan',
  };
  return colors[actionType] || 'gray';
}

function formatTaskActivityMessage(task, businessName) {
  switch (task.status) {
    case 'open':
      return `${businessName} posted a ${task.workScale} gig: "${task.title}"`;
    case 'in_progress':
      return `Work started on "${task.title}"`;
    case 'review':
      return `Proof submitted for "${task.title}"`;
    case 'completed':
      return `"${task.title}" completed successfully`;
    case 'disputed':
      return `Dispute opened for "${task.title}"`;
    case 'cancelled':
      return `"${task.title}" was cancelled`;
    default:
      return `Task "${task.title}" updated`;
  }
}

function getTaskStatusIcon(status) {
  const icons = {
    open: '📋',
    in_progress: '🔨',
    review: '👀',
    completed: '✅',
    disputed: '⚠️',
    cancelled: '❌',
  };
  return icons[status] || '📋';
}

function getTaskStatusColor(status) {
  const colors = {
    open: 'cyan',
    in_progress: 'blue',
    review: 'amber',
    completed: 'green',
    disputed: 'red',
    cancelled: 'gray',
  };
  return colors[status] || 'gray';
}