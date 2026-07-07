function computeWellbeingStreak(checkIns, today = new Date()) {
  if (!checkIns || checkIns.length === 0) {
    return { currentStreak: 0, bestStreak: 0, totalCheckIns: 0, activeDays: 0 };
  }

  const dateKeys = new Set();
  for (const c of checkIns) {
    const key = (c.date || c.createdAt || '').slice(0, 10);
    if (key) dateKeys.add(key);
  }

  const sorted = [...dateKeys].sort();
  let bestStreak = 0;
  let currentRun = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr - prev) / 86400000;
    if (Math.round(diff) === 1) {
      currentRun++;
    } else {
      bestStreak = Math.max(bestStreak, currentRun);
      currentRun = 1;
    }
  }
  bestStreak = Math.max(bestStreak, currentRun);

  const todayKey = today.toISOString().slice(0, 10);
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const expected = new Date(todayKey);
    expected.setDate(expected.getDate() - currentStreak);
    const expectedKey = expected.toISOString().slice(0, 10);
    if (sorted[i] === expectedKey) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    bestStreak,
    totalCheckIns: checkIns.length,
    activeDays: dateKeys.size,
  };
}

function detectPeakHours(checkIns) {
  if (!checkIns || checkIns.length < 3) {
    return { slots: [], message: 'Not enough check-ins to detect patterns (need at least 3).' };
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const slotAverages = {};

  for (const c of checkIns) {
    const dateStr = c.date || c.createdAt || '';
    if (!dateStr) continue;
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay();
    const hour = d.getHours();
    const slotKey = `${dayOfWeek}-${Math.floor(hour / 4)}`;
    if (!slotAverages[slotKey]) {
      slotAverages[slotKey] = { dayOfWeek, hourSlot: Math.floor(hour / 4), energies: [], moods: [], count: 0 };
    }
    if (typeof c.energy === 'number') slotAverages[slotKey].energies.push(c.energy);
    if (typeof c.mood === 'number') slotAverages[slotKey].moods.push(c.mood);
    slotAverages[slotKey].count++;
  }

  const slots = Object.values(slotAverages)
    .filter((s) => s.energies.length >= 2)
    .map((s) => {
      const avgEnergy = s.energies.reduce((a, b) => a + b, 0) / s.energies.length;
      const avgMood = s.moods.length > 0 ? s.moods.reduce((a, b) => a + b, 0) / s.moods.length : 0;
      const hourRanges = ['00:00–04:00', '04:00–08:00', '08:00–12:00', '12:00–16:00', '16:00–20:00', '20:00–00:00'];
      return {
        day: dayNames[s.dayOfWeek],
        dayIndex: s.dayOfWeek,
        hourSlot: s.hourSlot,
        timeRange: hourRanges[s.hourSlot] || `${s.hourSlot * 4}:00`,
        avgEnergy: Math.round(avgEnergy * 10) / 10,
        avgMood: Math.round(avgMood * 10) / 10,
        sampleSize: s.count,
      };
    })
    .sort((a, b) => b.avgEnergy - a.avgEnergy);

  const peak = slots.slice(0, 3);
  return { slots, peak };
}

function correlateWithStudyQuality(checkIns, studyCheckIns) {
  if (!checkIns || checkIns.length < 3 || !studyCheckIns || studyCheckIns.length === 0) {
    return { correlation: null, message: 'Not enough data for correlation.' };
  }

  const dayMap = {};
  for (const c of checkIns) {
    const key = (c.date || c.createdAt || '').slice(0, 10);
    if (!key) continue;
    if (!dayMap[key]) dayMap[key] = { moods: [], energies: [] };
    if (typeof c.mood === 'number') dayMap[key].moods.push(c.mood);
    if (typeof c.energy === 'number') dayMap[key].energies.push(c.energy);
  }

  const studyByDay = {};
  for (const s of studyCheckIns) {
    const key = (s.createdAt || '').slice(0, 10);
    if (!key) continue;
    if (!studyByDay[key]) studyByDay[key] = { minutes: 0, count: 0, studiedCount: 0 };
    studyByDay[key].minutes += Number(s.minutesStudied) || 0;
    studyByDay[key].count++;
    if (s.studied) studyByDay[key].studiedCount++;
  }

  const days = Object.keys(dayMap).filter((k) => studyByDay[k]);
  if (days.length < 3) {
    return { correlation: null, message: 'Need at least 3 days with both check-in and study data.' };
  }

  const highEnergyDays = days.filter((d) => {
    const avgEnergy = dayMap[d].energies.reduce((a, b) => a + b, 0) / dayMap[d].energies.length;
    return avgEnergy >= 3.5;
  });

  const lowEnergyDays = days.filter((d) => {
    const avgEnergy = dayMap[d].energies.reduce((a, b) => a + b, 0) / dayMap[d].energies.length;
    return avgEnergy < 3.5;
  });

  const highEnergyAvgMinutes = highEnergyDays.length > 0
    ? Math.round(highEnergyDays.reduce((s, d) => s + studyByDay[d].minutes, 0) / highEnergyDays.length)
    : 0;

  const lowEnergyAvgMinutes = lowEnergyDays.length > 0
    ? Math.round(lowEnergyDays.reduce((s, d) => s + studyByDay[d].minutes, 0) / lowEnergyDays.length)
    : 0;

  const highEnergyAvgStudied = highEnergyDays.length > 0
    ? Math.round(highEnergyDays.reduce((s, d) => s + studyByDay[d].studiedCount, 0) / highEnergyDays.length * 10) / 10
    : 0;

  const lowEnergyAvgStudied = lowEnergyDays.length > 0
    ? Math.round(lowEnergyDays.reduce((s, d) => s + studyByDay[d].studiedCount, 0) / lowEnergyDays.length * 10) / 10
    : 0;

  return {
    correlation: {
      highEnergyDays: highEnergyDays.length,
      lowEnergyDays: lowEnergyDays.length,
      highEnergyAvgMinutes,
      lowEnergyAvgMinutes,
      highEnergyAvgStudied,
      lowEnergyAvgStudied,
      insight: highEnergyAvgMinutes > lowEnergyAvgMinutes
        ? 'Higher energy days tend to have more study minutes.'
        : 'Energy level does not significantly affect study duration.',
    },
  };
}

function computeWeeklySummary(checkIns, today = new Date()) {
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekCheckIns = (checkIns || []).filter((c) => {
    const d = new Date(c.date || c.createdAt || 0);
    return d >= weekStart && d < weekEnd;
  });

  if (weekCheckIns.length === 0) {
    return { daysCheckedIn: 0, avgMood: null, avgEnergy: null, days: [] };
  }

  const days = weekCheckIns.map((c) => ({
    date: (c.date || c.createdAt || '').slice(0, 10),
    mood: c.mood,
    energy: c.energy,
  }));

  const avgMood = Math.round(days.reduce((s, d) => s + (d.mood || 0), 0) / days.length * 10) / 10;
  const avgEnergy = Math.round(days.reduce((s, d) => s + (d.energy || 0), 0) / days.length * 10) / 10;

  return {
    daysCheckedIn: weekCheckIns.length,
    avgMood,
    avgEnergy,
    days,
  };
}

module.exports = {
  computeWellbeingStreak,
  detectPeakHours,
  correlateWithStudyQuality,
  computeWeeklySummary,
};
