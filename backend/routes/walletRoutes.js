import express from 'express';
import {
  getWalletBalance,
  getTransactionLedger,
  addFunds,
  requestWithdrawal,
  getWalletStats,
  getTransactionDetails,
} from '../controllers/walletController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All wallet routes require authentication
router.use(protect);

// Balance
router.get('/balance', getWalletBalance);

// Transactions
router.get('/ledger', getTransactionLedger);
router.get('/stats', getWalletStats);
router.get('/transaction/:transactionId', getTransactionDetails);

// Actions
router.post('/add-funds', addFunds);
router.post('/withdraw', requestWithdrawal);

export default router;