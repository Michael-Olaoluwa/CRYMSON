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

function validateTimeSessions(sessions) {
  return Array.isArray(sessions);
}

function validateFinanceState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return false;
  }

  const entries = state.entries;
  const recurringPlans = state.recurringPlans;
  const prefs = state.prefs;

  if (!Array.isArray(entries) || !Array.isArray(recurringPlans)) {
    return false;
  }

  if (prefs !== null && (typeof prefs !== 'object' || Array.isArray(prefs))) {
    return false;
  }

  return true;
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

async function getTimeSessionsState(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const state = await UserState.findOne({ userId }).lean();
  return res.status(200).json({ sessions: Array.isArray(state?.timeSessions) ? state.timeSessions : [] });
}

async function putTimeSessionsState(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const sessions = req.body?.sessions;
  if (!validateTimeSessions(sessions)) {
    return res.status(400).json({ message: 'sessions must be an array.' });
  }

  await UserState.updateOne(
    { userId },
    { $set: { timeSessions: sessions, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true }
  );

  return res.status(200).json({ message: 'Time sessions saved.' });
}

async function getFinanceState(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const state = await UserState.findOne({ userId }).lean();
  const financeState = state?.financeState || {};

  return res.status(200).json({
    finance: {
      entries: Array.isArray(financeState.entries) ? financeState.entries : [],
      recurringPlans: Array.isArray(financeState.recurringPlans) ? financeState.recurringPlans : [],
      prefs: financeState.prefs && typeof financeState.prefs === 'object' ? financeState.prefs : null,
    },
  });
}

async function putFinanceState(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const finance = req.body?.finance;
  if (!validateFinanceState(finance)) {
    return res.status(400).json({ message: 'finance must include entries array, recurringPlans array, and optional prefs object.' });
  }

  await UserState.updateOne(
    { userId },
    {
      $set: {
        financeState: {
          entries: finance.entries,
          recurringPlans: finance.recurringPlans,
          prefs: finance.prefs || null,
        },
        updatedAt: new Date(),
      },
      $setOnInsert: { userId },
    },
    { upsert: true }
  );

  return res.status(200).json({ message: 'Finance state saved.' });
}

async function getAllUserState(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const state = await UserState.findOne({ userId }).lean();
  const financeState = state?.financeState || {};

  return res.status(200).json({
    data: {
      tasks: Array.isArray(state?.tasks) ? state.tasks : [],
      cgpaState: state?.cgpaState || null,
      timeSessions: Array.isArray(state?.timeSessions) ? state.timeSessions : [],
      finance: {
        entries: Array.isArray(financeState.entries) ? financeState.entries : [],
        recurringPlans: Array.isArray(financeState.recurringPlans) ? financeState.recurringPlans : [],
        prefs: financeState.prefs && typeof financeState.prefs === 'object' ? financeState.prefs : null,
      },
    },
  });
}

async function putAllUserState(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session.' });
  }

  const data = req.body?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ message: 'data must be an object.' });
  }

  const updatePayload = {
    updatedAt: new Date(),
  };

  if (Object.prototype.hasOwnProperty.call(data, 'tasks')) {
    if (!validateTasks(data.tasks)) {
      return res.status(400).json({ message: 'tasks must be an array.' });
    }
    updatePayload.tasks = data.tasks;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'cgpaState')) {
    if (data.cgpaState !== null && !validateCgpaState(data.cgpaState)) {
      return res.status(400).json({ message: 'cgpaState must be an object or null.' });
    }
    updatePayload.cgpaState = data.cgpaState;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'timeSessions')) {
    if (!validateTimeSessions(data.timeSessions)) {
      return res.status(400).json({ message: 'timeSessions must be an array.' });
    }
    updatePayload.timeSessions = data.timeSessions;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'finance')) {
    if (!validateFinanceState(data.finance)) {
      return res.status(400).json({ message: 'finance must include entries array, recurringPlans array, and optional prefs object.' });
    }

    updatePayload.financeState = {
      entries: data.finance.entries,
      recurringPlans: data.finance.recurringPlans,
      prefs: data.finance.prefs || null,
    };
  }

  await UserState.updateOne(
    { userId },
    { $set: updatePayload, $setOnInsert: { userId } },
    { upsert: true }
  );

  return res.status(200).json({ message: 'User state saved.' });
}

module.exports = {
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
};
