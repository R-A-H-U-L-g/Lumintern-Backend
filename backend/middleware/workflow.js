import Task from '../models/Task.js';
import User from '../models/User.js';

// Profile Scale Check Middleware
export const checkProfileScaleMatch = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    // Get the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Check if task is open for applications
    if (!task.isOpenForApplications()) {
      return res.status(400).json({
        status: 'error',
        message: 'This task is no longer accepting applications',
      });
    }

    // Get the fresher profile
    const user = await User.findById(userId);
    if (user.role !== 'fresher') {
      return res.status(403).json({
        status: 'error',
        message: 'Only freshers can apply to tasks',
      });
    }

    // Check if fresher's preferred scale matches task scale
    if (!user.canApplyToScale(task.workScale)) {
      const preference = user.fresherProfile.preferredWorkScale;
      return res.status(400).json({
        status: 'error',
        message: `Your work preference is set to "${preference}" gigs. This task is a "${task.workScale}" scale project. Please update your preferences to apply.`,
      });
    }

    // Attach task to request for later use
    req.task = task;
    next();
  } catch (error) {
    next(error);
  }
};

// Milestone Initialization Middleware
export const initializeMilestones = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    // Only run when status changes to 'in_progress'
    if (status !== 'in_progress') {
      return next();
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Verify the business owns this task
    if (task.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update tasks you posted',
      });
    }

    // Verify task has an assigned fresher
    if (!task.assignedTo) {
      return res.status(400).json({
        status: 'error',
        message: 'Task must have an assigned fresher before starting',
      });
    }

    // Initialize milestones based on work scale
    task.initializeMilestones();
    await task.save();

    req.task = task;
    next();
  } catch (error) {
    next(error);
  }
};

// Submission Guard Middleware
export const validateSubmission = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status, deliverables } = req.body;

    // Only run when trying to mark as completed
    if (status !== 'completed') {
      return next();
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Check if all milestones are approved
    const allMilestonesApproved = task.milestones.every(
      (milestone) => milestone.status === 'approved'
    );

    if (!allMilestonesApproved) {
      return res.status(400).json({
        status: 'error',
        message:
          'All milestones must be approved before marking task as completed',
      });
    }

    // Check if deliverables are provided
    if (!deliverables || deliverables.length === 0) {
      return res.status(400).json({
        status: 'error',
        message:
          'Please provide at least one deliverable (link or file) before marking as completed',
      });
    }

    // Validate each deliverable has content
    const hasEmptyDeliverable = deliverables.some(
      (d) => !d.links || d.links.length === 0
    );

    if (hasEmptyDeliverable) {
      return res.status(400).json({
        status: 'error',
        message: 'Each deliverable must include at least one link or file',
      });
    }

    req.task = task;
    next();
  } catch (error) {
    next(error);
  }
};

// Status Transition Validator
export const validateStatusTransition = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status: newStatus } = req.body;

    if (!newStatus) {
      return next();
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    const currentStatus = task.status;

    // Define valid status transitions
    const validTransitions = {
      open: ['in_progress', 'cancelled'],
      in_progress: ['review', 'cancelled'],
      review: ['in_progress', 'completed', 'cancelled'],
      completed: [],
      cancelled: ['open'],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot transition from "${currentStatus}" to "${newStatus}". Valid transitions: ${validTransitions[currentStatus]?.join(', ') || 'none'}`,
      });
    }

    req.task = task;
    next();
  } catch (error) {
    next(error);
  }
};

// Milestone Submission Validator
export const validateMilestoneSubmission = async (req, res, next) => {
  try {
    const { taskId, milestoneId } = req.params;
    const { submissionLinks } = req.body;

    if (!submissionLinks || submissionLinks.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide at least one submission link',
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    const milestone = task.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({
        status: 'error',
        message: 'Milestone not found',
      });
    }

    if (milestone.status === 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'This milestone has already been approved',
      });
    }

    req.task = task;
    req.milestone = milestone;
    next();
  } catch (error) {
    next(error);
  }
};