const AcademicEvent = require('../models/AcademicEvent');

const DEFAULT_REMINDER_DELAY_MINUTES = 60;

function normalizeEvent(event) {
	return {
		id: event.id,
		userId: event.userId,
		subject: event.subject,
		title: event.title,
		taskType: event.taskType,
		dueAt: new Date(event.dueAt).toISOString(),
		reminderDelayMinutes: event.reminderDelayMinutes,
		acknowledgedAt: event.acknowledgedAt ? new Date(event.acknowledgedAt).toISOString() : '',
		createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : '',
		updatedAt: event.updatedAt ? new Date(event.updatedAt).toISOString() : '',
		sourceTaskId: event.sourceTaskId || '',
		notes: event.notes || ''
	};
}

function buildEventId() {
	return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function parseReminderDelay(value) {
	if (value === undefined || value === null || value === '') {
		return DEFAULT_REMINDER_DELAY_MINUTES;
	}

	const numeric = Number(value);
	if (!Number.isFinite(numeric)) {
		return DEFAULT_REMINDER_DELAY_MINUTES;
	}

	return Math.min(24 * 60, Math.max(1, Math.round(numeric)));
}

async function listAcademicEvents(req, res) {
	const userId = String(req.auth?.crymsonId || '').trim().toUpperCase();
	if (!userId) {
		return res.status(401).json({ message: 'Invalid session.' });
	}

	const events = await AcademicEvent.find({ userId })
		.sort({ dueAt: 1 })
		.lean();

	return res.status(200).json({ events: events.map(normalizeEvent) });
}

async function createAcademicEvent(req, res) {
	const userId = String(req.auth?.crymsonId || '').trim().toUpperCase();
	if (!userId) {
		return res.status(401).json({ message: 'Invalid session.' });
	}

	const payload = req.body || {};
	const subject = String(payload.subject || '').trim();
	const title = String(payload.title || '').trim();
	const taskType = String(payload.taskType || '').trim().toLowerCase();
	const dueAt = String(payload.dueAt || '').trim();
	const sourceTaskId = String(payload.sourceTaskId || '').trim();
	const notes = String(payload.notes || '').trim();
	const reminderDelayMinutes = parseReminderDelay(payload.reminderDelayMinutes);

	if (!subject) {
		return res.status(400).json({ message: 'subject is required.' });
	}

	if (!title) {
		return res.status(400).json({ message: 'title is required.' });
	}

	if (!dueAt || Number.isNaN(new Date(dueAt).getTime())) {
		return res.status(400).json({ message: 'dueAt must be a valid date and time.' });
	}

	if (!['test-1', 'test-2', 'submission-deadline', 'exam', 'exam-timetable'].includes(taskType)) {
		return res.status(400).json({ message: 'taskType must be test-1, test-2, submission-deadline, or exam-timetable.' });
	}

	const event = await AcademicEvent.create({
		id: buildEventId(),
		userId,
		subject,
		title,
		taskType,
		dueAt: new Date(dueAt),
		reminderDelayMinutes,
		acknowledgedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		sourceTaskId,
		notes
	});

	return res.status(201).json({
		message: 'Academic reminder saved.',
		event: normalizeEvent(event)
	});
}

async function acknowledgeAcademicEvent(req, res) {
	const userId = String(req.auth?.crymsonId || '').trim().toUpperCase();
	const eventId = String(req.params?.eventId || '').trim();

	if (!userId) {
		return res.status(401).json({ message: 'Invalid session.' });
	}

	if (!eventId) {
		return res.status(400).json({ message: 'eventId is required.' });
	}

	const event = await AcademicEvent.findOne({ id: eventId, userId });
	if (!event) {
		return res.status(404).json({ message: 'Academic reminder not found.' });
	}

	event.acknowledgedAt = new Date();
	event.updatedAt = new Date();
	await event.save();

	return res.status(200).json({
		message: 'Academic reminder acknowledged.',
		event: normalizeEvent(event)
	});
}

async function deleteAcademicEvent(req, res) {
	const userId = String(req.auth?.crymsonId || '').trim().toUpperCase();
	const eventId = String(req.params?.eventId || '').trim();

	if (!userId) {
		return res.status(401).json({ message: 'Invalid session.' });
	}

	if (!eventId) {
		return res.status(400).json({ message: 'eventId is required.' });
	}

	const deleted = await AcademicEvent.findOneAndDelete({ id: eventId, userId }).lean();

	if (!deleted) {
		return res.status(404).json({ message: 'Academic reminder not found.' });
	}
	return res.status(200).json({ message: 'Academic reminder deleted.' });
}

module.exports = {
	listAcademicEvents,
	createAcademicEvent,
	acknowledgeAcademicEvent,
	deleteAcademicEvent
};
