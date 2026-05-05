/**
 * backend/src/middleware/auditLog.js
 * Logs all backend state changes for compliance and debugging
 */

const fs = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Audit log entry structure
 */
class AuditEntry {
  constructor(userId, action, resource, changes, status) {
    this.timestamp = new Date().toISOString();
    this.userId = userId;
    this.action = action; // create, update, delete, read
    this.resource = resource; // tasks, cgpaState, timeSessions, finance, etc.
    this.changes = changes;
    this.status = status; // success, failure
    this.changeCount = Object.keys(changes).length;
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      userId: this.userId,
      action: this.action,
      resource: this.resource,
      changes: this.changes,
      status: this.status,
      changeCount: this.changeCount,
    };
  }
}

/**
 * Write audit log to file
 */
function writeAuditLog(entry) {
  const logFile = path.join(logDir, "audit.log");
  const logLine = JSON.stringify(entry.toJSON()) + "\n";
  fs.appendFileSync(logFile, logLine);
}

/**
 * Middleware to capture state changes
 */
function auditLogMiddleware(req, res, next) {
  // Store original send for response capture
  const originalSend = res.send;

  res.send = function (data) {
    // Capture response data
    res.auditData = data;
    res.send = originalSend;
    return res.send(data);
  };

  next();
}

/**
 * Log a state change
 */
function logStateChange(userId, action, resource, changes, status = "success") {
  const entry = new AuditEntry(userId, action, resource, changes, status);
  writeAuditLog(entry);

  // Also log to console in debug mode
  if (process.env.DEBUG_AUDIT) {
    console.log(`[AUDIT] ${userId} ${action} ${resource}:`, changes);
  }
}

/**
 * Get audit log entries (for admin/debugging)
 */
function getAuditLog(userId, limit = 100, offset = 0) {
  const logFile = path.join(logDir, "audit.log");

  if (!fs.existsSync(logFile)) {
    return [];
  }

  const lines = fs.readFileSync(logFile, "utf-8").split("\n");
  const entries = lines
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((entry) => entry && (!userId || entry.userId === userId))
    .reverse();

  return entries.slice(offset, offset + limit);
}

module.exports = {
  AuditEntry,
  auditLogMiddleware,
  logStateChange,
  getAuditLog,
};
