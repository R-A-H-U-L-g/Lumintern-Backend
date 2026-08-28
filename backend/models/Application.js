import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    // Core References
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Application must reference a task'],
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Application must have an applicant'],
    },

    // Application Details
    coverNote: {
      type: String,
      required: [true, 'Cover note is required'],
      maxlength: [2000, 'Cover note cannot exceed 2000 characters'],
    },
    proposedTimeline: {
      type: String,
      required: [true, 'Proposed timeline is required'],
    },
    proposedBudget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
    },

    // Status
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'rejected', 'withdrawn'],
        message: '{VALUE} is not a valid application status',
      },
      default: 'pending',
    },

    // Additional Info
    relevantExperience: {
      type: String,
      maxlength: [1000, 'Experience description cannot exceed 1000 characters'],
    },
    portfolioSamples: [
      {
        title: String,
        url: String,
      },
    ],

    // Rejection Reason
    rejectionReason: {
      type: String,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },

    // Timestamps for Status Changes
    acceptedAt: Date,
    rejectedAt: Date,
    withdrawnAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for frequently searched fields
applicationSchema.index({ task: 1 });
applicationSchema.index({ applicant: 1 });
applicationSchema.index({ status: 1 });

// Compound indexes
applicationSchema.index({ task: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ task: 1, status: 1 });
applicationSchema.index({ applicant: 1, status: 1 });

// Pre-save middleware to update task application count
applicationSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      const Task = mongoose.model('Task');
      await Task.findByIdAndUpdate(this.task, {
        $inc: { applicationCount: 1 },
      });
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to check if user already applied
applicationSchema.statics.hasUserApplied = async function (taskId, userId) {
  const existingApplication = await this.findOne({
    task: taskId,
    applicant: userId,
  });
  return !!existingApplication;
};

// Static method to get application stats for a task
applicationSchema.statics.getTaskStats = async function (taskId) {
  const stats = await this.aggregate([
    { $match: { task: mongoose.Types.ObjectId(taskId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
};

const Application = mongoose.model('Application', applicationSchema);

export default Application;