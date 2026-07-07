const mongoose = require('mongoose');
const { createOfflineModelProxy } = require('../utils/offlineModel');

const groupSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    createdBy: {
      type: String,
      required: true,
    },
    members: {
      type: [String],
      default: [],
      validate: [arr => arr.length <= 50, 'Group cannot exceed 50 members'],
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    challenges: {
      type: [{
        id: String,
        title: String,
        description: String,
        type: { type: String, enum: ['study_hours', 'task_completion', 'streak'] },
        target: Number,
        unit: String,
        startDate: Date,
        endDate: Date,
        createdBy: String,
        participants: [{ userId: String, progress: Number, completed: Boolean }],
        createdAt: { type: Date, default: Date.now },
      }],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
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

groupSchema.pre('save', function setUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

module.exports = createOfflineModelProxy(Group, {
  collectionName: 'groups',
  primaryKey: 'id',
});
