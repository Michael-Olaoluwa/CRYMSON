const express = require('express');
const { listUsers, getUser, deleteUser, createUser } = require('../controllers/adminController');
const { getSettings, updateSettings } = require('../controllers/adminSettingsController');
const { listLogs } = require('../controllers/adminLogsController');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');

const router = express.Router();

// All admin routes require authentication and admin status
router.use(requireAuth);
router.use(requireAdmin);

// Create a new user (admin or regular)
router.post('/users', createUser);

// Get all users with pagination and search
router.get('/users', listUsers);

// Get a specific user
router.get('/users/:id', getUser);

// Delete a user
router.delete('/users/:id', deleteUser);

// Settings (feature flags, maintenance)
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Audit logs
router.get('/logs', listLogs);

module.exports = router;
