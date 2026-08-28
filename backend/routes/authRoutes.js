import express from 'express';
import {
  register,
  login,
  getMe,
  updateMe,
  updatePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/me', getMe);
router.patch('/updateMe', updateMe);
router.patch('/updatePassword', updatePassword);

export default router;