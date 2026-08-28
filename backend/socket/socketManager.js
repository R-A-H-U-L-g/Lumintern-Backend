import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ChatRoom from '../models/ChatRoom.js';
import ChatMessage from '../models/ChatMessage.js';

// Store connected users: { userId: socketId }
const connectedUsers = new Map();

// Socket.io instance
let io;

// ====================
// INITIALIZE SOCKET.IO
// ====================
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user exists
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      // Attach user to socket
      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userName = user.name;

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection Handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userName} (${socket.userId})`);

    // Store user connection
    connectedUsers.set(socket.userId, socket.id);

    // Broadcast user online status
    io.emit('user_status', {
      userId: socket.userId,
      status: 'online',
    });

    // ====================
    // JOIN ROOM EVENT
    // ====================
    socket.on('join_room', async (data) => {
      try {
        const { roomId } = data;

        // Find the chat room
        const room = await ChatRoom.findById(roomId);

        if (!room) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        // Security Check: Verify user is a participant
        if (!room.isParticipant(socket.userId)) {
          socket.emit('error', { message: 'Access denied: You are not a participant in this room' });
          return;
        }

        // Join the room
        socket.join(roomId);

        // Reset unread count for this user
        await room.resetUnread(socket.userId);

        // Mark messages as read
        await ChatMessage.markAsRead(roomId, socket.userId);

        // Notify room that user joined
        socket.to(roomId).emit('user_joined_room', {
          userId: socket.userId,
          userName: socket.userName,
          roomId,
        });

        // Confirm join to user
        socket.emit('room_joined', {
          roomId,
          message: `Successfully joined room`,
        });

        console.log(`📢 ${socket.userName} joined room: ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ====================
    // LEAVE ROOM EVENT
    // ====================
    socket.on('leave_room', (data) => {
      const { roomId } = data;
      socket.leave(roomId);

      socket.to(roomId).emit('user_left_room', {
        userId: socket.userId,
        userName: socket.userName,
        roomId,
      });

      console.log(`📢 ${socket.userName} left room: ${roomId}`);
    });

    // ====================
    // SEND MESSAGE EVENT
    // ====================
    socket.on('send_message', async (data) => {
      try {
        const { roomId, messageText, messageType = 'text', attachment } = data;

        // Validate message
        if (!messageText || messageText.trim().length === 0) {
          socket.emit('error', { message: 'Message text is required' });
          return;
        }

        // Find the chat room
        const room = await ChatRoom.findById(roomId);

        if (!room) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        // Security Check: Verify user is a participant
        if (!room.isParticipant(socket.userId)) {
          socket.emit('error', { message: 'Access denied: You are not a participant in this room' });
          return;
        }

        // Create and save message to MongoDB
        const message = await ChatMessage.create({
          room: roomId,
          sender: socket.userId,
          messageText: messageText.trim(),
          messageType,
          attachment,
        });

        // Populate sender info
        await message.populate('sender', 'name email role');

        // Update room's last message
        await room.updateLastMessage(messageText.trim(), socket.userId);

        // Increment unread count for other participant
        const otherParticipant = room.getOtherParticipant(socket.userId);
        if (otherParticipant) {
          await room.incrementUnread(otherParticipant._id);

          // Send notification to other user if online
          const otherSocketId = connectedUsers.get(otherParticipant._id.toString());
          if (otherSocketId) {
            io.to(otherSocketId).emit('new_message_notification', {
              roomId,
              message: {
                _id: message._id,
                text: messageText.trim(),
                sender: {
                  _id: socket.userId,
                  name: socket.userName,
                },
                timestamp: message.createdAt,
              },
            });
          }
        }

        // Broadcast message to room
        io.to(roomId).emit('receive_message', {
          _id: message._id,
          room: roomId,
          sender: {
            _id: socket.userId,
            name: socket.userName,
            role: socket.userRole,
          },
          messageText: message.messageText,
          messageType: message.messageType,
          attachment: message.attachment,
          isRead: message.isRead,
          createdAt: message.createdAt,
        });

        console.log(`💬 Message sent in room ${roomId} by ${socket.userName}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ====================
    // TYPING INDICATOR EVENTS
    // ====================
    socket.on('typing_start', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        userName: socket.userName,
        roomId,
      });
    });

    socket.on('typing_stop', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_stopped_typing', {
        userId: socket.userId,
        roomId,
      });
    });

    // ====================
    // MARK MESSAGES AS READ
    // ====================
    socket.on('mark_read', async (data) => {
      try {
        const { roomId } = data;

        const room = await ChatRoom.findById(roomId);
        if (!room || !room.isParticipant(socket.userId)) {
          return;
        }

        await ChatMessage.markAsRead(roomId, socket.userId);
        await room.resetUnread(socket.userId);

        // Notify other participant that messages were read
        socket.to(roomId).emit('messages_read', {
          roomId,
          readBy: socket.userId,
        });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // ====================
    // DISCONNECT HANDLER
    // ====================
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userName} (${socket.userId})`);

      // Remove from connected users
      connectedUsers.delete(socket.userId);

      // Broadcast user offline status
      io.emit('user_status', {
        userId: socket.userId,
        status: 'offline',
      });
    });
  });

  console.log('✅ Socket.io initialized');

  return io;
};

// ====================
// HELPER FUNCTIONS
// ====================

// Get Socket.io instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Get connected users map
export const getConnectedUsers = () => connectedUsers;

// Check if user is online
export const isUserOnline = (userId) => connectedUsers.has(userId.toString());

// Send direct message to user
export const sendToUser = (userId, event, data) => {
  const socketId = connectedUsers.get(userId.toString());
  if (socketId && io) {
    io.to(socketId).emit(event, data);
  }
};

// Send to room
export const sendToRoom = (roomId, event, data) => {
  if (io) {
    io.to(roomId).emit(event, data);
  }
};

export default {
  initializeSocket,
  getIO,
  getConnectedUsers,
  isUserOnline,
  sendToUser,
  sendToRoom,
};