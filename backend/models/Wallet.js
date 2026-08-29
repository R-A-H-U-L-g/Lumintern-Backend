import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['credit', 'debit', 'escrow_hold', 'escrow_release', 'escrow_refund'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    escrowBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    transactions: [transactionSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
// Note: user index is already created by unique: true in schema
walletSchema.index({ 'transactions.relatedTask': 1 });
walletSchema.index({ 'transactions.createdAt': -1 });

// Method to add funds to wallet
walletSchema.methods.addFunds = function (amount, description, metadata = {}) {
  this.balance += amount;
  this.transactions.push({
    type: 'credit',
    amount,
    description,
    status: 'completed',
    metadata,
  });
  return this.save();
};

// Method to hold funds in escrow
walletSchema.methods.holdInEscrow = function (amount, taskId, description) {
  if (this.balance < amount) {
    throw new Error('Insufficient balance');
  }
  this.balance -= amount;
  this.escrowBalance += amount;
  this.totalSpent += amount;
  this.transactions.push({
    type: 'escrow_hold',
    amount,
    description,
    relatedTask: taskId,
    status: 'completed',
  });
  return this.save();
};

// Method to release escrow to fresher
walletSchema.methods.releaseEscrow = function (amount, taskId, fresherWallet, description) {
  if (this.escrowBalance < amount) {
    throw new Error('Insufficient escrow balance');
  }
  this.escrowBalance -= amount;
  this.transactions.push({
    type: 'escrow_release',
    amount,
    description: `Released to fresher: ${description}`,
    relatedTask: taskId,
    status: 'completed',
  });

  // Credit fresher's wallet
  fresherWallet.balance += amount;
  fresherWallet.totalEarnings += amount;
  fresherWallet.transactions.push({
    type: 'escrow_release',
    amount,
    description: `Payment received: ${description}`,
    relatedTask: taskId,
    status: 'completed',
  });

  return Promise.all([this.save(), fresherWallet.save()]);
};

// Method to refund escrow to business
walletSchema.methods.refundEscrow = function (amount, taskId, description) {
  if (this.escrowBalance < amount) {
    throw new Error('Insufficient escrow balance');
  }
  this.escrowBalance -= amount;
  this.balance += amount;
  this.totalSpent -= amount;
  this.transactions.push({
    type: 'escrow_refund',
    amount,
    description,
    relatedTask: taskId,
    status: 'completed',
  });
  return this.save();
};

// Static method to get or create wallet
walletSchema.statics.getOrCreateWallet = async function (userId) {
  let wallet = await this.findOne({ user: userId });
  if (!wallet) {
    wallet = await this.create({ user: userId });
  }
  return wallet;
};

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet;