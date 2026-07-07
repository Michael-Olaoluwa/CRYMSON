const SCORE_HISTORY_KEY_BASE = 'crymson_score_history';

const TIERS = [
  { min: 0, max: 39, id: 'bronze', label: 'Bronze', color: '#cd7f32', icon: 'B' },
  { min: 40, max: 59, id: 'silver', label: 'Silver', color: '#a0aec0', icon: 'S' },
  { min: 60, max: 79, id: 'gold', label: 'Gold', color: '#f59e0b', icon: 'G' },
  { min: 80, max: 100, id: 'crimson-elite', label: 'Crimson Elite', color: '#dc2626', icon: 'CE' },
];

export function getTier(score) {
  for (const tier of TIERS) {
    if (score >= tier.min && score <= tier.max) return tier;
  }
  return TIERS[0];
}

export function getNextTier(score) {
  for (let i = 0; i < TIERS.length; i++) {
    if (score <= TIERS[i].max) {
      return i < TIERS.length - 1 ? TIERS[i + 1] : null;
    }
  }
  return null;
}

export function computeCrymsonScore({
  cgpaSummary,
  dashboardTaskStats,
  dashboardStudyStats,
  financeSummary,
  wellbeingCheckIns,
  userId,
}) {
  const cgpa = computeCgpaScore(cgpaSummary);
  const study = computeStudyScore(dashboardStudyStats);
  const tasks = computeTaskScore(dashboardTaskStats);
  const finance = computeFinanceScore(financeSummary);
  const wellbeing = computeWellbeingScore(wellbeingCheckIns);

  const total = Math.min(100, Math.round(cgpa.score + study.score + tasks.score + finance.score + wellbeing.score));
  const tier = getTier(total);
  const nextTier = getNextTier(total);
  const pointsToNextTier = nextTier ? nextTier.min - total : 0;

  const dimensions = { cgpa, study, tasks, finance, wellbeing };

  const weekOverWeek = computeWeekOverWeek(total, userId);

  const snapshot = {
    date: new Date().toISOString(),
    score: total,
    tier: tier.id,
    dimensions: Object.fromEntries(
      Object.entries(dimensions).map(([k, v]) => [k, { score: v.score, max: v.max }])
    ),
  };
  saveScoreSnapshot(snapshot, userId);

  return {
    score: total,
    tier,
    nextTier,
    pointsToNextTier,
    dimensions,
    weekOverWeek,
  };
}

function computeCgpaScore(cgpaSummary) {
  const current = cgpaSummary?.currentCgpa;
  const goal = cgpaSummary?.goalCgpa;
  if (current === null || current === undefined || current <= 0) {
    return { score: 0, max: 25, percent: 0, label: 'CGPA Progress', detail: 'No grades entered yet' };
  }
  if (goal && goal > 0) {
    const ratio = Math.min(1, current / goal);
    return { score: Math.round(ratio * 25 * 10) / 10, max: 25, percent: Math.round(ratio * 100), label: 'CGPA Progress', detail: `${current.toFixed(2)} / ${goal.toFixed(2)}` };
  }
  const ratio = current / 5;
  return { score: Math.round(ratio * 25 * 0.75 * 10) / 10, max: 25, percent: Math.round(ratio * 75), label: 'CGPA Progress', detail: `${current.toFixed(2)} / — (set a goal)` };
}

function computeStudyScore(dashboardStudyStats) {
  if (!dashboardStudyStats) {
    return { score: 0, max: 20, percent: 0, label: 'Study Consistency', detail: 'No study data' };
  }
  const { weekSeconds, currentStreakDays } = dashboardStudyStats;
  const weeklyHours = weekSeconds / 3600;
  const weeklyPts = Math.min(10, Math.round((weeklyHours / 5) * 10 * 10) / 10);
  const streakPts = Math.min(10, Math.round(currentStreakDays * 0.5 * 10) / 10);
  return { score: weeklyPts + streakPts, max: 20, percent: Math.round(((weeklyPts + streakPts) / 20) * 100), label: 'Study Consistency', detail: `${weeklyHours.toFixed(1)}h this week · ${currentStreakDays}d streak` };
}

