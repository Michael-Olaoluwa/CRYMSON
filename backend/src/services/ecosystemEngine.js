const UserState = require("../models/UserState");

function getGradePoint(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  if (n >= 70) return 5;
  if (n >= 60) return 4;
  if (n >= 50) return 3;
  if (n >= 45) return 2;
  if (n >= 40) return 1;
  return 0;
}

function calcFinalScore(course) {
  const direct = Number(course?.score);
  if (Number.isFinite(direct)) return direct;
  const t1 = Number(course?.test1Score);
  const t2 = Number(course?.test2Score);
  const exam = Number(course?.examScore);
  if (!Number.isFinite(t1) || !Number.isFinite(t2) || !Number.isFinite(exam)) return null;
  return t1 + t2 + exam;
}

function resolveClassification(value) {
  if (!Number.isFinite(value)) return null;
  if (value >= 4.5) return "First Class";
  if (value >= 3.5) return "Second Class Upper";
  if (value >= 2.4) return "Second Class Lower";
  if (value >= 1.5) return "Third Class";
  if (value > 0) return "Pass";
  return null;
}

function getWeekStart() {
  const now = new Date();
  const ws = new Date(now);
  ws.setDate(now.getDate() - now.getDay());
  ws.setHours(0, 0, 0, 0);
  return ws;
}

function getMonthKey(d) {
  return d.slice(0, 7);
}

/* ── CGPA ── */

function computeCgpa(cgpaState) {
  if (!cgpaState) return { currentCgpa: null, goalCgpa: null, classification: null, courses: [] };
  const courses = Array.isArray(cgpaState.courses) ? cgpaState.courses : [];
  let totalUnits = 0;
  let totalWeighted = 0;
  courses.forEach((c) => {
    const u = Number(c?.creditUnits);
    const s = calcFinalScore(c);
    const gp = getGradePoint(s);
    if (Number.isFinite(u) && u > 0 && Number.isFinite(gp)) {
      totalUnits += u;
      totalWeighted += u * gp;
    }
  });
  const currentCgpa = totalUnits > 0 ? totalWeighted / totalUnits : null;
  const goalCgpa =
    Number.isFinite(Number(cgpaState.goalCgpa)) && Number(cgpaState.goalCgpa) > 0
      ? Math.min(5, Math.max(0, Number(cgpaState.goalCgpa)))
      : null;
  const classification =
    typeof cgpaState.classification === "string" && cgpaState.classification
      ? cgpaState.classification
      : resolveClassification(currentCgpa);
  return { currentCgpa, goalCgpa, classification, courses };
}

/* ── Tasks ── */

function computeTasks(tasks) {
  const all = Array.isArray(tasks) ? tasks : [];
  const pending = all.filter((t) => !t.completed);
  const completed = all.filter((t) => t.completed);
  const now = new Date();
  const overdue = pending.filter((t) => {
    if (!t.dueAt) return false;
    return new Date(t.dueAt) < now;
  });
  const dueSoon = pending.filter((t) => {
    if (!t.dueAt) return false;
    const diff = new Date(t.dueAt) - now;
    return diff > 0 && diff <= 172800000; // 48 hours
  });
  const completionRate = all.length > 0 ? Math.round((completed.length / all.length) * 100) : 0;
  return {
    total: all.length,
    pending: pending.length,
    completed: completed.length,
    overdue: overdue.length,
    dueSoon: dueSoon.length,
    completionRate,
    items: all.slice(0, 50),
  };
}

/* ── Study Sessions ── */

