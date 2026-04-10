const UserState = require('../models/UserState');

function getUserId(req) {
  return String(req.auth?.crymsonId || '').trim().toUpperCase();
}

function validateTasks(tasks) {
  return Array.isArray(tasks);
}

function validateCgpaState(state) {
  return state && typeof state === 'object' && !Array.isArray(state);
}

async function getTaskState(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const state = await UserState.findOne({ userId }).lean();
  return res.status(200).json({ tasks: Array.isArray(state?.tasks) ? state.tasks : [] });
}

async function putTaskState(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const tasks = req.body?.tasks;
  if (!validateTasks(tasks)) {
    return res.status(400).json({ message: 'tasks must be an array.' });
  }

  await UserState.updateOne(
    { userId },
    { $set: { tasks, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true }
  );

  return res.status(200).json({ message: 'Task state saved.' });
}

async function getCgpaState(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const state = await UserState.findOne({ userId }).lean();
  return res.status(200).json({ state: state?.cgpaState || null });
}

async function putCgpaState(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const state = req.body?.state;
  if (!validateCgpaState(state)) {
    return res.status(400).json({ message: 'state must be an object.' });
  }

  await UserState.updateOne(
    { userId },
    { $set: { cgpaState: state, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true }
  );

  return res.status(200).json({ message: 'CGPA state saved.' });
}

module.exports = {
  getTaskState,
  putTaskState,
  getCgpaState,
  putCgpaState,
};
