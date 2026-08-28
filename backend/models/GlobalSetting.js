import mongoose from 'mongoose';

const globalSettingSchema = new mongoose.Schema(
  {
    // Unique identifier (singleton pattern)
    settingKey: {
      type: String,
      default: 'global',
      unique: true,
    },

    // Platform Commission
    platformCommissionFee: {
      type: Number,
      default: 10,
      min: 0,
      max: 50,
    },

    // Auto-Release Timer (hours)
    autoReleaseEscrowTimer: {
      type: Number,
      default: 72,
      min: 24,
      max: 168,
    },

    // Scale Threshold (currency amount)
    scaleThresholdLimit: {
      type: Number,
      default: 100,
      min: 10,
    },

    // Platform Name
    platformName: {
      type: String,
      default: 'LUMINTERN',
    },

    // Support Email
    supportEmail: {
      type: String,
      default: 'support@lumintern.com',
    },

    // Maintenance Mode
    maintenanceMode: {
      type: Boolean,
      default: false,
    },

    // Registration Controls
    allowNewRegistrations: {
      type: Boolean,
      default: true,
    },

    // Minimum Withdrawal Amount
    minimumWithdrawal: {
      type: Number,
      default: 50,
      min: 10,
    },

    // Maximum Task Budget
    maximumTaskBudget: {
      type: Number,
      default: 50000,
      min: 100,
    },

    // Dispute Auto-Escalation (hours)
    disputeAutoEscalation: {
      type: Number,
      default: 48,
      min: 24,
    },

    // Last Updated By
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get or create settings
globalSettingSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ settingKey: 'global' });
  if (!settings) {
    settings = await this.create({ settingKey: 'global' });
  }
  return settings;
};

// Static method to update settings
globalSettingSchema.statics.updateSettings = async function (updates, adminId) {
  const settings = await this.getSettings();
  
  Object.keys(updates).forEach((key) => {
    if (updates[key] !== undefined && key !== 'settingKey') {
      settings[key] = updates[key];
    }
  });
  
  settings.lastUpdatedBy = adminId;
  await settings.save();
  return settings;
};

const GlobalSetting = mongoose.model('GlobalSetting', globalSettingSchema);

export default GlobalSetting;