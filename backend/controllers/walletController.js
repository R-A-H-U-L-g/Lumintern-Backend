import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import TransactionLedger from '../models/TransactionLedger.js';

// ====================
// GET WALLET BALANCE
// ====================
export const getWalletBalance = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get or create wallet
    const wallet = await Wallet.getOrCreateWallet(userId);

    // Calculate pending escrow (funds held for in-progress tasks)
    const pendingEscrow = wallet.escrowBalance;

    res.status(200).json({
      status: 'success',
      data: {
        wallet: {
          _id: wallet._id,
          balance: wallet.balance,
          pendingEscrow,
          totalEarnings: wallet.totalEarnings,
          totalSpent: wallet.totalSpent,
          lastUpdated: wallet.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET TRANSACTION LEDGER
// ====================
export const getTransactionLedger = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { type, status, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = { userId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get transactions
    const transactions = await TransactionLedger.find(filter)
      .populate('taskId', 'title workScale')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const total = await TransactionLedger.countDocuments(filter);

    // Calculate summary
    const summary = await TransactionLedger.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summaryMap = summary.reduce((acc, item) => {
      acc[item._id] = { total: item.total, count: item.count };
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      results: transactions.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      data: {
        transactions,
        summary: {
          escrowHold: summaryMap.escrow_hold || { total: 0, count: 0 },
          escrowRelease: summaryMap.escrow_release || { total: 0, count: 0 },
          withdrawal: summaryMap.withdrawal || { total: 0, count: 0 },
          refund: summaryMap.refund || { total: 0, count: 0 },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// ADD FUNDS TO WALLET
// ====================
export const addFunds = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { amount, paymentMethod, transactionReference } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid amount',
      });
    }

    if (amount < 10) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Minimum deposit amount is $10',
      });
    }

    if (amount > 10000) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Maximum deposit amount is $10,000 per transaction',
      });
    }

    // Get or create wallet
    const wallet = await Wallet.getOrCreateWallet(userId);

    // Add funds using atomic operation
    await Wallet.findByIdAndUpdate(
      wallet._id,
      {
        $inc: { balance: amount },
        $push: {
          transactions: {
            type: 'credit',
            amount,
            description: `Funds added via ${paymentMethod || 'wallet'}`,
            status: 'completed',
            metadata: {
              paymentMethod,
              transactionReference,
            },
          },
        },
      },
      { session }
    );

    // Create ledger entry
    await TransactionLedger.create(
      [
        {
          walletId: wallet._id,
          userId,
          type: 'deposit',
          amount,
          status: 'completed',
          metadata: {
            paymentMethod,
            transactionReference,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Get updated wallet
    const updatedWallet = await Wallet.findById(wallet._id);

    res.status(200).json({
      status: 'success',
      message: `$${amount} added to wallet successfully`,
      data: {
        wallet: {
          balance: updatedWallet.balance,
          pendingEscrow: updatedWallet.escrowBalance,
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
// REQUEST WITHDRAWAL
// ====================
export const requestWithdrawal = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { amount, withdrawalMethod, accountDetails } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid amount',
      });
    }

    // Get wallet
    const wallet = await Wallet.getOrCreateWallet(userId);

    // Check sufficient balance
    if (wallet.balance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: `Insufficient balance. Available: $${wallet.balance}`,
      });
    }

    // Minimum withdrawal check
    if (amount < 50) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: 'error',
        message: 'Minimum withdrawal amount is $50',
      });
    }

    // Deduct from balance using atomic operation
    await Wallet.findByIdAndUpdate(
      wallet._id,
      {
        $inc: { balance: -amount },
        $push: {
          transactions: {
            type: 'debit',
            amount,
            description: `Withdrawal via ${withdrawalMethod}`,
            status: 'pending',
            metadata: {
              withdrawalMethod,
              accountDetails,
            },
          },
        },
      },
      { session }
    );

    // Create ledger entry
    await TransactionLedger.create(
      [
        {
          walletId: wallet._id,
          userId,
          type: 'withdrawal',
          amount,
          status: 'pending',
          metadata: {
            withdrawalMethod,
            accountDetails,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Get updated wallet
    const updatedWallet = await Wallet.findById(wallet._id);

    res.status(200).json({
      status: 'success',
      message: `Withdrawal of $${amount} requested successfully`,
      data: {
        wallet: {
          balance: updatedWallet.balance,
          pendingEscrow: updatedWallet.escrowBalance,
        },
        withdrawal: {
          amount,
          method: withdrawalMethod,
          status: 'pending',
          estimatedProcessing: '3-5 business days',
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
// GET WALLET STATISTICS
// ====================
export const getWalletStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get wallet
    const wallet = await Wallet.getOrCreateWallet(userId);

    // Get transaction stats for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyStats = await TransactionLedger.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthlyMap = monthlyStats.reduce((acc, item) => {
      acc[item._id] = { total: item.total, count: item.count };
      return acc;
    }, {});

    // Get recent transactions
    const recentTransactions = await TransactionLedger.find({ userId })
      .populate('taskId', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      status: 'success',
      data: {
        wallet: {
          balance: wallet.balance,
          pendingEscrow: wallet.escrowBalance,
          totalEarnings: wallet.totalEarnings,
          totalSpent: wallet.totalSpent,
        },
        monthlyStats: {
          earnings: monthlyMap.escrow_release || { total: 0, count: 0 },
          withdrawals: monthlyMap.withdrawal || { total: 0, count: 0 },
          deposits: monthlyMap.deposit || { total: 0, count: 0 },
        },
        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET TRANSACTION DETAILS
// ====================
export const getTransactionDetails = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user._id;

    const transaction = await TransactionLedger.findOne({
      _id: transactionId,
      userId,
    }).populate('taskId', 'title workScale budget');

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};