function computeStudy(sessions) {
  const all = Array.isArray(sessions) ? sessions : [];
  const weekStart = getWeekStart();
  const weekSessions = all.filter(
    (s) => new Date(s?.startedAt || s?.date || 0) >= weekStart
  );
  const weeklySeconds = weekSessions.reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);

  const perCourse = {};
  all.forEach((s) => {
    const tag = (s.courseTag || "General Study").trim() || "General Study";
    if (!perCourse[tag]) perCourse[tag] = { seconds: 0, thisWeek: 0 };
    const secs = Number(s.durationSeconds) || 0;
    perCourse[tag].seconds += secs;
    if (new Date(s?.startedAt || s?.date || 0) >= weekStart) {
      perCourse[tag].thisWeek += secs;
    }
  });

  const courseHours = Object.entries(perCourse).map(([course, data]) => ({
    course,
    totalHours: Math.round((data.seconds / 3600) * 10) / 10,
    weekHours: Math.round((data.thisWeek / 3600) * 10) / 10,
  }));

  // Streak
  const daySet = new Set();
  all.forEach((s) => {
    const d = s?.startedAt || s?.date;
    if (d && (Number(s.durationSeconds) || 0) > 0) {
      daySet.add(d.slice(0, 10));
    }
  });
  const sortedDays = [...daySet].sort();
  let currentStreak = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (let i = sortedDays.length - 1; i >= 0; i--) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - (sortedDays.length - 1 - i));
    if (sortedDays[i] === expected.toISOString().slice(0, 10)) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    weeklySeconds,
    weeklyHours: Math.round((weeklySeconds / 3600) * 10) / 10,
    currentStreakDays: currentStreak,
    courseHours,
  };
}

/* ── Finance ── */

function computeFinance(financeState) {
  const entries = Array.isArray(financeState?.entries) ? financeState.entries : [];
  const normalized = entries.map((e) => ({
    ...e,
    kind: String(e?.kind || "expense").toLowerCase() === "income" ? "income" : "expense",
    amount: Number(e?.amount) || 0,
    date: String(e?.date || ""),
  }));

  const balance = normalized.reduce((s, e) => s + (e.kind === "income" ? e.amount : -e.amount), 0);
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthEntries = normalized.filter((e) => String(e.date || "").startsWith(monthKey));
  const monthIncome = monthEntries.reduce((s, e) => s + (e.kind === "income" ? e.amount : 0), 0);
  const monthExpense = monthEntries.reduce((s, e) => s + (e.kind === "expense" ? e.amount : 0), 0);

  let savingsGoal = 100;
  if (financeState?.prefs && Number.isFinite(Number(financeState.prefs.savingsGoalAmount)) && Number(financeState.prefs.savingsGoalAmount) > 0) {
    savingsGoal = Number(financeState.prefs.savingsGoalAmount);
  }
  const progressPercent = savingsGoal > 0 ? Math.min(100, Math.round((balance / savingsGoal) * 100)) : 0;

  // Upcoming recurring expenses
  const recurringPlans = Array.isArray(financeState?.recurringPlans) ? financeState.recurringPlans : [];
  const now = new Date();
  const upcomingExpenses = recurringPlans
    .filter((p) => p.active !== false)
    .map((p) => {
      const next = p.nextDueDate ? new Date(p.nextDueDate) : null;
      return {
        label: p.label || "Plan",
        amount: Number(p.amount) || 0,
        nextDueDate: p.nextDueDate,
        daysUntilDue: next ? Math.ceil((next - now) / 86400000) : null,
      };
    })
    .filter((p) => p.daysUntilDue !== null && p.daysUntilDue >= 0)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  // Monthly chart data (last 6 months)
  const byMonth = {};
  normalized.forEach((e) => {
    const m = (e.date || "").slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 };
    if (e.kind === "income") byMonth[m].income += e.amount;
    else byMonth[m].expense += e.amount;
  });
  const monthlyChart = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, v]) => ({
      month: m,
      income: v.income,
      expense: v.expense,
    }));

  return {
    balance,
    monthIncome,
    monthExpense,
    savingsGoal,
    progressPercent,
    totalEntries: normalized.length,
    upcomingExpenses,
    monthlyChart,
  };
}

/* ── Wellbeing ── */

