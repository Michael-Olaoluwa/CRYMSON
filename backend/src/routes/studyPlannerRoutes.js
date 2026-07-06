const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getSchedule,
  generateNewSchedule,
  approvePlan,
  declinePlan,
  reschedulePlan,
  submitCheckIn,
  getCheckIns,
} = require("../controllers/studyPlannerController");

const router = express.Router();

router.get("/schedule", requireAuth, getSchedule);
router.post("/generate", requireAuth, generateNewSchedule);
router.post("/approve", requireAuth, approvePlan);
router.post("/decline", requireAuth, declinePlan);
router.post("/reschedule", requireAuth, reschedulePlan);
router.post("/checkin", requireAuth, submitCheckIn);
router.get("/checkins", requireAuth, getCheckIns);

module.exports = router;
