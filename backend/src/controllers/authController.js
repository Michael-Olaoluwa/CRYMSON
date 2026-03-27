const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { generateUniqueCrymsonId } = require('../utils/crymsonId');

const REQUIRED_SIGNUP_FIELDS = ['fullName', 'email', 'department', 'level', 'password'];
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const TOKEN_EXPIRES_IN = '7d';

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

function createSessionToken(user) {
  return jwt.sign({ crymsonId: user.crymsonId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
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

  await db.read();
  const users = db.data.users;
  const emailAlreadyUsed = users.some((user) => String(user.email).toLowerCase() === email);

  if (emailAlreadyUsed) {
    return res.status(409).json({ message: 'Email already in use. Please sign in instead.' });
  }

  const crymsonId = generateUniqueCrymsonId(users);
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    crymsonId,
    fullName: String(payload.fullName).trim(),
    email,
    department: String(payload.department).trim(),
    level: String(payload.level).trim(),
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  await db.write();

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

  await db.read();
  const user = db.data.users.find(
    (item) => String(item.crymsonId || '').toUpperCase() === crymsonId
  );

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

  await db.read();
  const user = db.data.users.find(
    (item) => String(item.crymsonId || '').toUpperCase() === crymsonId
  );

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
  getSession
};
