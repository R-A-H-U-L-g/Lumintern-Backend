import express from 'express';
import {
  fundAndStartTask,
  submitTaskWork,
  approveAndReleasePayment,
  openDispute,
  resolveDispute,
  getPaymentStatus,
} from '../controllers/paymentController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Payment status (accessible by task owner, assigned fresher, or admin)
router.get('/:taskId/status', getPaymentStatus);

// Business routes
router.post('/:taskId/fund', restrictTo('business'), fundAndStartTask);
router.post('/:taskId/approve', restrictTo('business'), approveAndReleasePayment);
router.post('/:taskId/dispute', restrictTo('business'), openDispute);

// Fresher routes
router.post('/:taskId/submit', restrictTo('fresher'), submitTaskWork);

// Admin routes
router.patch('/:taskId/resolve-dispute', restrictTo('admin'), resolveDispute);

export default router;