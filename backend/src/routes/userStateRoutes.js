const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getTaskState,
  putTaskState,
  getCgpaState,
  putCgpaState,
  getTimeSessionsState,
  putTimeSessionsState,
  getFinanceState,
  putFinanceState,
  getAllUserState,
  putAllUserState,
} = require('../controllers/userStateController');

const router = express.Router();

router.get('/tasks', requireAuth, getTaskState);
router.put('/tasks', requireAuth, putTaskState);
router.get('/cgpa', requireAuth, getCgpaState);
router.put('/cgpa', requireAuth, putCgpaState);
router.get('/time-sessions', requireAuth, getTimeSessionsState);
router.put('/time-sessions', requireAuth, putTimeSessionsState);
router.get('/finance', requireAuth, getFinanceState);
router.put('/finance', requireAuth, putFinanceState);
router.get('/all', requireAuth, getAllUserState);
router.put('/all', requireAuth, putAllUserState);

module.exports = router;
