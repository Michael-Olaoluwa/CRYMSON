const { analyzeText } = require("../services/textAnalyzer");
const UserState = require("../models/UserState");

async function detectTasks(req, res) {
  try {
    const { text, source } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = await analyzeText(text);

    const detectionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    res.json({
      detectionId,
      source: source || "manual",
      ...result,
    });
  } catch (error) {
    console.error("Detection error:", error.message);
    res.status(500).json({ error: "Detection failed", detections: [] });
  }
}

async function acceptDetection(req, res) {
  try {
    const { detectionId, detections: acceptedDetections } = req.body;
    const userId = req.user?.crymsonId || req.body.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!Array.isArray(acceptedDetections) || acceptedDetections.length === 0) {
      return res.status(400).json({ error: "No detections to accept" });
    }

    const userState = await UserState.findOne({ crymsonId: userId });
    if (!userState) {
      return res.status(404).json({ error: "User state not found" });
    }

    const now = new Date().toISOString();
    const newTasks = acceptedDetections.map((d) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: d.title || "Untitled task",
      dueAt: d.dueAt || "",
      details: d.sourceText || "",
      taskType: d.type === "exam" ? "exam" : d.type === "deadline" ? "assignment" : "general",
      courseTag: d.courseTag || "",
      priority: d.priority || "medium",
      recurrence: "none",
      completed: false,
      createdAt: now,
      _detectionMeta: {
        detectionId,
        confidence: d.confidence,
        sourceText: d.sourceText,
      },
    }));

    userState.tasks = [...(Array.isArray(userState.tasks) ? userState.tasks : []), ...newTasks];
    await userState.save();

    res.json({ accepted: newTasks.length, tasks: newTasks });
  } catch (error) {
    console.error("Accept detection error:", error.message);
    res.status(500).json({ error: "Failed to accept detection" });
  }
}

async function submitFeedback(req, res) {
  try {
    const { detectionId, detection, rating } = req.body;

    if (!rating || !["up", "down"].includes(rating)) {
      return res.status(400).json({ error: "Rating must be 'up' or 'down'" });
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Feedback error:", error.message);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
}

module.exports = { detectTasks, acceptDetection, submitFeedback };
