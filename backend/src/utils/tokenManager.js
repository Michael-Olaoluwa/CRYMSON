/**
 * backend/src/utils/tokenManager.js
 * Handles JWT and refresh token generation, validation, and rotation
 */

const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRY = "15m"; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = "7d"; // Long-lived refresh token
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;

/**
 * Generate access and refresh tokens
 */
function generateTokenPair(crymsonId) {
  const accessToken = jwt.sign(
    { crymsonId, type: "access" },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { crymsonId, type: "refresh" },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(
      token,
      REFRESH_TOKEN_SECRET
    );
    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Decode token without verification (for debugging)
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

module.exports = {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
};
