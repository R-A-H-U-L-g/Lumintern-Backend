import express from 'express';
import {
  createChatRoom,
  getUserChatRooms,
  getChatRoomByTask,
  getRoomMessages,
  deleteMessage,
  getTotalUnreadCount,
  searchMessages,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All chat routes require authentication
router.use(protect);

// Chat room routes
router.post('/room/:taskId', createChatRoom);
router.get('/rooms', getUserChatRooms);
router.get('/room/task/:taskId', getChatRoomByTask);

// Message routes
router.get('/room/:roomId/messages', getRoomMessages);
router.get('/room/:roomId/search', searchMessages);
router.delete('/message/:messageId', deleteMessage);

// Unread count
router.get('/unread', getTotalUnreadCount);

export default router;