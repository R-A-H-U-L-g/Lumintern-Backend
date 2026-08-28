import express from 'express';
import { generateQRPoster, generateQRPosterHTML } from '../controllers/qrController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All QR routes require authentication
router.use(protect);
router.use(restrictTo('business'));

// Generate QR poster data
router.get('/qr-poster', generateQRPoster);

// Generate printable QR poster HTML
router.get('/qr-poster/print', generateQRPosterHTML);

export default router;