const mongoose = require('mongoose');
const { createOfflineModelProxy } = require('../utils/offlineModel');

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
    studyPlans: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    studyCheckIns: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
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

const UserState = mongoose.models.UserState || mongoose.model('UserState', userStateSchema);

module.exports = createOfflineModelProxy(UserState, {
  collectionName: 'userStates',
  primaryKey: 'userId',
});
