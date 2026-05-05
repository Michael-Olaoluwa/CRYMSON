const express = require('express');
const { signup, login, getSession, refreshSession } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { rateLimitMiddleware } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/signup', rateLimitMiddleware('signup'), signup);
router.post('/login', rateLimitMiddleware('login'), login);
router.post('/refresh', refreshSession);
router.get('/session', requireAuth, getSession);

module.exports = router;
