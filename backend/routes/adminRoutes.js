import express from 'express';
import {
  getDashboardStats,
  getDisputedTasks,
  getAllUsers,
  getUserDetails,
  verifyBusiness,
  deactivateUser,
  getTransactionLogs,
} from '../controllers/adminController.js';
import { resolveDispute } from '../controllers/paymentController.js';
import { triggerAutoRelease, getEligibleAutoReleaseTasks } from '../jobs/autoRelease.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Dispute Management
router.get('/disputes', getDisputedTasks);
router.patch('/resolve-dispute/:taskId', resolveDispute);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.patch('/users/:userId/verify', verifyBusiness);
router.patch('/users/:userId/deactivate', deactivateUser);

// Transaction Logs
router.get('/transactions', getTransactionLogs);

// Auto-Release Management
router.post('/auto-release/trigger', triggerAutoRelease);
router.get('/auto-release/eligible', getEligibleAutoReleaseTasks);

export default router;