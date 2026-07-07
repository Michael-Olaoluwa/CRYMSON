const express = require('express');
const { signup, login, getSession, setupFirstAdmin, searchUsers } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/session', requireAuth, getSession);
router.post('/setup-first-admin', setupFirstAdmin);
router.get('/users/search', requireAuth, searchUsers);

module.exports = router;
