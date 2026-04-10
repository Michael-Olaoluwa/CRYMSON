const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const AcademicEvent = require('../models/AcademicEvent');

const jsonDataFile = path.join(__dirname, '../../data/db.json');
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crymson';

async function migrateFromJsonIfNeeded() {
  try {
    const raw = await fs.readFile(jsonDataFile, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    const users = Array.isArray(parsed.users) ? parsed.users : [];
    const academicEvents = Array.isArray(parsed.academicEvents) ? parsed.academicEvents : [];

    let upsertedUsers = 0;
    let upsertedEvents = 0;

    if (users.length > 0) {
      const operations = users
        .map((user) => {
          const crymsonId = String(user.crymsonId || '').trim().toUpperCase();
          if (!crymsonId) return null;

          return {
            updateOne: {
              filter: { crymsonId },
              update: {
                $setOnInsert: {
                  crymsonId,
                  fullName: String(user.fullName || '').trim(),
                  email: String(user.email || '').trim().toLowerCase(),
                  department: String(user.department || '').trim(),
                  level: String(user.level || '').trim(),
                  passwordHash: String(user.passwordHash || ''),
                  createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
                },
              },
              upsert: true,
            },
          };
        })
        .filter(Boolean);

      if (operations.length > 0) {
        const result = await User.bulkWrite(operations, { ordered: false });
        upsertedUsers = result.upsertedCount || 0;
      }
    }

    if (academicEvents.length > 0) {
      const operations = academicEvents
        .map((event) => {
          const id = String(event.id || '').trim();
          if (!id) return null;

          return {
            updateOne: {
              filter: { id },
              update: {
                $setOnInsert: {
                  id,
                  userId: String(event.userId || '').trim().toUpperCase(),
                  subject: String(event.subject || '').trim(),
                  title: String(event.title || '').trim(),
                  taskType: String(event.taskType || '').trim().toLowerCase(),
                  dueAt: event.dueAt ? new Date(event.dueAt) : new Date(),
                  reminderDelayMinutes: Number(event.reminderDelayMinutes) || 60,
                  acknowledgedAt: event.acknowledgedAt ? new Date(event.acknowledgedAt) : null,
                  createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
                  updatedAt: event.updatedAt ? new Date(event.updatedAt) : new Date(),
                  sourceTaskId: String(event.sourceTaskId || '').trim(),
                  notes: String(event.notes || '').trim(),
                },
              },
              upsert: true,
            },
          };
        })
        .filter(Boolean);

      if (operations.length > 0) {
        const result = await AcademicEvent.bulkWrite(operations, { ordered: false });
        upsertedEvents = result.upsertedCount || 0;
      }
    }

    if (upsertedUsers > 0 || upsertedEvents > 0) {
      console.log(`JSON sync complete: +${upsertedUsers} users, +${upsertedEvents} academic events.`);
    }
  } catch (error) {
    console.warn('Skipping JSON migration:', error.message);
  }
}

async function initDb() {
  await mongoose.connect(mongoUri);
  await migrateFromJsonIfNeeded();
}

module.exports = {
  initDb,
};
