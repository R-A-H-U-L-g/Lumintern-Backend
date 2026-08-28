import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All notification routes require authentication
router.use(protect);

// Get notifications
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);

// Mark as read
router.patch('/:notificationId/read', markAsRead);
router.patch('/read-all', markAllAsRead);

// Delete
router.delete('/:notificationId', deleteNotification);
router.delete('/read/all', deleteAllRead);

export default router;