function computeTaskScore(dashboardTaskStats) {
  if (!dashboardTaskStats || dashboardTaskStats.total === 0) {
    return { score: 0, max: 20, percent: 0, label: 'Task Completion', detail: 'No tasks created' };
  }
  const score = Math.round((dashboardTaskStats.completionRate / 100) * 20 * 10) / 10;
  return { score, max: 20, percent: dashboardTaskStats.completionRate, label: 'Task Completion', detail: `${dashboardTaskStats.completed} / ${dashboardTaskStats.total} done` };
}

function computeFinanceScore(financeSummary) {
  if (!financeSummary || financeSummary.totalEntries === 0) {
    return { score: 0, max: 20, percent: 0, label: 'Financial Discipline', detail: 'No entries tracked' };
  }

  const { monthIncome, monthExpense, progressPercent, savingsGoalAmount } = financeSummary;

  let ratioPts = 0;
  if (monthIncome > 0 || monthExpense > 0) {
    const ratio = monthIncome / Math.max(1, monthExpense);
    ratioPts = Math.min(10, Math.round((ratio / 2) * 10 * 10) / 10);
  }

  let goalPts = 0;
  if (savingsGoalAmount > 0) {
    goalPts = Math.min(10, Math.round((progressPercent / 100) * 10 * 10) / 10);
  }

  const total = Math.round((ratioPts + goalPts) * 10) / 10;
  const maxPossible = monthIncome > 0 || monthExpense > 0 ? (savingsGoalAmount > 0 ? 20 : 10) : 0;
  const effectiveMax = Math.max(maxPossible, 20);
  return { score: total, max: 20, percent: Math.round((total / 20) * 100), label: 'Financial Discipline', detail: savingsGoalAmount > 0 ? `${progressPercent}% to savings goal` : `${monthIncome > 0 || monthExpense > 0 ? 'Income/expense tracked' : 'No tracking'}` };
}

function computeWellbeingScore(wellbeingCheckIns) {
  if (!wellbeingCheckIns || wellbeingCheckIns.length === 0) {
    return { score: 0, max: 15, percent: 0, label: 'Wellbeing', detail: 'No check-ins yet' };
  }
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = wellbeingCheckIns.filter((c) => {
    const d = new Date(c.date || c.createdAt || 0);
    return d >= thirtyDaysAgo;
  });
  const uniqueDays = new Set(recent.map((c) => (c.date || c.createdAt || '').slice(0, 10)).filter(Boolean));
  const ratio = Math.min(1, uniqueDays.size / 30);
  return { score: Math.round(ratio * 15 * 10) / 10, max: 15, percent: Math.round(ratio * 100), label: 'Wellbeing', detail: `${uniqueDays.size} / 30 days checked in` };
}

function getHistoryKey(userId) {
  return `${SCORE_HISTORY_KEY_BASE}:${userId || 'guest'}`;
}

export function getScoreHistory(userId) {
  try {
    const raw = localStorage.getItem(getHistoryKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveScoreSnapshot(snapshot, userId) {
  try {
    const history = getScoreHistory(userId);
    const weekKey = snapshot.date.slice(0, 10);
    const existingIndex = history.findIndex((h) => h.date.slice(0, 10) === weekKey);
    if (existingIndex >= 0) {
      history[existingIndex] = snapshot;
    } else {
      history.push(snapshot);
    }
    history.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(getHistoryKey(userId), JSON.stringify(history));
  } catch {
    // localStorage full or unavailable — skip
  }
}

function computeWeekOverWeek(currentScore, userId) {
  try {
    const history = getScoreHistory(userId);
    if (history.length < 2) return null;
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const prev = sorted[sorted.length - 2];
    if (!prev) return null;
    const diff = currentScore - prev.score;
    return {
      previousScore: prev.score,
      change: diff >= 0 ? `+${diff}` : `${diff}`,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
    };
  } catch {
    return null;
  }
}
