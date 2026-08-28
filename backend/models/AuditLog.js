import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    // Admin who performed the action
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin ID is required'],
    },

    // Action Type
    actionType: {
      type: String,
      enum: {
        values: [
          'user_suspend',
          'user_activate',
          'user_terminate',
          'business_verify',
          'business_unverify',
          'setting_update',
          'dispute_resolve',
          'dispute_award_fresher',
          'dispute_refund_business',
          'manual_skill_edit',
          'profile_override',
          'maintenance_toggle',
          'registration_toggle',
        ],
        message: '{VALUE} is not a valid action type',
      },
      required: [true, 'Action type is required'],
    },

    // Target User (if applicable)
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Target Resource Type
    targetResourceType: {
      type: String,
      enum: ['user', 'task', 'setting', 'dispute', 'wallet'],
      default: 'user',
    },

    // Target Resource ID
    targetResourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Action Details (JSON)
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Previous State (for rollback capability)
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // New State
    newState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // IP Address
    ipAddress: {
      type: String,
      default: null,
    },

    // User Agent
    userAgent: {
      type: String,
      default: null,
    },

    // Reason/Notes
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },

    // Status
    status: {
      type: String,
      enum: ['success', 'failed', 'reverted'],
      default: 'success',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
auditLogSchema.index({ adminId: 1 });
auditLogSchema.index({ targetUserId: 1 });
auditLogSchema.index({ actionType: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetResourceType: 1, targetResourceId: 1 });

// Compound indexes
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ targetUserId: 1, createdAt: -1 });

// Static method to create audit log
auditLogSchema.statics.log = async function (data) {
  return this.create({
    adminId: data.adminId,
    actionType: data.actionType,
    targetUserId: data.targetUserId || null,
    targetResourceType: data.targetResourceType || 'user',
    targetResourceId: data.targetResourceId || null,
    details: data.details || {},
    previousState: data.previousState || null,
    newState: data.newState || null,
    ipAddress: data.ipAddress || null,
    userAgent: data.userAgent || null,
    reason: data.reason || null,
    status: data.status || 'success',
  });
};

// Static method to get recent activity
auditLogSchema.statics.getRecentActivity = function (limit = 50) {
  return this.find()
    .populate('adminId', 'name email')
    .populate('targetUserId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get activity for a specific user
auditLogSchema.statics.getUserActivity = function (userId, limit = 20) {
  return this.find({ targetUserId: userId })
    .populate('adminId', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get admin activity
auditLogSchema.statics.getAdminActivity = function (adminId, limit = 50) {
  return this.find({ adminId })
    .populate('targetUserId', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;