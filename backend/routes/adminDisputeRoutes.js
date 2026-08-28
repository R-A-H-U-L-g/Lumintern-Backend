import express from 'express';
import {
  getDisputes,
  getDisputeDetails,
  resolveDispute,
  getDisputeStats,
  exportDisputeReport
} from '../controllers/adminDisputeController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(restrictTo('admin'));

// Dispute management
router.get('/disputes', getDisputes);
router.get('/disputes/stats', getDisputeStats);
router.get('/disputes/export', exportDisputeReport);
router.get('/disputes/:disputeId', getDisputeDetails);
router.post('/disputes/:disputeId/resolve', resolveDispute);

export default router;