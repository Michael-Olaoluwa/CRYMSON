/**
 * backend/src/utils/tokenManager.js
 * Handles JWT and refresh token generation, validation, and rotation
 */

const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRY = "15m"; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = "7d"; // Long-lived refresh token

/**
 * Generate access and refresh tokens
 */
function generateTokenPair(crymsonId) {
  const accessToken = jwt.sign(
    { crymsonId, type: "access" },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { crymsonId, type: "refresh" },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET
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
