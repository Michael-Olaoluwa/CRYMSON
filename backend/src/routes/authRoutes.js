const express = require('express');
const { signup, login, getSession } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/session', requireAuth, getSession);

module.exports = router;