function computeWellbeing(checkIns) {
  const all = Array.isArray(checkIns) ? checkIns : [];
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = all.filter((c) => {
    const d = new Date(c.date || c.createdAt || 0);
    return d >= thirtyDaysAgo;
  });
  const uniqueDays = new Set(recent.map((c) => (c.date || c.createdAt || "").slice(0, 10)).filter(Boolean));
  const latestMood = recent.length > 0 ? recent[recent.length - 1].mood : null;
  const avgMood = recent.length > 0
    ? Math.round((recent.reduce((s, c) => s + Number(c.mood || 3), 0) / recent.length) * 10) / 10
    : null;
  return {
    totalCheckIns: all.length,
    recentCheckIns: recent.length,
    uniqueDays: uniqueDays.size,
    latestMood,
    avgMood,
  };
}

/* ── Score ── */

function computeScore(cgpa, study, tasks, finance, wellbeing) {
  // CGPA score (0-25)
  const current = cgpa.currentCgpa;
  const goal = cgpa.goalCgpa;
  let cgpaScore = 0;
  if (current !== null && current > 0) {
    if (goal && goal > 0) {
      cgpaScore = Math.round(Math.min(1, current / goal) * 25 * 10) / 10;
    } else {
      cgpaScore = Math.round((current / 5) * 25 * 0.75 * 10) / 10;
    }
  }

  // Study score (0-20)
  const weeklyHours = study.weeklyHours || 0;
  const streak = study.currentStreakDays || 0;
  const weeklyPts = Math.min(10, Math.round((weeklyHours / 5) * 10 * 10) / 10);
  const streakPts = Math.min(10, Math.round(streak * 0.5 * 10) / 10);
  const studyScore = weeklyPts + streakPts;

  // Task score (0-20)
  const taskScore = tasks.total > 0
    ? Math.round((tasks.completionRate / 100) * 20 * 10) / 10
    : 0;

  // Finance score (0-20)
  let financeScore = 0;
  if (finance.totalEntries > 0) {
    let ratioPts = 0;
    if (finance.monthIncome > 0 || finance.monthExpense > 0) {
      const ratio = finance.monthIncome / Math.max(1, finance.monthExpense);
      ratioPts = Math.min(10, Math.round((ratio / 2) * 10 * 10) / 10);
    }
    let goalPts = 0;
    if (finance.savingsGoal > 0) {
      goalPts = Math.min(10, Math.round((finance.progressPercent / 100) * 10 * 10) / 10);
    }
    financeScore = Math.round((ratioPts + goalPts) * 10) / 10;
  }

  // Wellbeing score (0-15)
  const wellbeingScore = wellbeing.uniqueDays > 0
    ? Math.round(Math.min(1, wellbeing.uniqueDays / 30) * 15 * 10) / 10
    : 0;

  const total = Math.min(100, Math.round(cgpaScore + studyScore + taskScore + financeScore + wellbeingScore));

  const tiers = [
    { min: 0, max: 39, id: "bronze", label: "Bronze" },
    { min: 40, max: 59, id: "silver", label: "Silver" },
    { min: 60, max: 79, id: "gold", label: "Gold" },
    { min: 80, max: 100, id: "crimson-elite", label: "Crimson Elite" },
  ];

  const tier = tiers.find((t) => total >= t.min && total <= t.max) || tiers[0];
  const nextTier = tiers.find((t) => total < t.max && t.min > total) || null;
  const pointsToNextTier = nextTier ? nextTier.min - total : 0;

  return {
    score: total,
    tier: tier.id,
    tierLabel: tier.label,
    nextTier: nextTier ? nextTier.label : null,
    pointsToNextTier,
    dimensions: {
      cgpa: { score: cgpaScore, max: 25 },
      study: { score: studyScore, max: 20 },
      tasks: { score: taskScore, max: 20 },
      finance: { score: financeScore, max: 20 },
      wellbeing: { score: wellbeingScore, max: 15 },
    },
  };
}

/* ── AI Insights ── */

