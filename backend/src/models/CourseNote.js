const mongoose = require("mongoose");

const courseNoteSchema = new mongoose.Schema({
  crymsonId: { type: String, required: true, index: true },
  courseCode: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

courseNoteSchema.index({ crymsonId: 1, courseCode: 1 });

module.exports = mongoose.model("CourseNote", courseNoteSchema);
