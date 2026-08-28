import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // Core Fields
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['fresher', 'business', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Role is required'],
    },

    // Fresher Profile Fields
    fresherProfile: {
      college: {
        type: String,
        trim: true,
      },
      yearOfStudy: {
        type: String,
        enum: ['1', '2', '3', '4', '5+', 'phd', 'graduate'],
      },
      skills: {
        type: [String],
        default: [],
      },
      preferredWorkScale: {
        type: String,
        enum: {
          values: ['small', 'large', 'both'],
          message: '{VALUE} is not a valid work scale preference',
        },
        default: 'both',
      },
      portfolioLinks: [
        {
          title: String,
          url: String,
        },
      ],
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalEarnings: {
        type: Number,
        default: 0,
      },
      completedTasks: {
        type: Number,
        default: 0,
      },
      // Gamification Fields
      experiencePoints: {
        type: Number,
        default: 0,
        min: 0,
      },
      platformLevel: {
        type: Number,
        default: 1,
        min: 1,
        max: 100,
      },
    },

    // Business Profile Fields
    businessProfile: {
      businessName: {
        type: String,
        trim: true,
      },
      businessType: {
        type: String,
        enum: [
          'local-retail',
          'ecommerce',
          'restaurant',
          'startup',
          'agency',
          'enterprise',
          'other',
        ],
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      totalSpent: {
        type: Number,
        default: 0,
      },
      postedTasks: {
        type: Number,
        default: 0,
      },
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for frequently searched fields
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'fresherProfile.skills': 1 });
userSchema.index({ 'businessProfile.isVerified': 1 });

// Virtual for user's applications
userSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'applicant',
});

// Virtual for user's posted tasks
userSchema.virtual('postedTasksList', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'postedBy',
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if fresher can apply to task scale
userSchema.methods.canApplyToScale = function (taskScale) {
  if (this.role !== 'fresher') return false;

  const preference = this.fresherProfile.preferredWorkScale;
  if (preference === 'both') return true;
  return preference === taskScale;
};

const User = mongoose.model('User', userSchema);

export default User;