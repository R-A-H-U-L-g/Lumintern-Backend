import express from 'express';
import {
  createTask,
  getAllTasks,
  getTask,
  updateTask,
  applyToTask,
  updateTaskStatus,
  getMyTasks,
  getAssignedTasks,
  submitMilestone,
  approveMilestone,
  getTaskApplications,
  acceptApplication,
} from '../controllers/taskController.js';
import { protect, restrictTo, verifyBusiness } from '../middleware/auth.js';
import {
  checkProfileScaleMatch,
  initializeMilestones,
  validateSubmission,
  validateStatusTransition,
  validateMilestoneSubmission,
} from '../middleware/workflow.js';

const router = express.Router();

// Public routes
router.get('/', getAllTasks);
router.get('/:id', getTask);

// Protected routes
router.use(protect); // All routes below require authentication

// Business routes
router.post('/', restrictTo('business'), verifyBusiness, createTask);
router.get('/my/posted', restrictTo('business'), getMyTasks);
router.patch(
  '/:taskId/status',
  restrictTo('business'),
  validateStatusTransition,
  initializeMilestones,
  validateSubmission,
  updateTaskStatus
);
router.get('/:taskId/applications', restrictTo('business'), getTaskApplications);
router.patch(
  '/:taskId/applications/:applicationId/accept',
  restrictTo('business'),
  acceptApplication
);
router.patch(
  '/:taskId/milestones/:milestoneId/approve',
  restrictTo('business'),
  approveMilestone
);

// Fresher routes
router.post(
  '/:taskId/apply',
  restrictTo('fresher'),
  checkProfileScaleMatch,
  applyToTask
);
router.get('/my/assigned', restrictTo('fresher'), getAssignedTasks);
router.patch(
  '/:taskId/milestones/:milestoneId/submit',
  restrictTo('fresher'),
  validateMilestoneSubmission,
  submitMilestone
);

export default router;