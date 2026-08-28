import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    // Recipient
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must have a recipient'],
    },

    // Content
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    body: {
      type: String,
      required: [true, 'Notification body is required'],
      maxlength: [1000, 'Body cannot exceed 1000 characters'],
    },

    // Type
    type: {
      type: String,
      enum: [
        'new_task',
        'work_submitted',
        'work_approved',
        'work_rejected',
        'payment_received',
        'payment_sent',
        'dispute_opened',
        'dispute_resolved',
        'application_received',
        'application_accepted',
        'application_rejected',
        'message_received',
        'system_alert',
        'general',
      ],
      default: 'general',
    },

    // Additional Data
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Read Status
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },

    // Action URL
    actionUrl: {
      type: String,
    },

    // Priority
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Expiry
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ user: userId, read: false });
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = async function (userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { user: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;