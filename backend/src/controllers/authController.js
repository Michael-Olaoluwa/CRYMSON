const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateUniqueCrymsonId } = require('../utils/crymsonId');
const {
  generateTokenPair,
  verifyRefreshToken,
} = require('../utils/tokenManager');

const REQUIRED_SIGNUP_FIELDS = ['fullName', 'email', 'department', 'level', 'password'];

function sanitizeUser(user) {
  return {
    crymsonId: user.crymsonId,
    fullName: user.fullName,
    email: user.email,
    department: user.department,
    level: user.level,
    createdAt: user.createdAt
  };
}

async function signup(req, res) {
  const payload = req.body || {};

  for (const field of REQUIRED_SIGNUP_FIELDS) {
    if (!String(payload[field] || '').trim()) {
      return res.status(400).json({ message: `${field} is required.` });
    }
  }

  const email = String(payload.email).trim().toLowerCase();
  const password = String(payload.password);

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const emailAlreadyUsed = await User.exists({ email });

  if (emailAlreadyUsed) {
    return res.status(409).json({ message: 'Email already in use. Please sign in instead.' });
  }

  const existingUsers = await User.find({}, { crymsonId: 1, _id: 0 }).lean();
  const crymsonId = generateUniqueCrymsonId(existingUsers);
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    crymsonId,
    fullName: String(payload.fullName).trim(),
    email,
    department: String(payload.department).trim(),
    level: String(payload.level).trim(),
    passwordHash,
    createdAt: new Date(),
  });

  return res.status(201).json({
    message: 'Account created successfully.',
    user: sanitizeUser(user)
  });
}

async function login(req, res) {
  const crymsonId = String(req.body?.crymsonId || '').trim().toUpperCase();
  const password = String(req.body?.password || '');

  if (!crymsonId || !password) {
    return res.status(400).json({ message: 'Crymson ID and password are required.' });
  }

  const user = await User.findOne({ crymsonId }).lean();

  if (!user) {
    return res.status(401).json({ message: 'Invalid Crymson ID or password.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid Crymson ID or password.' });
  }

  const { accessToken, refreshToken } = generateTokenPair(user.crymsonId);

  return res.status(200).json({
    message: 'Login successful.',
    token: accessToken,
    accessToken,
    refreshToken,
    user: sanitizeUser(user)
  });
}

async function refreshSession(req, res) {
  const refreshToken = String(req.body?.refreshToken || '').trim();

  if (!refreshToken) {
    return res.status(400).json({ message: 'refreshToken is required.' });
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded?.crymsonId) {
    return res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }

  const user = await User.findOne({ crymsonId: String(decoded.crymsonId).trim().toUpperCase() }).lean();

  if (!user) {
    return res.status(401).json({ message: 'Session user not found.' });
  }

  const { accessToken: nextAccessToken, refreshToken: nextRefreshToken } = generateTokenPair(user.crymsonId);

  return res.status(200).json({
    message: 'Session refreshed.',
    token: nextAccessToken,
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    user: sanitizeUser(user),
  });
}

async function getSession(req, res) {
  const crymsonId = String(req.auth?.crymsonId || '').trim().toUpperCase();

  if (!crymsonId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const user = await User.findOne({ crymsonId }).lean();

  if (!user) {
    return res.status(401).json({ message: 'Session user not found.' });
  }

  return res.status(200).json({
    message: 'Session is valid.',
    user: sanitizeUser(user)
  });
}

module.exports = {
  signup,
  login,
  getSession,
  refreshSession
};
