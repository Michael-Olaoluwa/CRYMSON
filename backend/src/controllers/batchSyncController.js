/**
 * backend/src/controllers/batchSyncController.js
 * Handles batched multi-resource user-state updates
 */

const UserState = require("../models/UserState");
const { logStateChange } = require("../middleware/auditLog");

/**
 * PUT /api/user-state/batch-sync
 * Accepts multiple data types in single request
 * Reduces network overhead and improves reliability
 */
async function batchSync(req, res) {
  try {
    const userId = req.auth.crymsonId;
    const { data, metadata } = req.body;

    if (!data || typeof data !== "object") {
      return res.status(400).json({ message: "Invalid batch data structure" });
    }

    // Prepare update object
    const updateFields = {};
    if (data.tasks) updateFields.tasks = data.tasks;
    if (data.cgpaState) updateFields.cgpaState = data.cgpaState;
    if (data.timeSessions) updateFields.timeSessions = data.timeSessions;
    if (data.finance) updateFields.financeState = data.finance;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No valid data fields provided" });
    }

    // Update timestamp
    updateFields.updatedAt = new Date();

    // Upsert user state with all fields atomically
    const result = await UserState.updateOne(
      { userId },
      {
        $set: updateFields,
        $setOnInsert: { userId },
      },
      { upsert: true }
    );

    // Log the batch operation
    logStateChange(userId, "batch_update", "user_state", {
      fieldsUpdated: Object.keys(updateFields),
      batchSize: metadata.batchSize,
      deviceId: metadata.deviceId,
    });

    res.status(200).json({
      message: "Batch sync successful",
      fieldsUpdated: Object.keys(updateFields),
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    });
  } catch (error) {
    console.error("Batch sync error:", error);
    logStateChange(
      req.auth.crymsonId,
      "batch_update",
      "user_state",
      { error: error.message },
      "failure"
    );
    res.status(500).json({
      message: "Batch sync failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

module.exports = {
  batchSync,
};
