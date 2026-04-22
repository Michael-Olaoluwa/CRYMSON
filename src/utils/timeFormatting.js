export const formatClock = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export const toLocalDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};

export const getStudyStreakStats = (sessions, today = new Date()) => {
  const todayKey = toLocalDateKey(today);
  if (!todayKey || !Array.isArray(sessions) || sessions.length === 0) {
    return {
      currentStreakDays: 0,
      bestStreakDays: 0,
      activeDays: 0,
      lastStudyDateKey: null,
    };
  }

  const daySet = new Set();

  sessions.forEach((session) => {
    if ((Number(session?.durationSeconds) || 0) <= 0) {
      return;
    }

    const dayKey = toLocalDateKey(session?.startedAt);
    if (!dayKey || dayKey > todayKey) {
      return;
    }

    daySet.add(dayKey);
  });

  const sortedDays = [...daySet].sort();
  if (sortedDays.length === 0) {
    return {
      currentStreakDays: 0,
      bestStreakDays: 0,
      activeDays: 0,
      lastStudyDateKey: null,
    };
  }

  let bestStreakDays = 1;
  let runLength = 1;

  for (let index = 1; index < sortedDays.length; index += 1) {
    const previousDate = new Date(`${sortedDays[index - 1]}T00:00:00`);
    const currentDate = new Date(`${sortedDays[index]}T00:00:00`);
    const dayDifference = Math.round((currentDate - previousDate) / (24 * 60 * 60 * 1000));

    if (dayDifference === 1) {
      runLength += 1;
    } else {
      bestStreakDays = Math.max(bestStreakDays, runLength);
      runLength = 1;
    }
  }

  bestStreakDays = Math.max(bestStreakDays, runLength);

  let currentStreakDays = 0;
  const cursor = new Date(`${todayKey}T00:00:00`);

  while (true) {
    const cursorKey = toLocalDateKey(cursor);
    if (!cursorKey || !daySet.has(cursorKey)) {
      break;
    }

    currentStreakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    currentStreakDays,
    bestStreakDays,
    activeDays: sortedDays.length,
    lastStudyDateKey: sortedDays[sortedDays.length - 1],
  };
};
