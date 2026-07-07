const { getDashboard, getBriefing } = require("../services/ecosystemEngine");

async function getFullDashboard(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const data = await getDashboard(userId);
    if (!data) {
      return res.status(404).json({ error: "User state not found" });
    }
    res.json(data);
  } catch (error) {
    console.error("Dashboard error:", error.message);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
}

async function getDailyBriefing(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const briefing = await getBriefing(userId);
    if (!briefing) {
      return res.status(404).json({ error: "User state not found" });
    }
    res.json(briefing);
  } catch (error) {
    console.error("Briefing error:", error.message);
    res.status(500).json({ error: "Failed to load briefing" });
  }
}

module.exports = {
  getFullDashboard,
  getDailyBriefing,
};
