import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    // Room Reference
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: [true, 'Message must belong to a chat room'],
    },

    // Sender Reference
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message must have a sender'],
    },

    // Message Content
    messageText: {
      type: String,
      required: [true, 'Message text is required'],
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
      trim: true,
    },

    // Message Type
    messageType: {
      type: String,
      enum: ['text', 'file', 'image', 'system'],
      default: 'text',
    },

    // File Attachment (for file/image messages)
    attachment: {
      url: String,
      filename: String,
      filesize: Number,
      mimetype: String,
    },

    // Read Status
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
chatMessageSchema.index({ room: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1 });
chatMessageSchema.index({ isRead: 1 });

// Compound index for unread messages
chatMessageSchema.index({ room: 1, isRead: 1, sender: 1 });

// Static method to get messages for a room with pagination
chatMessageSchema.statics.getRoomMessages = function (roomId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  return this.find({ room: roomId, isDeleted: false })
    .populate('sender', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to mark messages as read
chatMessageSchema.statics.markAsRead = async function (roomId, userId) {
  const result = await this.updateMany(
    {
      room: roomId,
      sender: { $ne: userId },
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
  return result.modifiedCount;
};

// Static method to get unread count for a user
chatMessageSchema.statics.getUnreadCount = async function (roomId, userId) {
  return this.countDocuments({
    room: roomId,
    sender: { $ne: userId },
    isRead: false,
    isDeleted: false,
  });
};

// Static method to get total unread count across all rooms
chatMessageSchema.statics.getTotalUnreadCount = async function (userId) {
  // First get all rooms the user is in
  const ChatRoom = mongoose.model('ChatRoom');
  const rooms = await ChatRoom.find({ participants: userId }).select('_id');
  const roomIds = rooms.map((r) => r._id);

  return this.countDocuments({
    room: { $in: roomIds },
    sender: { $ne: userId },
    isRead: false,
    isDeleted: false,
  });
};

// Instance method to soft delete
chatMessageSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.messageText = 'This message has been deleted';
  return this.save();
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;