function generateInsights(cgpa, tasks, study, finance, wellbeing, score) {
  const insights = [];

  // Cross-tool: Study hours vs grades
  if (cgpa.currentCgpa !== null && study.courseHours.length > 0) {
    const lowCourses = study.courseHours.filter((c) => c.weekHours < 3 && c.weekHours > 0);
    const cgpaCourses = cgpa.courses || [];
    const lowPerformers = cgpaCourses.filter((c) => {
      const s = calcFinalScore(c);
      const gp = getGradePoint(s);
      return gp !== null && gp < 3;
    });
    if (lowCourses.length > 0 && lowPerformers.length > 0) {
      const overlap = lowCourses.filter((lc) =>
        lowPerformers.some(
          (lp) =>
            String(lp.courseName || "").toLowerCase() === lc.course.toLowerCase()
        )
      );
      if (overlap.length > 0) {
        insights.push({
          type: "warning",
          title: "Low Study Hours Warning",
          message: `You're studying less than 3 hrs/week for ${overlap.map((c) => c.course).join(", ")}. Your grades in these courses are below average. Try to increase study time to improve performance.`,
          icon: "warning",
        });
      }
    }
  }

  // Streak encouragement
  if (study.currentStreakDays >= 3) {
    insights.push({
      type: "achievement",
      title: `${study.currentStreakDays}-Day Study Streak!`,
      message: `You've studied for ${study.currentStreakDays} consecutive days. Keep it up — consistency is the key to academic success.`,
      icon: "fire",
    });
  }

  // Task backlog
  if (tasks.overdue > 0) {
    insights.push({
      type: "alert",
      title: `${tasks.overdue} Overdue Task${tasks.overdue > 1 ? "s" : ""}`,
      message: `You have ${tasks.overdue} overdue task${tasks.overdue > 1 ? "s" : ""}. Prioritize catching up to avoid last-minute pressure.`,
      icon: "clock",
    });
  }

  // Upcoming finance
  if (finance.upcomingExpenses.length > 0) {
    const imminent = finance.upcomingExpenses.filter((e) => e.daysUntilDue <= 3);
    if (imminent.length > 0) {
      insights.push({
        type: "info",
        title: "Upcoming Payments Due",
        message: `${imminent.length} expense${imminent.length > 1 ? "s are" : " is"} due within 3 days: ${imminent.map((e) => `${e.label} (${e.amount})`).join(", ")}.`,
        icon: "dollar",
      });
    }
  }

  // Wellbeing check
  if (wellbeing.latestMood !== null && wellbeing.latestMood <= 2) {
    insights.push({
      type: "concern",
      title: "Low Mood Detected",
      message: "Your latest wellbeing check-in shows a low mood. Consider taking a break, talking to a friend, or using campus wellness resources.",
      icon: "heart",
    });
  }

  // Score tier insight
  if (score.nextTier) {
    insights.push({
      type: "goal",
      title: `${score.pointsToNextTier} Points to ${score.nextTier}`,
      message: `You're ${score.pointsToNextTier} points away from reaching ${score.nextTier}. ${
        score.dimensions.tasks.score < score.dimensions.tasks.max * 0.5
          ? "Completing more tasks would boost your score fastest."
          : score.dimensions.study.score < score.dimensions.study.max * 0.5
            ? "Increasing your study hours would help reach the next tier."
            : "Keep up the great work across all areas!"
      }`,
      icon: "star",
    });
  }

  // New semester/assessment reminder
  const upcomingAssessments = tasks.items.filter((t) => {
    if (!t.dueAt || t.completed) return false;
    const diff = new Date(t.dueAt) - new Date();
    return diff > 0 && diff <= 604800000; // 7 days
  });
  if (upcomingAssessments.length > 0) {
    insights.push({
      type: "reminder",
      title: `${upcomingAssessments.length} Upcoming Deadline${upcomingAssessments.length > 1 ? "s" : ""} This Week`,
      message: upcomingAssessments
        .map((t) => `${t.title || "Task"} (${t.courseTag || "General"}) — ${new Date(t.dueAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`)
        .join(". "),
      icon: "calendar",
    });
  }

  // Finance vs study correlation
  if (finance.monthExpense > 0 && study.weeklyHours > 0) {
    const booksCategory = finance.monthlyChart.length > 0
      ? null // simplified for now
      : null;

    // General tip based on spending patterns
    const expensiveCategories = ["Entertainment", "Subscriptions"];
    const hasExpensive = finance.upcomingExpenses.some((e) =>
      expensiveCategories.some((cat) => e.label.toLowerCase().includes(cat.toLowerCase()))
    );
    if (hasExpensive && study.weeklyHours < 10) {
      insights.push({
        type: "tip",
        title: "Balance Spend & Study",
        message: "Consider reducing entertainment subscriptions and redirecting that time to study — it could boost both your finances and grades.",
        icon: "lightbulb",
      });
    }
  }

  return insights;
}

