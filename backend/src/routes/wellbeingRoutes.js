const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  submitCheckIn,
  getHistory,
  getTodaysCheckIn,
  getPatterns,
  getWeeklySummary,
  getStreak,
} = require("../controllers/wellbeingController");

const router = express.Router();

router.post("/checkin", requireAuth, submitCheckIn);
router.get("/history", requireAuth, getHistory);
router.get("/today", requireAuth, getTodaysCheckIn);
router.get("/patterns", requireAuth, getPatterns);
router.get("/weekly-summary", requireAuth, getWeeklySummary);
router.get("/streak", requireAuth, getStreak);

module.exports = router;
