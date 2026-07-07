const UserState = require("../models/UserState");
const {
  computeWellbeingStreak,
  detectPeakHours,
  correlateWithStudyQuality,
  computeWeeklySummary,
} = require("../services/wellbeing");

async function submitCheckIn(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const { mood, energy } = req.body;

    if (typeof mood !== "number" || mood < 1 || mood > 5) {
      return res.status(400).json({ error: "Mood must be a number between 1 and 5." });
    }
    if (typeof energy !== "number" || energy < 1 || energy > 5) {
      return res.status(400).json({ error: "Energy must be a number between 1 and 5." });
    }

    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    const existing = Array.isArray(userState.wellbeingCheckIns) ? userState.wellbeingCheckIns : [];

    const todayIndex = existing.findIndex((c) => (c.date || "").slice(0, 10) === todayKey);

    const checkIn = {
      mood,
      energy,
      date: now.toISOString(),
      createdAt: now.toISOString(),
    };

    if (todayIndex >= 0) {
      existing[todayIndex] = { ...existing[todayIndex], mood, energy, date: now.toISOString() };
    } else {
      existing.push(checkIn);
    }

    userState.wellbeingCheckIns = existing;
    await userState.save();

    const streak = computeWellbeingStreak(existing);

    res.json({ checkIn: todayIndex >= 0 ? existing[todayIndex] : checkIn, streak });
  } catch (error) {
    console.error("Wellbeing check-in error:", error.message);
    res.status(500).json({ error: "Failed to submit wellbeing check-in" });
  }
}

async function getHistory(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const checkIns = Array.isArray(userState.wellbeingCheckIns) ? userState.wellbeingCheckIns : [];
    const streak = computeWellbeingStreak(checkIns);
    const peakHours = detectPeakHours(checkIns);
    const weeklySummary = computeWeeklySummary(checkIns);

    res.json({ checkIns, streak, peakHours, weeklySummary });
  } catch (error) {
    console.error("Wellbeing history error:", error.message);
    res.status(500).json({ error: "Failed to get wellbeing history" });
  }
}

async function getTodaysCheckIn(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const checkIns = Array.isArray(userState.wellbeingCheckIns) ? userState.wellbeingCheckIns : [];
    const todays = checkIns.find((c) => (c.date || "").slice(0, 10) === todayKey) || null;

    res.json({ checkIn: todays });
  } catch (error) {
    console.error("Wellbeing today error:", error.message);
    res.status(500).json({ error: "Failed to get today's check-in" });
  }
}

async function getPatterns(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const checkIns = Array.isArray(userState.wellbeingCheckIns) ? userState.wellbeingCheckIns : [];
    const peakHours = detectPeakHours(checkIns);
    const studyCheckIns = Array.isArray(userState.studyCheckIns) ? userState.studyCheckIns : [];
    const correlation = correlateWithStudyQuality(checkIns, studyCheckIns);

    res.json({ peakHours, correlation });
  } catch (error) {
    console.error("Wellbeing patterns error:", error.message);
    res.status(500).json({ error: "Failed to detect patterns" });
  }
}

async function getWeeklySummary(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const checkIns = Array.isArray(userState.wellbeingCheckIns) ? userState.wellbeingCheckIns : [];
    const summary = computeWeeklySummary(checkIns);

    res.json({ summary });
  } catch (error) {
    console.error("Wellbeing weekly summary error:", error.message);
    res.status(500).json({ error: "Failed to compute weekly summary" });
  }
}

async function getStreak(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const checkIns = Array.isArray(userState.wellbeingCheckIns) ? userState.wellbeingCheckIns : [];
    const streak = computeWellbeingStreak(checkIns);

    res.json({ streak });
  } catch (error) {
    console.error("Wellbeing streak error:", error.message);
    res.status(500).json({ error: "Failed to get streak" });
  }
}

module.exports = {
  submitCheckIn,
  getHistory,
  getTodaysCheckIn,
  getPatterns,
  getWeeklySummary,
  getStreak,
};
