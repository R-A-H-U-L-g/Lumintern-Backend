import ChatRoom from '../models/ChatRoom.js';
import ChatMessage from '../models/ChatMessage.js';
import Task from '../models/Task.js';

// ====================
// CREATE CHAT ROOM
// ====================
export const createChatRoom = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Verify user is either the poster or assigned fresher
    const isBusiness = task.postedBy.toString() === userId.toString();
    const isFresher = task.assignedTo && task.assignedTo.toString() === userId.toString();

    if (!isBusiness && !isFresher) {
      return res.status(403).json({
        status: 'error',
        message: 'Only task owner and assigned fresher can create a chat room',
      });
    }

    // Check if room already exists
    const existingRoom = await ChatRoom.findByTask(taskId);
    if (existingRoom) {
      return res.status(200).json({
        status: 'success',
        message: 'Chat room already exists',
        data: { room: existingRoom },
      });
    }

    // Verify task has both poster and assignee
    if (!task.assignedTo) {
      return res.status(400).json({
        status: 'error',
        message: 'Task must have an assigned fresher before creating a chat room',
      });
    }

    // Create new chat room
    const room = await ChatRoom.create({
      task: taskId,
      participants: [task.postedBy, task.assignedTo],
    });

    // Populate participants
    await room.populate('participants', 'name email role');
    await room.populate('task', 'title status');

    res.status(201).json({
      status: 'success',
      data: { room },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET USER'S CHAT ROOMS
// ====================
export const getUserChatRooms = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const rooms = await ChatRoom.findForUser(userId);

    // Get unread counts for each room
    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await ChatMessage.getUnreadCount(room._id, userId);
        return {
          ...room.toObject(),
          unreadCount,
        };
      })
    );

    // Sort by last message time
    roomsWithUnread.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || a.createdAt;
      const bTime = b.lastMessage?.timestamp || b.createdAt;
      return new Date(bTime) - new Date(aTime);
    });

    res.status(200).json({
      status: 'success',
      results: roomsWithUnread.length,
      data: { rooms: roomsWithUnread },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET CHAT ROOM BY TASK
// ====================
export const getChatRoomByTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    const room = await ChatRoom.findByTask(taskId);

    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat room not found for this task',
      });
    }

    // Verify user is a participant
    if (!room.isParticipant(userId)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not a participant in this room',
      });
    }

    // Get unread count
    const unreadCount = await ChatMessage.getUnreadCount(room._id, userId);

    res.status(200).json({
      status: 'success',
      data: {
        room: {
          ...room.toObject(),
          unreadCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET ROOM MESSAGES
// ====================
export const getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Find the room
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat room not found',
      });
    }

    // Verify user is a participant
    if (!room.isParticipant(userId)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not a participant in this room',
      });
    }

    // Get messages with pagination
    const messages = await ChatRoom.getRoomMessages(roomId, Number(page), Number(limit));

    // Get total count
    const total = await ChatMessage.countDocuments({
      room: roomId,
      isDeleted: false,
    });

    // Mark messages as read
    await ChatMessage.markAsRead(roomId, userId);
    await room.resetUnread(userId);

    res.status(200).json({
      status: 'success',
      results: messages.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      data: { messages: messages.reverse() },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// DELETE MESSAGE
// ====================
export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found',
      });
    }

    // Verify user is the sender
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own messages',
      });
    }

    // Soft delete
    await message.softDelete();

    res.status(200).json({
      status: 'success',
      message: 'Message deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET UNREAD COUNT
// ====================
export const getTotalUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const count = await ChatMessage.getTotalUnreadCount(userId);

    res.status(200).json({
      status: 'success',
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// SEARCH MESSAGES
// ====================
export const searchMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { query } = req.query;
    const userId = req.user._id;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query must be at least 2 characters',
      });
    }

    // Find the room
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat room not found',
      });
    }

    // Verify user is a participant
    if (!room.isParticipant(userId)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
    }

    // Search messages
    const messages = await ChatMessage.find({
      room: roomId,
      messageText: { $regex: query, $options: 'i' },
      isDeleted: false,
    })
      .populate('sender', 'name email role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
};