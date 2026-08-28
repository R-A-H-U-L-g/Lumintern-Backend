import Task from '../models/Task.js';
import Application from '../models/Application.js';

// Create a new task (Business only)
export const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      workScale,
      budget,
      deadline,
      skillsRequired,
      tags,
      isUrgent,
    } = req.body;

    // Create task
    const task = await Task.create({
      title,
      description,
      postedBy: req.user._id,
      workScale,
      budget,
      deadline,
      skillsRequired,
      tags,
      isUrgent,
    });

    // Update business posted tasks count
    await req.user.updateOne({
      $inc: { 'businessProfile.postedTasks': 1 },
    });

    res.status(201).json({
      status: 'success',
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all tasks with filters
export const getAllTasks = async (req, res, next) => {
  try {
    const {
      scale,
      skills,
      status,
      minBudget,
      maxBudget,
      search,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter object
    const filter = {};

    // Scale filter
    if (scale) {
      filter.workScale = scale;
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',');
      filter.skillsRequired = { $in: skillsArray };
    }

    // Status filter (default to open tasks)
    filter.status = status || 'open';

    // Budget range filter
    if (minBudget || maxBudget) {
      filter.budget = {};
      if (minBudget) filter.budget.$gte = Number(minBudget);
      if (maxBudget) filter.budget.$lte = Number(maxBudget);
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort object
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sort === 'budget_asc') sortOption = { budget: 1 };
    if (sort === 'budget_desc') sortOption = { budget: -1 };
    if (sort === 'deadline') sortOption = { deadline: 1 };

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const tasks = await Task.find(filter)
      .populate('postedBy', 'name businessProfile.businessName businessProfile.isVerified')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Task.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: tasks.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      data: {
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single task
export const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('postedBy', 'name email businessProfile')
      .populate('assignedTo', 'name email fresherProfile');

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Get application count
    const applicationCount = await Application.countDocuments({
      task: task._id,
    });

    res.status(200).json({
      status: 'success',
      data: {
        task: {
          ...task.toObject(),
          applicationCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update task (Business owner only)
export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Check if user is the task owner
    if (task.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update tasks you posted',
      });
    }

    // Only allow updates if task is still open
    if (task.status !== 'open') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update task that is no longer open',
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title',
      'description',
      'budget',
      'deadline',
      'skillsRequired',
      'tags',
      'isUrgent',
    ];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 'success',
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Apply to task (Fresher only)
export const applyToTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { coverNote, proposedTimeline, proposedBudget, relevantExperience, portfolioSamples } =
      req.body;

    // Check if already applied
    const hasApplied = await Application.hasUserApplied(taskId, req.user._id);
    if (hasApplied) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already applied to this task',
      });
    }

    // Create application
    const application = await Application.create({
      task: taskId,
      applicant: req.user._id,
      coverNote,
      proposedTimeline,
      proposedBudget,
      relevantExperience,
      portfolioSamples,
    });

    res.status(201).json({
      status: 'success',
      data: {
        application,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update task status
export const updateTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status, assignedTo, deliverables } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Update status
    if (status) {
      task.status = status;

      // Set completion timestamp
      if (status === 'completed') {
        task.completedAt = new Date();
      }
    }

    // Assign fresher
    if (assignedTo) {
      task.assignedTo = assignedTo;
    }

    // Add deliverables
    if (deliverables && deliverables.length > 0) {
      task.deliverables = deliverables;
    }

    await task.save();

    res.status(200).json({
      status: 'success',
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get tasks posted by current business user
export const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ postedBy: req.user._id })
      .populate('assignedTo', 'name email fresherProfile')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: tasks.length,
      data: {
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get tasks assigned to current fresher
export const getAssignedTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('postedBy', 'name businessProfile.businessName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: tasks.length,
      data: {
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Submit milestone
export const submitMilestone = async (req, res, next) => {
  try {
    const { taskId, milestoneId } = req.params;
    const { submissionLinks } = req.body;

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

    // Update milestone
    milestone.status = 'submitted';
    milestone.submissionLinks = submissionLinks;
    milestone.submittedAt = new Date();

    await task.save();

    res.status(200).json({
      status: 'success',
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Approve milestone (Business only)
export const approveMilestone = async (req, res, next) => {
  try {
    const { taskId, milestoneId } = req.params;
    const { feedback } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Verify business owns this task
    if (task.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only approve milestones for your tasks',
      });
    }

    const milestone = task.milestones.id(milestoneId);

    if (!milestone) {
      return res.status(404).json({
        status: 'error',
        message: 'Milestone not found',
      });
    }

    if (milestone.status !== 'submitted') {
      return res.status(400).json({
        status: 'error',
        message: 'Milestone must be submitted before approval',
      });
    }

    // Approve milestone
    milestone.status = 'approved';
    milestone.feedback = feedback;
    milestone.completedAt = new Date();

    // Check if all milestones are approved
    const allApproved = task.milestones.every(
      (m) => m.status === 'approved'
    );

    // If all milestones approved, move task to review
    if (allApproved) {
      task.status = 'review';
    }

    await task.save();

    res.status(200).json({
      status: 'success',
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get task applications (Business only)
export const getTaskApplications = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Verify business owns this task
    if (task.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view applications for your tasks',
      });
    }

    const applications = await Application.find({ task: taskId })
      .populate('applicant', 'name email fresherProfile')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: applications.length,
      data: {
        applications,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Accept application (Business only)
export const acceptApplication = async (req, res, next) => {
  try {
    const { taskId, applicationId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    // Verify business owns this task
    if (task.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only accept applications for your tasks',
      });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found',
      });
    }

    // Accept the application
    application.status = 'accepted';
    application.acceptedAt = new Date();
    await application.save();

    // Assign fresher to task
    task.assignedTo = application.applicant;
    task.status = 'in_progress';
    task.initializeMilestones();
    await task.save();

    // Reject other pending applications
    await Application.updateMany(
      {
        task: taskId,
        _id: { $ne: applicationId },
        status: 'pending',
      },
      {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: 'Position filled',
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        application,
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};