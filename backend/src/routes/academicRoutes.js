const express = require('express');
const {
	listAcademicEvents,
	createAcademicEvent,
	acknowledgeAcademicEvent,
	deleteAcademicEvent
} = require('../controllers/academicController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listAcademicEvents);
router.post('/', requireAuth, createAcademicEvent);
router.patch('/:eventId/acknowledge', requireAuth, acknowledgeAcademicEvent);
router.delete('/:eventId', requireAuth, deleteAcademicEvent);

module.exports = router;
