const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { generateUniqueCrymsonId, generateAdminCrymsonId, isAdminId } = require('../utils/crymsonId');

const REQUIRED_SIGNUP_FIELDS = ['fullName', 'email', 'department', 'level', 'password'];
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRES_IN = '7d';

function sanitizeUser(user) {
  const isAdmin = isAdminId(user.crymsonId);
  return {
    crymsonId: user.crymsonId,
    fullName: user.fullName,
    email: user.email,
    department: user.department,
    level: user.level,
    isAdmin,
    createdAt: user.createdAt
  };
}

function createSessionToken(user) {
  const isAdmin = isAdminId(user.crymsonId);
  return jwt.sign({ crymsonId: user.crymsonId, isAdmin }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
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

  // If the app is in maintenance mode, block non-admin logins
  try {
    const maintenanceSetting = await Setting.findOne({ key: 'maintenance' }).lean().catch(() => null);
    if (maintenanceSetting && maintenanceSetting.value === true && !crymsonId.endsWith('A')) {
      return res.status(503).json({ message: 'App is under maintenance.' });
    }
  } catch (err) {
    // ignore errors reading settings and proceed
  }

  const user = await User.findOne({ crymsonId }).lean();

  if (!user) {
    return res.status(401).json({ message: 'Invalid Crymson ID or password.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid Crymson ID or password.' });
  }

  return res.status(200).json({
    message: 'Login successful.',
    token: createSessionToken(user),
    user: sanitizeUser(user)
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

async function searchUsers(req, res) {
  try {
    const raw = String(req.query.q || '').trim();
    if (raw.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const users = await User.find(
      { $or: [{ crymsonId: { $regex: regex } }, { fullName: { $regex: regex } }] },
      { crymsonId: 1, fullName: 1, department: 1, level: 1, _id: 0 }
    ).limit(20).lean();

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error.message);
    res.status(500).json({ error: 'Failed to search users' });
  }
}

async function setupFirstAdmin(req, res) {
  try {
    // Check if any admins exist
    const adminExists = await User.findOne({ crymsonId: /A$/ }).lean();
    if (adminExists) {
      return res.status(403).json({ message: 'Admin setup is only available when no admins exist.' });
    }

    const payload = req.body || {};
    const REQUIRED_FIELDS = ['fullName', 'email', 'department', 'level', 'password'];

    for (const field of REQUIRED_FIELDS) {
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
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const crymsonId = generateAdminCrymsonId();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      crymsonId,
      fullName: String(payload.fullName).trim(),
      email,
      department: String(payload.department).trim(),
      level: String(payload.level).trim(),
      passwordHash,
      createdAt: new Date()
    });

    return res.status(201).json({
      message: 'First admin created successfully.',
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create admin.', error: error.message });
  }
}

module.exports = {
  signup,
  login,
  getSession,
  setupFirstAdmin,
  searchUsers,
};
