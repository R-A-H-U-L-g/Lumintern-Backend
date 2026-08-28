import express from 'express';
import { getGamificationProfile, getLeaderboard } from '../controllers/gamificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get gamification profile (authenticated)
router.get('/profile', protect, getGamificationProfile);

// Get leaderboard (public)
router.get('/leaderboard', getLeaderboard);

export default router;