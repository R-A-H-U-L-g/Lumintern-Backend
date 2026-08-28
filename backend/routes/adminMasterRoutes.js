import express from 'express';
import {
  getAnalyticsOverview,
  getLiveActivity,
  getUsers,
  getUserDetails,
  updateUserStatus,
  getSettings,
  updateSettings,
  getAuditLogs,
} from '../controllers/adminMasterController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(restrictTo('admin'));

// Tab A: Analytics & Activity
router.get('/analytics/overview', getAnalyticsOverview);
router.get('/analytics/activity', getLiveActivity);

// Tab B: User Management
router.get('/users', getUsers);
router.get('/users/:userId', getUserDetails);
router.patch('/users/:userId/status', updateUserStatus);

// Tab C: Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

export default router;