/* ── Daily Briefing ── */

function generateBriefing(data) {
  const { cgpa, tasks, study, finance, wellbeing, score, insights } = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  const items = [];

  // Score highlight
  items.push({
    type: "score",
    label: `${score.tierLabel} — ${score.score}`,
    detail: score.pointsToNextTier > 0 ? `${score.pointsToNextTier} pts to ${score.nextTier}` : "Max tier achieved!",
  });

  // Tasks
  if (tasks.overdue > 0) items.push({ type: "task", label: `${tasks.overdue} overdue`, detail: "tasks need attention" });
  if (tasks.dueSoon > 0) items.push({ type: "task", label: `${tasks.dueSoon} due soon`, detail: "tasks within 48 hours" });
  if (tasks.pending > 0) items.push({ type: "task", label: `${tasks.pending} pending`, detail: `${tasks.completionRate}% complete` });

  // Study
  if (study.weeklyHours > 0) items.push({ type: "study", label: `${study.weeklyHours}h studied`, detail: "this week" });
  if (study.currentStreakDays > 0) items.push({ type: "study", label: `${study.currentStreakDays}d streak`, detail: "keep going!" });

  // Finance
  if (finance.monthExpense > 0) items.push({ type: "finance", label: `${finance.monthExpense} spent`, detail: "this month" });
  if (finance.upcomingExpenses.length > 0) items.push({ type: "finance", label: `${finance.upcomingExpenses.length} bills due`, detail: "upcoming" });

  // Alerts from insights
  const alerts = insights.filter((i) => i.type === "alert" || i.type === "warning");
  const topInsight = insights.length > 0 ? insights[0] : null;

  return {
    greeting,
    generatedAt: new Date().toISOString(),
    items,
    criticalCount: alerts.length,
    topInsight,
  };
}

/* ── Main aggregation ── */

async function getDashboard(userId) {
  const userState = await UserState.findOne({ userId });
  if (!userState) {
    return null;
  }

  const cgpaData = computeCgpa(userState.cgpaState);
  const tasksData = computeTasks(userState.tasks);
  const studyData = computeStudy(userState.timeSessions);
  const financeData = computeFinance(userState.financeState);
  const wellbeingData = computeWellbeing(userState.wellbeingCheckIns);
  const scoreData = computeScore(cgpaData, studyData, tasksData, financeData, wellbeingData);
  const insights = generateInsights(cgpaData, tasksData, studyData, financeData, wellbeingData, scoreData);
  const briefing = generateBriefing({
    cgpa: cgpaData,
    tasks: tasksData,
    study: studyData,
    finance: financeData,
    wellbeing: wellbeingData,
    score: scoreData,
    insights,
  });

  return {
    cgpa: cgpaData,
    tasks: tasksData,
    study: studyData,
    finance: financeData,
    wellbeing: wellbeingData,
    score: scoreData,
    insights,
    briefing,
  };
}

async function getBriefing(userId) {
  const dashboard = await getDashboard(userId);
  if (!dashboard) return null;
  return dashboard.briefing;
}

module.exports = {
  getDashboard,
  getBriefing,
  computeCgpa,
  computeTasks,
  computeStudy,
  computeFinance,
  computeWellbeing,
  computeScore,
  generateInsights,
  generateBriefing,
};
