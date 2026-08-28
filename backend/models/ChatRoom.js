import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema(
  {
    // Task Reference
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Chat room must be associated with a task'],
      unique: true,
    },

    // Participants (exactly 2: fresher and business)
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],

    // Room Metadata
    isActive: {
      type: Boolean,
      default: true,
    },

    // Last Message Info (for quick sorting/display)
    lastMessage: {
      text: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      timestamp: Date,
    },

    // Unread counts for each participant
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
chatRoomSchema.index({ task: 1 });
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ 'lastMessage.timestamp': -1 });

// Virtual for messages
chatRoomSchema.virtual('messages', {
  ref: 'ChatMessage',
  localField: '_id',
  foreignField: 'room',
});

// Static method to find room by task
chatRoomSchema.statics.findByTask = function (taskId) {
  return this.findOne({ task: taskId }).populate('participants', 'name email role');
};

// Static method to find rooms for a user
chatRoomSchema.statics.findForUser = function (userId) {
  return this.find({ participants: userId })
    .populate('task', 'title status')
    .populate('participants', 'name email role')
    .sort({ 'lastMessage.timestamp': -1 });
};

// Method to check if user is participant
chatRoomSchema.methods.isParticipant = function (userId) {
  return this.participants.some(
    (p) => p._id.toString() === userId.toString()
  );
};

// Method to get other participant
chatRoomSchema.methods.getOtherParticipant = function (userId) {
  return this.participants.find(
    (p) => p._id.toString() !== userId.toString()
  );
};

// Method to update last message
chatRoomSchema.methods.updateLastMessage = function (text, senderId) {
  this.lastMessage = {
    text,
    sender: senderId,
    timestamp: new Date(),
  };
  return this.save();
};

// Method to increment unread count
chatRoomSchema.methods.incrementUnread = function (userId) {
  const currentCount = this.unreadCounts.get(userId.toString()) || 0;
  this.unreadCounts.set(userId.toString(), currentCount + 1);
  return this.save();
};

// Method to reset unread count
chatRoomSchema.methods.resetUnread = function (userId) {
  this.unreadCounts.set(userId.toString(), 0);
  return this.save();
};

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

export default ChatRoom;