const mongoose = require('mongoose');

const userStateSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    tasks: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    timeSessions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    cgpaState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    financeState: {
      entries: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },
      recurringPlans: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },
      prefs: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

userStateSchema.pre('save', function setUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('UserState', userStateSchema);
