const mongoose = require("mongoose");

const courseMaterialSchema = new mongoose.Schema({
  crymsonId: { type: String, required: true, index: true },
  courseCode: { type: String, required: true, index: true },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ["lecture-note", "slide", "past-question", "assignment", "other"],
    default: "other",
  },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, default: "application/octet-stream" },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

courseMaterialSchema.index({ crymsonId: 1, courseCode: 1 });
courseMaterialSchema.index({ tags: 1 });

module.exports = mongoose.model("CourseMaterial", courseMaterialSchema);
