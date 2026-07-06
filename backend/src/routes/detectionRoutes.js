const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const {
  detectTasks,
  acceptDetection,
  submitFeedback,
} = require("../controllers/detectionController");

router.post("/detect", detectTasks);
router.post("/accept", requireAuth, acceptDetection);
router.post("/feedback", submitFeedback);

module.exports = router;
