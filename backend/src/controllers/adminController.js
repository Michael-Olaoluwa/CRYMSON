const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateUniqueCrymsonId, generateAdminCrymsonId, isAdminId } = require('../utils/crymsonId');

async function listUsers(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim().toLowerCase();

    let filter = {};
    if (search) {
      filter = {
        $or: [
          { crymsonId: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const [users, total] = await Promise.all([
      User.find(filter, {
        crymsonId: 1,
        fullName: 1,
        email: 1,
        department: 1,
        level: 1,
        createdAt: 1,
        _id: 0
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    return res.status(200).json({
      message: 'Users retrieved successfully.',
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve users.', error: error.message });
  }
}

async function getUser(req, res) {
  try {
    const crymsonId = String(req.params.id || '').trim().toUpperCase();

    if (!crymsonId) {
      return res.status(400).json({ message: 'Crymson ID is required.' });
    }

    const user = await User.findOne({ crymsonId }, {
      crymsonId: 1,
      fullName: 1,
      email: 1,
      department: 1,
      level: 1,
      createdAt: 1,
      _id: 0
    }).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      message: 'User retrieved successfully.',
      user
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve user.', error: error.message });
  }
}

async function deleteUser(req, res) {
  try {
    const crymsonId = String(req.params.id || '').trim().toUpperCase();

    if (!crymsonId) {
      return res.status(400).json({ message: 'Crymson ID is required.' });
    }

    const result = await User.deleteOne({ crymsonId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      message: 'User deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete user.', error: error.message });
  }
}

async function createUser(req, res) {
  try {
    const payload = req.body || {};
    const REQUIRED_FIELDS = ['fullName', 'email', 'department', 'level', 'password'];

    for (const field of REQUIRED_FIELDS) {
      if (!String(payload[field] || '').trim()) {
        return res.status(400).json({ message: `${field} is required.` });
      }
    }

    const email = String(payload.email).trim().toLowerCase();
    const password = String(payload.password);
    const isAdmin = Boolean(payload.isAdmin);

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const emailAlreadyUsed = await User.exists({ email });
    if (emailAlreadyUsed) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const existingUsers = await User.find({}, { crymsonId: 1, _id: 0 }).lean();
    const crymsonId = isAdmin ? generateAdminCrymsonId() : generateUniqueCrymsonId(existingUsers);
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
      message: 'User created successfully.',
      user: {
        crymsonId: user.crymsonId,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        level: user.level,
        isAdmin: isAdminId(user.crymsonId),
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create user.', error: error.message });
  }
}

module.exports = {
  listUsers,
  getUser,
  deleteUser,
  createUser
};
