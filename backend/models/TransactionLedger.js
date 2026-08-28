import mongoose from 'mongoose';

const transactionLedgerSchema = new mongoose.Schema(
  {
    // Wallet Reference
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: [true, 'Transaction must reference a wallet'],
    },

    // User Reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must reference a user'],
    },

    // Task Reference (optional)
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },

    // Transaction Type
    type: {
      type: String,
      enum: {
        values: [
          'escrow_hold',
          'escrow_release',
          'escrow_refund',
          'withdrawal',
          'deposit',
          'admin_fee',
          'bonus',
        ],
        message: '{VALUE} is not a valid transaction type',
      },
      required: [true, 'Transaction type is required'],
    },

    // Amount
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },

    // Status
    status: {
      type: String,
      enum: {
        values: ['pending', 'completed', 'failed', 'cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
    },

    // Transaction Hash (unique identifier)
    transactionHash: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Description
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Balance Snapshots
    balanceBefore: {
      type: Number,
    },
    balanceAfter: {
      type: Number,
    },

    // Processing Info
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Failure Info
    failureReason: {
      type: String,
      maxlength: [500, 'Failure reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
transactionLedgerSchema.index({ walletId: 1 });
transactionLedgerSchema.index({ userId: 1 });
transactionLedgerSchema.index({ taskId: 1 });
transactionLedgerSchema.index({ type: 1 });
transactionLedgerSchema.index({ status: 1 });
transactionLedgerSchema.index({ createdAt: -1 });

// Compound indexes
transactionLedgerSchema.index({ userId: 1, type: 1 });
transactionLedgerSchema.index({ userId: 1, status: 1 });
transactionLedgerSchema.index({ userId: 1, createdAt: -1 });

// Pre-save middleware to generate transaction hash
transactionLedgerSchema.pre('save', function (next) {
  if (!this.transactionHash) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.transactionHash = `TXN-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Static method to get user's transaction summary
transactionLedgerSchema.statics.getUserSummary = async function (userId, startDate, endDate) {
  const matchStage = {
    userId: mongoose.Types.ObjectId(userId),
    status: 'completed',
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
};

// Static method to get daily transaction volume
transactionLedgerSchema.statics.getDailyVolume = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        status: 'completed',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Instance method to mark as completed
transactionLedgerSchema.methods.markCompleted = function (processedBy) {
  this.status = 'completed';
  this.processedAt = new Date();
  this.processedBy = processedBy;
  return this.save();
};

// Instance method to mark as failed
transactionLedgerSchema.methods.markFailed = function (reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.processedAt = new Date();
  return this.save();
};

const TransactionLedger = mongoose.model('TransactionLedger', transactionLedgerSchema);

export default TransactionLedger;