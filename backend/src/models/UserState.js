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
    wellbeingCheckIns: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    social: {
      type: {
        friends: { type: [String], default: [] },
        friendRequests: {
          type: [{
            from: String,
            status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
            createdAt: { type: Date, default: Date.now },
          }],
          default: [],
        },
        groups: { type: [String], default: [] },
        groupInvites: {
          type: [{
            groupId: String,
            invitedBy: String,
            status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
            createdAt: { type: Date, default: Date.now },
          }],
          default: [],
        },
        privacy: {
          type: {
            showStudyHours: { type: Boolean, default: true },
            showTaskRate: { type: Boolean, default: true },
            showScore: { type: Boolean, default: false },
            showFinance: { type: Boolean, default: false },
            showStreak: { type: Boolean, default: true },
          },
          default: { showStudyHours: true, showTaskRate: true, showScore: false, showFinance: false, showStreak: true },
        },
      },
      default: { friends: [], friendRequests: [], groups: [], groupInvites: [], privacy: { showStudyHours: true, showTaskRate: true, showScore: false, showFinance: false, showStreak: true } },
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
