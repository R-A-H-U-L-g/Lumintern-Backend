import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'submitted', 'approved', 'rejected'],
      default: 'pending',
    },
    dueDate: Date,
    completedAt: Date,
    submissionLinks: [String],
    feedback: String,
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    // Core Fields
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must have a poster'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Status Management
    status: {
      type: String,
      enum: {
        values: ['open', 'in_progress', 'review', 'completed', 'disputed', 'cancelled'],
        message: '{VALUE} is not a valid task status',
      },
      default: 'open',
    },

    // Payment Status
    paymentStatus: {
      type: String,
      enum: {
        values: ['unfunded', 'held_in_escrow', 'released', 'refunded'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'unfunded',
    },

    // Scope Fields
    workScale: {
      type: String,
      enum: {
        values: ['small', 'large'],
        message: '{VALUE} is not a valid work scale',
      },
      required: [true, 'Work scale is required'],
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [1, 'Budget must be at least $1'],
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    skillsRequired: {
      type: [String],
      required: [true, 'At least one skill is required'],
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: 'At least one skill is required',
      },
    },

    // Milestones
    milestones: [milestoneSchema],

    // Proof of Work
    proofOfWork: {
      proofLink: {
        type: String,
        trim: true,
      },
      submissionNotes: {
        type: String,
        maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      },
      submittedAt: {
        type: Date,
      },
    },

    // Deliverables
    deliverables: [
      {
        title: String,
        description: String,
        links: [String],
        files: [String],
        submittedAt: Date,
      },
    ],

    // Dispute Log
    disputeLog: {
      disputedAt: {
        type: Date,
      },
      reason: {
        type: String,
        maxlength: [1000, 'Reason cannot exceed 1000 characters'],
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      resolvedAt: {
        type: Date,
      },
      resolution: {
        type: String,
        enum: ['awarded_to_fresher', 'refunded_to_business', 'partial_split'],
      },
      resolutionNotes: {
        type: String,
        maxlength: [2000, 'Resolution notes cannot exceed 2000 characters'],
      },
      adminFee: {
        type: Number,
        default: 0,
      },
    },

    // Application Tracking
    applicationCount: {
      type: Number,
      default: 0,
    },
    maxApplications: {
      type: Number,
      default: 50,
    },

    // Metadata
    tags: [String],
    isUrgent: {
      type: Boolean,
      default: false,
    },
    fundedAt: Date,
    completedAt: Date,
    autoReleasedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for frequently searched fields
taskSchema.index({ status: 1 });
taskSchema.index({ paymentStatus: 1 });
taskSchema.index({ workScale: 1 });
taskSchema.index({ skillsRequired: 1 });
taskSchema.index({ postedBy: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ createdAt: -1 });

// Compound indexes for common queries
taskSchema.index({ status: 1, workScale: 1 });
taskSchema.index({ status: 1, paymentStatus: 1 });
taskSchema.index({ status: 1, 'proofOfWork.submittedAt': 1 });

// Virtual for applications
taskSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'task',
});

// Method to check if task is open for applications
taskSchema.methods.isOpenForApplications = function () {
  return (
    this.status === 'open' &&
    !this.assignedTo &&
    this.applicationCount < this.maxApplications &&
    new Date() < this.deadline
  );
};

// Method to initialize milestones based on work scale
taskSchema.methods.initializeMilestones = function () {
  if (this.workScale === 'small') {
    this.milestones = [
      {
        title: 'Final Delivery & Review',
        description: 'Complete the task and submit all deliverables for review',
        status: 'pending',
        dueDate: this.deadline,
      },
    ];
  } else if (this.workScale === 'large') {
    const now = new Date();
    const deadline = new Date(this.deadline);
    const totalDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    this.milestones = [
      {
        title: 'Architecture & Setup',
        description:
          'Define project architecture, set up development environment, and create initial project structure',
        status: 'pending',
        dueDate: new Date(now.getTime() + totalDays * 0.3 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Beta Review',
        description:
          'Deliver beta version for client review, gather feedback, and implement revisions',
        status: 'pending',
        dueDate: new Date(now.getTime() + totalDays * 0.7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Final Production Deployment',
        description:
          'Complete final testing, deploy to production, and deliver all documentation',
        status: 'pending',
        dueDate: deadline,
      },
    ];
  }
};

// Method to check if task is in review for auto-release
taskSchema.methods.isEligibleForAutoRelease = function () {
  if (this.status !== 'review' || !this.proofOfWork.submittedAt) {
    return false;
  }
  const hoursSinceSubmission =
    (Date.now() - this.proofOfWork.submittedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceSubmission >= 72;
};

const Task = mongoose.model('Task', taskSchema);

export default Task;