const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getFullDashboard, getDailyBriefing } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", requireAuth, getFullDashboard);
router.get("/briefing", requireAuth, getDailyBriefing);

module.exports = router;
