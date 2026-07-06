const UserState = require("../models/UserState");
const { generateSchedule, computeCheckInStats } = require("../services/studyPlanner");

async function getSchedule(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const tasks = Array.isArray(userState.tasks) ? userState.tasks : [];
    const sessions = Array.isArray(userState.timeSessions) ? userState.timeSessions : [];
    const cgpaState = userState.cgpaState || null;

    let courses = [];
    if (cgpaState && Array.isArray(cgpaState.courses)) {
      courses = cgpaState.courses;
    }

    const schedule = generateSchedule(courses, tasks, sessions, cgpaState);
    const existingPlans = Array.isArray(userState.studyPlans) ? userState.studyPlans : [];
    const checkIns = Array.isArray(userState.studyCheckIns) ? userState.studyCheckIns : [];

    res.json({
      schedule,
      approvedPlans: existingPlans.filter((p) => p.approved && !p.completed),
      completedPlans: existingPlans.filter((p) => p.completed),
      checkInStats: computeCheckInStats(checkIns),
    });
  } catch (error) {
    console.error("Study planner error:", error.message);
    res.status(500).json({ error: "Failed to generate study schedule" });
  }
}

async function generateNewSchedule(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const tasks = Array.isArray(userState.tasks) ? userState.tasks : [];
    const sessions = Array.isArray(userState.timeSessions) ? userState.timeSessions : [];
    const cgpaState = userState.cgpaState || null;

    let courses = [];
    if (cgpaState && Array.isArray(cgpaState.courses)) {
      courses = cgpaState.courses;
    }

    const schedule = generateSchedule(courses, tasks, sessions, cgpaState);

    res.json({ schedule });
  } catch (error) {
    console.error("Generate schedule error:", error.message);
    res.status(500).json({ error: "Failed to generate schedule" });
  }
}

async function approvePlan(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const { recommendation } = req.body;

    if (!recommendation || !recommendation.id) {
      return res.status(400).json({ error: "Recommendation data required" });
    }

    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const plan = {
      ...recommendation,
      approved: true,
      declined: false,
      approvedAt: new Date().toISOString(),
      reminderSent: false,
    };

    userState.studyPlans = [...(Array.isArray(userState.studyPlans) ? userState.studyPlans : []), plan];
    await userState.save();

    res.json({ plan });
  } catch (error) {
    console.error("Approve plan error:", error.message);
    res.status(500).json({ error: "Failed to approve plan" });
  }
}

async function declinePlan(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const { recommendationId } = req.body;

    if (!recommendationId) {
      return res.status(400).json({ error: "recommendationId required" });
    }

    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const plans = Array.isArray(userState.studyPlans) ? userState.studyPlans : [];
    const updated = plans.map((p) =>
      p.id === recommendationId ? { ...p, declined: true, declinedAt: new Date().toISOString() } : p
    );
    userState.studyPlans = updated;
    await userState.save();

    res.json({ status: "declined" });
  } catch (error) {
    console.error("Decline plan error:", error.message);
    res.status(500).json({ error: "Failed to decline plan" });
  }
}

async function reschedulePlan(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const { recommendationId, newDate, newStartTime, newEndTime } = req.body;

    if (!recommendationId) {
      return res.status(400).json({ error: "recommendationId required" });
    }

    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const plans = Array.isArray(userState.studyPlans) ? userState.studyPlans : [];
    const updated = plans.map((p) =>
      p.id === recommendationId
        ? {
            ...p,
            date: newDate || p.date,
            startTime: newStartTime || p.startTime,
            endTime: newEndTime || p.endTime,
            rescheduled: true,
            rescheduledAt: new Date().toISOString(),
          }
        : p
    );
    userState.studyPlans = updated;
    await userState.save();

    res.json({ status: "rescheduled" });
  } catch (error) {
    console.error("Reschedule error:", error.message);
    res.status(500).json({ error: "Failed to reschedule" });
  }
}

async function submitCheckIn(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const { planId, studied, minutesStudied, notes } = req.body;

    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const checkIn = {
      planId: planId || null,
      studied: Boolean(studied),
      minutesStudied: Math.max(0, Number(minutesStudied) || 0),
      notes: String(notes || ""),
      createdAt: new Date().toISOString(),
    };

    userState.studyCheckIns = [...(Array.isArray(userState.studyCheckIns) ? userState.studyCheckIns : []), checkIn];

    if (planId) {
      const plans = Array.isArray(userState.studyPlans) ? userState.studyPlans : [];
      userState.studyPlans = plans.map((p) =>
        p.id === planId ? { ...p, completed: true, completedAt: new Date().toISOString(), checkIn } : p
      );
    }

    await userState.save();

    res.json({
      checkIn,
      stats: computeCheckInStats(userState.studyCheckIns || []),
    });
  } catch (error) {
    console.error("Check-in error:", error.message);
    res.status(500).json({ error: "Failed to submit check-in" });
  }
}

async function getCheckIns(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const userState = await UserState.findOne({ userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const checkIns = Array.isArray(userState.studyCheckIns) ? userState.studyCheckIns : [];
    res.json({
      checkIns,
      stats: computeCheckInStats(checkIns),
    });
  } catch (error) {
    console.error("Get check-ins error:", error.message);
    res.status(500).json({ error: "Failed to get check-ins" });
  }
}

module.exports = {
  getSchedule,
  generateNewSchedule,
  approvePlan,
  declinePlan,
  reschedulePlan,
  submitCheckIn,
  getCheckIns,
};
