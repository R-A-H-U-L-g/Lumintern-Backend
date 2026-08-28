import Task from '../models/Task.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Application from '../models/Application.js';

// ====================
// DASHBOARD STATS
// ====================
export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalFreshers,
      totalBusinesses,
      totalTasks,
      openTasks,
      inProgressTasks,
      completedTasks,
      disputedTasks,
      totalTransactions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'fresher' }),
      User.countDocuments({ role: 'business' }),
      Task.countDocuments(),
      Task.countDocuments({ status: 'open' }),
      Task.countDocuments({ status: 'in_progress' }),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'disputed' }),
      Task.countDocuments({ paymentStatus: 'released' }),
    ]);

    // Calculate total escrow held
    const escrowResult = await Task.aggregate([
      { $match: { paymentStatus: 'held_in_escrow' } },
      { $group: { _id: null, total: { $sum: '$budget' } } },
    ]);
    const totalEscrowHeld = escrowResult.length > 0 ? escrowResult[0].total : 0;

    // Calculate total platform revenue (admin fees from disputes)
    const revenueResult = await Task.aggregate([
      { $match: { 'disputeLog.adminFee': { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$disputeLog.adminFee' } } },
    ]);
    const totalPlatformRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.status(200).json({
      status: 'success',
      data: {
        users: {
          total: totalUsers,
          freshers: totalFreshers,
          businesses: totalBusinesses,
        },
        tasks: {
          total: totalTasks,
          open: openTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          disputed: disputedTasks,
        },
        payments: {
          totalTransactions,
          totalEscrowHeld,
          totalPlatformRevenue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET ALL DISPUTED TASKS
// ====================
export const getDisputedTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tasks = await Task.find({ status: 'disputed' })
      .populate('postedBy', 'name email businessProfile.businessName')
      .populate('assignedTo', 'name email fresherProfile.skills')
      .populate('disputeLog.resolvedBy', 'name')
      .sort({ 'disputeLog.disputedAt': -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Task.countDocuments({ status: 'disputed' });

    res.status(200).json({
      status: 'success',
      results: tasks.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      data: {
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET ALL USERS
// ====================
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET USER DETAILS
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

    const wallet = await Wallet.getOrCreateWallet(userId);

    // Get user's tasks
    let tasks;
    if (user.role === 'fresher') {
      tasks = await Task.find({ assignedTo: userId })
        .populate('postedBy', 'name businessProfile.businessName')
        .sort({ createdAt: -1 })
        .limit(10);
    } else if (user.role === 'business') {
      tasks = await Task.find({ postedBy: userId })
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .limit(10);
    }

    // Get application count for freshers
    let applicationCount = 0;
    if (user.role === 'fresher') {
      applicationCount = await Application.countDocuments({ applicant: userId });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
        wallet: {
          balance: wallet.balance,
          escrowBalance: wallet.escrowBalance,
          totalEarnings: wallet.totalEarnings,
          totalSpent: wallet.totalSpent,
          transactionCount: wallet.transactions.length,
        },
        tasks,
        applicationCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// VERIFY BUSINESS
// ====================
export const verifyBusiness = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (user.role !== 'business') {
      return res.status(400).json({
        status: 'error',
        message: 'Only business accounts can be verified',
      });
    }

    user.businessProfile.isVerified = true;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Business verified successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          businessProfile: user.businessProfile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// DEACTIVATE USER
// ====================
export const deactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'User deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET TRANSACTION LOGS
// ====================
export const getTransactionLogs = async (req, res, next) => {
  try {
    const { userId, type, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (userId) filter.user = userId;

    const wallets = await Wallet.find(filter)
      .populate('user', 'name email role')
      .select('user transactions');

    // Flatten and filter transactions
    let allTransactions = [];
    wallets.forEach((wallet) => {
      wallet.transactions.forEach((txn) => {
        if (!type || txn.type === type) {
          allTransactions.push({
            ...txn.toObject(),
            userId: wallet.user._id,
            userName: wallet.user.name,
            userEmail: wallet.user.email,
            userRole: wallet.user.role,
          });
        }
      });
    });

    // Sort by date descending
    allTransactions.sort((a, b) => b.createdAt - a.createdAt);

    // Paginate
    const total = allTransactions.length;
    const paginatedTransactions = allTransactions.slice(skip, skip + Number(limit));

    res.status(200).json({
      status: 'success',
      results: paginatedTransactions.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      data: {
        transactions: paginatedTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};