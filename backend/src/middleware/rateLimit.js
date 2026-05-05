/**
 * backend/src/middleware/rateLimit.js
 * Rate limiting for auth endpoints to prevent brute force attacks
 */

const fs = require("fs");
const path = require("path");

// In-memory store (in production, use Redis)
const attemptLog = {};
const CLEANUP_INTERVAL = 60000; // 1 minute

// Rate limit config
const CONFIG = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

// Periodic cleanup of old entries
setInterval(() => {
  const now = Date.now();
  Object.keys(attemptLog).forEach((key) => {
    attemptLog[key] = attemptLog[key].filter((t) => now - t < 60 * 60 * 1000);
    if (attemptLog[key].length === 0) {
      delete attemptLog[key];
    }
  });
}, CLEANUP_INTERVAL);

/**
 * Rate limit middleware factory
 */
function rateLimitMiddleware(endpoint) {
  return (req, res, next) => {
    const config = CONFIG[endpoint];
    if (!config) {
      return next();
    }

    // Use IP + user identifier (email or crymsonId from body)
    const identifier =
      req.body.email ||
      req.body.crymsonId ||
      req.ip;
    const key = `${endpoint}:${identifier}`;

    const now = Date.now();

    // Initialize if needed
    if (!attemptLog[key]) {
      attemptLog[key] = [];
    }

    // Remove old attempts outside the window
    attemptLog[key] = attemptLog[key].filter(
      (timestamp) => now - timestamp < config.windowMs
    );

    // Check if limit exceeded
    if (attemptLog[key].length >= config.maxAttempts) {
      return res.status(429).json({
        message: `Too many ${endpoint} attempts. Please try again after ${Math.ceil(config.windowMs / 60000)} minutes.`,
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    }

    // Add current attempt
    attemptLog[key].push(now);

    // Log attempt for audit
    logAttempt(endpoint, identifier, false);

    next();
  };
}

/**
 * Reset rate limit for successful login (optional)
 */
function resetRateLimit(endpoint, identifier) {
  const key = `${endpoint}:${identifier}`;
  delete attemptLog[key];
}

/**
 * Audit logging function
 */
function logAttempt(endpoint, identifier, success) {
  const logDir = path.join(__dirname, "../../logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, "auth.log");
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({
    timestamp,
    endpoint,
    identifier: identifier.substring(0, 20), // Hide sensitive info
    success,
  });

  fs.appendFileSync(logFile, logEntry + "\n");
}

module.exports = {
  rateLimitMiddleware,
  resetRateLimit,
  logAttempt,
};
