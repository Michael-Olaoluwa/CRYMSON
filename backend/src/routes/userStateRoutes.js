const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getTaskState,
  putTaskState,
  getCgpaState,
  putCgpaState,
} = require('../controllers/userStateController');

const router = express.Router();

router.get('/tasks', requireAuth, getTaskState);
router.put('/tasks', requireAuth, putTaskState);
router.get('/cgpa', requireAuth, getCgpaState);
router.put('/cgpa', requireAuth, putCgpaState);

module.exports = router;
