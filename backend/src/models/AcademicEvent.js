const mongoose = require('mongoose');

const academicEventSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    taskType: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      enum: ['test-1', 'test-2', 'submission-deadline', 'exam', 'exam-timetable'],
    },
    dueAt: {
      type: Date,
      required: true,
      index: true,
    },
    reminderDelayMinutes: {
      type: Number,
      default: 60,
      min: 1,
      max: 1440,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    sourceTaskId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    versionKey: false,
  }
);

academicEventSchema.pre('save', function setUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AcademicEvent', academicEventSchema);
