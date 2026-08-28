import express from 'express';
import { generateContract, getContractDetails } from '../controllers/contractController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All contract routes require authentication
router.use(protect);

// Generate contract PDF
router.get('/task/:taskId/contract', generateContract);

// Get contract details
router.get('/task/:taskId/contract/details', getContractDetails);

export default router;