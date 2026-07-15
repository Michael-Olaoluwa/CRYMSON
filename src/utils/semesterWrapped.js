import { computeCrymsonScore, getTier } from './crymsonScore';
import { getStudyStreakStats } from './timeFormatting';
import { getGradePoint, calcFinalScore } from './academicEngine';

const CGPA_KEY_BASE = 'crymson_user_cgpa_state_v1';
const TASKS_KEY_BASE = 'crymson_todo_tasks';
const SESSIONS_KEY_BASE = 'crymson_time_tracker_sessions';
const FINANCE_KEY_BASE = 'crymson_finance_entries';

const SEMESTER_WEEKS = 17;
const SEMESTER_DAYS = SEMESTER_WEEKS * 7;

function getLocalJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function calcCgpa(courses) {
  let totalUnits = 0, totalWeighted = 0;
  for (const c of courses || []) {
    const units = Number(c.creditUnits);
    const finalScore = calcFinalScore(c);
    const gp = Number.isFinite(finalScore) ? getGradePoint(finalScore) : null;
    if (Number.isFinite(units) && units > 0 && gp !== null) {
      totalUnits += units;
      totalWeighted += units * gp;
    }
  }
  return totalUnits > 0 ? totalWeighted / totalUnits : null;
}

export function computeSemesterWrapped(userId) {
  if (!userId) return null;

  const cgpaRaw = getLocalJson(`${CGPA_KEY_BASE}:${userId}`);
  const courses = cgpaRaw?.courses || [];
  const currentSemester = Number(cgpaRaw?.currentSemester) || 1;
  const totalSemesters = Number(cgpaRaw?.totalSemesters) || 8;
  const previousSemesters = cgpaRaw?.previousSemesters || [];
  const goalCgpa = Number.isFinite(Number(cgpaRaw?.goalCgpa)) ? Math.min(5, Math.max(0, Number(cgpaRaw.goalCgpa))) : null;

  const currentCgpa = calcCgpa(courses) || cgpaRaw?.cgpa || null;

  const semesterHistory = buildSemesterHistory(previousSemesters, currentSemester, currentCgpa);

  const estimatedSemesterStart = new Date();
  estimatedSemesterStart.setDate(estimatedSemesterStart.getDate() - SEMESTER_DAYS);

  const tasks = getLocalJson(`${TASKS_KEY_BASE}:${userId}`) || [];
  const sessions = getLocalJson(`${SESSIONS_KEY_BASE}:${userId}`) || [];
  const financeEntries = getLocalJson(`${FINANCE_KEY_BASE}:${userId}`) || [];

  const semesterSessions = sessions.filter((s) => {
    const d = new Date(s.startedAt || 0);
    return d >= estimatedSemesterStart;
  });

  const semesterTasks = tasks.filter((t) => {
    const d = new Date(t.createdAt || t.dueAt || 0);
    return d >= estimatedSemesterStart;
  });

  const semesterFinance = financeEntries.filter((e) => {
    const d = new Date(e.date || e.createdAt || 0);
    return d >= estimatedSemesterStart;
  });

  const totalStudySeconds = semesterSessions.reduce((s, e) => s + (Number(e.durationSeconds) || 0), 0);
  const totalStudyHours = Math.round((totalStudySeconds / 3600) * 10) / 10;

  const totalTasks = semesterTasks.length;
  const completedTasks = semesterTasks.filter((t) => t.completed).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalIncome = semesterFinance.filter((e) => e.kind === 'income').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalExpense = semesterFinance.filter((e) => e.kind === 'expense').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netSavings = totalIncome - totalExpense;

  const weeklyBreakdown = buildWeeklyBreakdown(semesterSessions, estimatedSemesterStart);
  const mostProductiveWeek = weeklyBreakdown.length > 0
    ? weeklyBreakdown.reduce((best, w) => (w.seconds > best.seconds ? w : best))
    : null;

  const courseStudyTime = {};
  for (const s of semesterSessions) {
    const tag = (s.courseTag || 'General Study').trim();
    courseStudyTime[tag] = (courseStudyTime[tag] || 0) + (Number(s.durationSeconds) || 0);
  }
  const topCourse = Object.entries(courseStudyTime).sort((a, b) => b[1] - a[1])[0] || null;

  const streakStats = getStudyStreakStats(semesterSessions);
  const bestStreak = streakStats.bestStreakDays;

  const totalCheckIns = getLocalJson(`crymson_wellbeing_checkins:${userId}`);
  const wellbeingDays = Array.isArray(totalCheckIns)
    ? totalCheckIns.filter((c) => {
        const d = new Date(c.date || c.createdAt || 0);
        return d >= estimatedSemesterStart;
      }).length
    : 0;

  const scoreResult = computeCrymsonScore({
    cgpaSummary: { currentCgpa, goalCgpa, progress: currentCgpa !== null && goalCgpa > 0 ? (currentCgpa / goalCgpa) * 100 : null },
    dashboardTaskStats: { total: totalTasks, completed: completedTasks, completionRate: taskCompletionRate },
    dashboardStudyStats: { weekSeconds: totalStudySeconds, currentStreakDays: streakStats.currentStreakDays },
    financeSummary: { totalEntries: semesterFinance.length, monthIncome: totalIncome, monthExpense: totalExpense, progressPercent: 0, savingsGoalAmount: 0 },
    wellbeingCheckIns: Array.isArray(totalCheckIns) ? totalCheckIns : [],
    userId,
  });

  const semesterLabel = `Semester ${currentSemester}`;

  return {
    semesterLabel,
    semesterNumber: currentSemester,
    totalSemesters,
    cgpa: { current: currentCgpa },
    cgpaMovement: computeCgpaMovement(semesterHistory),
    semesterHistory,
    study: { totalHours: totalStudyHours, totalSeconds: totalStudySeconds, bestStreak },
    tasks: { total: totalTasks, completed: completedTasks, rate: taskCompletionRate },
    finance: { totalIncome, totalExpense, netSavings },
    wellbeing: { totalCheckIns: wellbeingDays },
    score: { total: scoreResult.score, tier: scoreResult.tier },
    topCourse: topCourse ? { name: topCourse[0], hours: Math.round((topCourse[1] / 3600) * 10) / 10 } : null,
    mostProductiveWeek: mostProductiveWeek
      ? { weekNumber: mostProductiveWeek.weekNumber, hours: Math.round((mostProductiveWeek.seconds / 3600) * 10) / 10, date: mostProductiveWeek.startDate }
      : null,
    courseBreakdown: Object.entries(courseStudyTime)
      .map(([name, secs]) => ({ name, hours: Math.round((secs / 3600) * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours),
  };
}

function buildSemesterHistory(previousSemesters, currentSemester, currentCgpa) {
  const history = [];
  for (const s of previousSemesters || []) {
    const sem = Number(s.semester);
    const cgpa = Number(s.cgpa);
    if (Number.isFinite(sem) && Number.isFinite(cgpa)) {
      history.push({ semester: sem, cgpa });
    }
  }
  if (currentCgpa !== null) {
    const exists = history.some((h) => h.semester === currentSemester);
    if (!exists) history.push({ semester: currentSemester, cgpa: currentCgpa });
  }
  history.sort((a, b) => a.semester - b.semester);
  return history;
}

function computeCgpaMovement(history) {
  if (history.length < 2) return { change: null, from: null, to: null };
  const first = history[0];
  const last = history[history.length - 1];
  return { change: Math.round((last.cgpa - first.cgpa) * 100) / 100, from: first.cgpa, to: last.cgpa };
}

function buildWeeklyBreakdown(sessions, semesterStart) {
  const weeks = {};
  for (const s of sessions) {
    const d = new Date(s.startedAt || 0);
    if (!Number.isFinite(d.getTime())) continue;
    const weekIndex = Math.floor((d - semesterStart) / (7 * 86400000));
    if (weekIndex < 0 || weekIndex > SEMESTER_WEEKS) continue;
    if (!weeks[weekIndex]) {
      const weekStart = new Date(semesterStart);
      weekStart.setDate(weekStart.getDate() + weekIndex * 7);
      weeks[weekIndex] = { weekNumber: weekIndex + 1, seconds: 0, startDate: weekStart.toISOString().slice(0, 10) };
    }
    weeks[weekIndex].seconds += Number(s.durationSeconds) || 0;
  }
  return Object.values(weeks).sort((a, b) => a.weekNumber - b.weekNumber);
}

export function generateShareText(wrapped) {
  if (!wrapped) return '';
  const lines = [
    `🎓 ${wrapped.semesterLabel} — Crymson Wrapped`,
    '',
  ];
  if (wrapped.cgpa.current !== null) {
    const move = wrapped.cgpaMovement;
    if (move.change !== null) {
      lines.push(`📊 CGPA: ${move.from.toFixed(2)} → ${move.to.toFixed(2)} (${move.change >= 0 ? '+' : ''}${move.change.toFixed(2)})`);
    } else {
      lines.push(`📊 CGPA: ${wrapped.cgpa.current.toFixed(2)}`);
    }
  }
  lines.push(`📚 ${wrapped.study.totalHours}h studied`);
  if (wrapped.tasks.total > 0) lines.push(`✅ ${wrapped.tasks.rate}% tasks completed (${wrapped.tasks.completed}/${wrapped.tasks.total})`);
  if (wrapped.finance.netSavings > 0) lines.push(`💰 Saved ${formatCurrency(wrapped.finance.netSavings)}`);
  if (wrapped.wellbeing.totalCheckIns > 0) lines.push(`😊 ${wrapped.wellbeing.totalCheckIns} wellbeing check-ins`);
  if (wrapped.topCourse) lines.push(`🏆 Top course: ${wrapped.topCourse.name} (${wrapped.topCourse.hours}h)`);
  if (wrapped.mostProductiveWeek) lines.push(`⚡ Most productive: Week ${wrapped.mostProductiveWeek.weekNumber} (${wrapped.mostProductiveWeek.hours}h)`);
  lines.push(`🔥 Crymson Score: ${wrapped.score.total} — ${wrapped.score.tier.label}`);
  lines.push('');
  lines.push('Made with Crymson — your all-in-one student OS.');
  return lines.join('\n');
}

function formatCurrency(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₦0';
  if (n >= 1000) return `₦${(n / 1000).toFixed(1)}k`;
  return `₦${Math.round(n).toLocaleString()}`;
}

export function getSemesterLabel(semesterNumber, totalSemesters) {
  const year = Math.floor(((semesterNumber - 1) / 2)) + 1;
  const sessionStart = 2024 + year - 1;
  const sessionEnd = sessionStart + 1;
  const semLabel = semesterNumber % 2 === 1 ? 'Harmattan' : 'Rain';
  return `${semLabel} ${sessionStart}/${sessionEnd.toString().slice(2)}`;
}
