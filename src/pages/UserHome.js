import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './UserHome.module.css';
import { formatClock, getStudyStreakStats } from '../utils/timeFormatting';
import TimerWidget from '../components/TimerWidget';

const USER_CGPA_STATE_KEY_BASE = 'crymson_user_cgpa_state_v1';
const TODO_STORAGE_KEY_BASE = 'crymson_todo_tasks';
const TIME_TRACKER_STORAGE_KEY_BASE = 'crymson_time_tracker_sessions';
const FINANCE_ENTRIES_STORAGE_KEY_BASE = 'crymson_finance_entries';
const FINANCE_PREFS_STORAGE_KEY_BASE = 'crymson_finance_prefs';
const DASHBOARD_USAGE_KEY = 'crymson_dashboard_usage_v1';
const AUTH_SESSION_KEY = 'crymson_auth_session';
const AUTH_API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:5000`;
const TEST_TASK_TYPES = new Set(['test-1', 'test-2', 'exam', 'exam-timetable']);

const BOOT_QUOTES = [
  'Let\'s make today count.',
  'Consistency beats intensity.',
  'Small wins build big semesters.'
];

const PANEL_IDS = ['academic', 'action', 'life'];

const PANEL_META = {
  academic: {
    title: 'Academic Progress',
    insight: 'Your momentum is climbing this week.'
  },
  action: {
    title: 'What\'s Next?',
    insight: 'Focus on the next two high-impact tasks.'
  },
  life: {
    title: 'Life & Stats',
    insight: 'Balance drives long-term performance.'
  }
};

const DEFAULT_USAGE = {
  academic: 3,
  action: 2,
  life: 1
};

const MOOD_TONES = {
  focused: 'Locked in mode. Keep your deep work streak alive.',
  tired: 'Feeling low? Let\'s take it easy today.',
  motivated: 'Energy is high. This is a great day to push harder.'
};

const getGradePoint = (score) => {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return null;
  if (numericScore >= 70) return 5;
  if (numericScore >= 60) return 4;
  if (numericScore >= 50) return 3;
  if (numericScore >= 45) return 2;
  if (numericScore >= 40) return 1;
  return 0;
};

const calculateFinalScore = (course) => {
  const directScore = Number(course?.score);
  if (Number.isFinite(directScore)) {
    return directScore;
  }

  const test1 = Number(course?.test1Score);
  const test2 = Number(course?.test2Score);
  const exam = Number(course?.examScore);
  if (!Number.isFinite(test1) || !Number.isFinite(test2) || !Number.isFinite(exam)) {
    return null;
  }

  return test1 + test2 + exam;
};

const resolveClassification = (value) => {
  if (!Number.isFinite(value)) return null;
  if (value >= 4.5) return 'First Class';
  if (value >= 3.5) return 'Second Class Upper';
  if (value >= 2.4) return 'Second Class Lower';
  if (value >= 1.5) return 'Third Class';
  if (value > 0) return 'Pass';
  return null;
};

const getUserCgpaStateKey = (activeUserId) => `${USER_CGPA_STATE_KEY_BASE}:${activeUserId || 'guest'}`;

const getCgpaSummary = (activeUserId) => {
  const userCgpaStateKey = getUserCgpaStateKey(activeUserId);

  try {
    const raw = localStorage.getItem(userCgpaStateKey);
    if (!raw) {
      return {
        currentCgpa: null,
        goalCgpa: null,
        progress: null,
        classification: null,
        showDashboardCard: true,
        showDashboardClassification: true,
      };
    }

    const parsed = JSON.parse(raw);
    const courses = Array.isArray(parsed.courses) ? parsed.courses : [];
    const goalCgpa = Number(parsed.goalCgpa);
    const showDashboardCard = typeof parsed.showDashboardCard === 'boolean'
      ? parsed.showDashboardCard
      : true;
    const showDashboardClassification = typeof parsed.showDashboardClassification === 'boolean'
      ? parsed.showDashboardClassification
      : true;

    let totalUnits = 0;
    let totalWeighted = 0;

    courses.forEach((course) => {
      const units = Number(course?.creditUnits);
      const finalScore = calculateFinalScore(course);
      const gradePoint = getGradePoint(finalScore);

      if (Number.isFinite(units) && units > 0 && Number.isFinite(gradePoint)) {
        totalUnits += units;
        totalWeighted += units * gradePoint;
      }
    });

    const currentCgpa = totalUnits > 0 ? totalWeighted / totalUnits : null;
    const normalizedGoal = Number.isFinite(goalCgpa) && goalCgpa > 0
      ? Math.min(5, Math.max(0, goalCgpa))
      : null;

    const progress = currentCgpa !== null && normalizedGoal !== null
      ? Math.min(100, Math.max(0, (currentCgpa / normalizedGoal) * 100))
      : null;
    const classification = typeof parsed.classification === 'string' && parsed.classification
      ? parsed.classification
      : resolveClassification(currentCgpa);

    return {
      currentCgpa,
      goalCgpa: normalizedGoal,
      progress,
      classification,
      showDashboardCard,
      showDashboardClassification,
    };
  } catch (error) {
    return {
      currentCgpa: null,
      goalCgpa: null,
      progress: null,
      classification: null,
      showDashboardCard: true,
      showDashboardClassification: true,
    };
  }
};

const getStoredUsage = () => {
  try {
    const raw = localStorage.getItem(DASHBOARD_USAGE_KEY);
    if (!raw) {
      return DEFAULT_USAGE;
    }

    const parsed = JSON.parse(raw);
    return {
      academic: Number.isFinite(parsed.academic) ? parsed.academic : DEFAULT_USAGE.academic,
      action: Number.isFinite(parsed.action) ? parsed.action : DEFAULT_USAGE.action,
      life: Number.isFinite(parsed.life) ? parsed.life : DEFAULT_USAGE.life,
    };
  } catch (error) {
    return DEFAULT_USAGE;
  }
};

const getRingTone = (progress) => {
  if (progress === null) return 'pending';
  if (progress >= 100) return 'complete';
  if (progress >= 75) return 'strong';
  return 'building';
};

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed.token === 'string' ? parsed.token : '';
  } catch (error) {
    return '';
  }
};

const normalizeTask = (task) => ({
  ...task,
  courseTag: String(task?.courseTag || task?.subject || '').trim(),
  priority: ['high', 'medium', 'low'].includes(String(task?.priority || '').toLowerCase())
    ? String(task.priority).toLowerCase()
    : 'medium',
  recurrence: ['none', 'daily', 'weekly', 'monthly'].includes(String(task?.recurrence || '').toLowerCase())
    ? String(task.recurrence).toLowerCase()
    : 'none',
});

const normalizeSession = (session) => ({
  ...session,
  courseTag: String(session?.courseTag || 'General Study').trim() || 'General Study',
  durationSeconds: Number(session?.durationSeconds) || 0,
});

const getFinanceEntriesKey = (activeUserId) => `${FINANCE_ENTRIES_STORAGE_KEY_BASE}:${activeUserId || 'guest'}`;

const getFinancePrefsKey = (activeUserId) => `${FINANCE_PREFS_STORAGE_KEY_BASE}:${activeUserId || 'guest'}`;

const formatMoney = (value) => {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safeValue);
};

const getStoredFinancePrefs = (activeUserId) => {
  try {
    const raw = localStorage.getItem(getFinancePrefsKey(activeUserId));
    if (!raw) {
      return {
        savingsGoalAmount: 100,
        lowBalanceThreshold: 50,
        hideBalanceOnDashboard: false,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      savingsGoalAmount: Number.isFinite(Number(parsed?.savingsGoalAmount)) && Number(parsed.savingsGoalAmount) > 0
        ? Number(parsed.savingsGoalAmount)
        : 100,
      lowBalanceThreshold: Number.isFinite(Number(parsed?.lowBalanceThreshold)) && Number(parsed.lowBalanceThreshold) >= 0
        ? Number(parsed.lowBalanceThreshold)
        : 50,
      hideBalanceOnDashboard: typeof parsed?.hideBalanceOnDashboard === 'boolean'
        ? parsed.hideBalanceOnDashboard
        : false,
    };
  } catch (error) {
    return {
      savingsGoalAmount: 100,
      lowBalanceThreshold: 50,
      hideBalanceOnDashboard: false,
    };
  }
};

const getFinanceDashboardSummary = (activeUserId, financePrefs) => {
  const fallbackMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  try {
    const raw = localStorage.getItem(getFinanceEntriesKey(activeUserId));
    const entries = raw ? JSON.parse(raw) : [];
    const normalizedEntries = Array.isArray(entries)
      ? entries.map((entry) => ({
        ...entry,
        kind: String(entry?.kind || 'expense').toLowerCase() === 'income' ? 'income' : 'expense',
        amount: Number(entry?.amount) || 0,
        date: String(entry?.date || ''),
      }))
      : [];

    const balance = normalizedEntries.reduce((sum, entry) => sum + (entry.kind === 'income' ? entry.amount : -entry.amount), 0);
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const monthEntries = normalizedEntries.filter((entry) => String(entry.date || '').startsWith(currentMonthKey));
    const monthIncome = monthEntries.reduce((sum, entry) => sum + (entry.kind === 'income' ? entry.amount : 0), 0);
    const monthExpense = monthEntries.reduce((sum, entry) => sum + (entry.kind === 'expense' ? entry.amount : 0), 0);
    const monthBalance = monthIncome - monthExpense;
    const savingsGoalAmount = Number.isFinite(Number(financePrefs?.savingsGoalAmount)) && Number(financePrefs.savingsGoalAmount) > 0
      ? Number(financePrefs.savingsGoalAmount)
      : 100;
    const lowBalanceThreshold = Number.isFinite(Number(financePrefs?.lowBalanceThreshold)) && Number(financePrefs.lowBalanceThreshold) >= 0
      ? Number(financePrefs.lowBalanceThreshold)
      : 50;
    const progressPercent = savingsGoalAmount > 0
      ? Math.min(100, Math.max(0, (monthBalance / savingsGoalAmount) * 100))
      : 0;
    const remainingToGoal = Math.max(0, savingsGoalAmount - monthBalance);

    return {
      totalEntries: normalizedEntries.length,
      monthIncome,
      monthExpense,
      balance,
      monthBalance,
      savingsGoalAmount,
      remainingToGoal,
      progressPercent,
      lowBalanceThreshold,
      monthLabel: fallbackMonthLabel,
      isLowBalance: balance <= lowBalanceThreshold,
    };
  } catch (error) {
    const lowBalanceThreshold = Number.isFinite(Number(financePrefs?.lowBalanceThreshold)) && Number(financePrefs.lowBalanceThreshold) >= 0
      ? Number(financePrefs.lowBalanceThreshold)
      : 50;

    return {
      totalEntries: 0,
      monthIncome: 0,
      monthExpense: 0,
      balance: 0,
      monthBalance: 0,
      savingsGoalAmount: 100,
      remainingToGoal: 100,
      progressPercent: 0,
      lowBalanceThreshold,
      monthLabel: fallbackMonthLabel,
      isLowBalance: true,
    };
  }
};

function UserHome({
  userId,
  userName,
  onNavigateToUserCGPA,
  onNavigateToTodo,
  onNavigateToTime,
  onNavigateToFinance,
  onLogout,
}) {
  const displayName = userName || userId || 'Michael';
  const [cgpaSummary, setCgpaSummary] = useState(() => getCgpaSummary(userId));
  const [usage, setUsage] = useState(() => getStoredUsage());
  const [isBooting, setIsBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootQuote, setBootQuote] = useState(BOOT_QUOTES[0]);
  const [activePanel, setActivePanel] = useState(0);
  const [expandedGauge, setExpandedGauge] = useState(null);
  const [contextCard, setContextCard] = useState(null);
  const [mood, setMood] = useState('focused');
  const [isMoodBouncing, setIsMoodBouncing] = useState(false);
  const [dashboardTasks, setDashboardTasks] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [financePrefs, setFinancePrefs] = useState(() => getStoredFinancePrefs(userId));

  const touchStartRef = useRef(0);
  const longPressTimerRef = useRef(null);

  const targetGoalPercent = cgpaSummary.goalCgpa !== null
    ? Math.min(100, Math.max(0, (cgpaSummary.goalCgpa / 5) * 100))
    : 0;
  const targetCurrentPercent = cgpaSummary.currentCgpa !== null
    ? Math.min(100, Math.max(0, (cgpaSummary.currentCgpa / 5) * 100))
    : 0;

  const ringTone = getRingTone(cgpaSummary.progress);

  const orderedPanels = useMemo(() => {
    return [...PANEL_IDS].sort((left, right) => (usage[right] || 0) - (usage[left] || 0));
  }, [usage]);

  const currentPanelId = orderedPanels[activePanel] || orderedPanels[0];

  useEffect(() => {
    localStorage.setItem(DASHBOARD_USAGE_KEY, JSON.stringify(usage));
  }, [usage]);

  useEffect(() => {
    setCgpaSummary(getCgpaSummary(userId));
  }, [userId]);

  useEffect(() => {
    setFinancePrefs(getStoredFinancePrefs(userId));
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(getFinancePrefsKey(userId), JSON.stringify(financePrefs));
    } catch (error) {
      // Ignore storage write failures; the card can still render from in-memory state.
    }
  }, [financePrefs, userId]);

  useEffect(() => {
    const scopedTaskKey = `${TODO_STORAGE_KEY_BASE}:${userId || 'guest'}`;
    const scopedSessionKey = `${TIME_TRACKER_STORAGE_KEY_BASE}:${userId || 'guest'}`;
    const scopedFinanceEntriesKey = getFinanceEntriesKey(userId);
    const scopedFinancePrefsKey = getFinancePrefsKey(userId);

    try {
      const rawTasks = localStorage.getItem(scopedTaskKey);
      if (rawTasks) {
        const parsedTasks = JSON.parse(rawTasks);
        setDashboardTasks(Array.isArray(parsedTasks) ? parsedTasks.map(normalizeTask) : []);
      } else {
        setDashboardTasks([]);
      }
    } catch (error) {
      setDashboardTasks([]);
    }

    try {
      const rawSessions = localStorage.getItem(scopedSessionKey);
      if (rawSessions) {
        const parsedSessions = JSON.parse(rawSessions);
        setStudySessions(Array.isArray(parsedSessions) ? parsedSessions.map(normalizeSession) : []);
      } else {
        setStudySessions([]);
      }
    } catch (error) {
      setStudySessions([]);
    }

    let cancelled = false;

    const loadRemoteDashboardState = async () => {
      const token = getStoredToken();
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/user-state/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) {
          return;
        }

        const allState = payload.data && typeof payload.data === 'object'
          ? payload.data
          : null;

        if (!allState) {
          return;
        }

        const remoteTasks = Array.isArray(allState.tasks) ? allState.tasks : [];
        setDashboardTasks(remoteTasks.map(normalizeTask));
        localStorage.setItem(scopedTaskKey, JSON.stringify(remoteTasks));

        const remoteSessions = Array.isArray(allState.timeSessions)
          ? allState.timeSessions.map(normalizeSession)
          : [];
        setStudySessions(remoteSessions);
        localStorage.setItem(scopedSessionKey, JSON.stringify(remoteSessions));

        const remoteFinance = allState.finance && typeof allState.finance === 'object'
          ? allState.finance
          : null;

        if (remoteFinance) {
          const remoteEntries = Array.isArray(remoteFinance.entries) ? remoteFinance.entries : [];
          localStorage.setItem(scopedFinanceEntriesKey, JSON.stringify(remoteEntries));

          if (remoteFinance.prefs && typeof remoteFinance.prefs === 'object') {
            const mergedPrefs = {
              ...getStoredFinancePrefs(userId),
              ...remoteFinance.prefs,
            };
            setFinancePrefs(mergedPrefs);
            localStorage.setItem(scopedFinancePrefsKey, JSON.stringify(mergedPrefs));
          }
        }
      } catch (error) {
        // Keep local dashboard data when remote fetch fails.
      }
    };

    loadRemoteDashboardState();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const quote = BOOT_QUOTES[Math.floor(Math.random() * BOOT_QUOTES.length)];
    setBootQuote(quote);

    const start = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, Math.floor((elapsed / 1300) * 100));
      setBootProgress(progress);

      if (progress >= 100) {
        window.clearInterval(intervalId);
        setIsBooting(false);
      }
    }, 45);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const goalPercent = isBooting ? 0 : targetGoalPercent;
  const currentPercent = isBooting ? 0 : targetCurrentPercent;

  const ringOuterRadius = 56;
  const ringInnerRadius = 42;
  const ringOuterCircumference = 2 * Math.PI * ringOuterRadius;
  const ringInnerCircumference = 2 * Math.PI * ringInnerRadius;
  const goalDashoffset = ringOuterCircumference * (1 - goalPercent / 100);
  const currentDashoffset = ringInnerCircumference * (1 - currentPercent / 100);

  const handleTurnOnDashboardCgpa = () => {
    const userCgpaStateKey = getUserCgpaStateKey(userId);

    try {
      const raw = localStorage.getItem(userCgpaStateKey);
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        userCgpaStateKey,
        JSON.stringify({ ...parsed, showDashboardCard: true })
      );
      setCgpaSummary(getCgpaSummary(userId));
    } catch (error) {
      setCgpaSummary((prev) => ({ ...prev, showDashboardCard: true }));
    }
  };

  const progressMessage = cgpaSummary.progress === null
    ? 'Set your goal in the CGPA tracker to start visual progress monitoring.'
    : cgpaSummary.progress >= 100
      ? 'You are currently above your stated target. Maintain this momentum.'
      : `You are ${cgpaSummary.progress.toFixed(1)}% toward your target. Keep pushing course by course.`;

  const moodMessage = MOOD_TONES[mood] || MOOD_TONES.focused;

  const trackPanelUse = (panelId) => {
    setUsage((prev) => ({ ...prev, [panelId]: (prev[panelId] || 0) + 1 }));
  };

  const handlePanelSelect = (index) => {
    setActivePanel(index);
    trackPanelUse(orderedPanels[index]);
  };

  const handleSwipeStart = (event) => {
    touchStartRef.current = event.changedTouches[0].clientX;
  };

  const handleSwipeEnd = (event) => {
    const delta = event.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(delta) < 35) {
      return;
    }

    if (delta < 0 && activePanel < orderedPanels.length - 1) {
      handlePanelSelect(activePanel + 1);
    }

    if (delta > 0 && activePanel > 0) {
      handlePanelSelect(activePanel - 1);
    }
  };

  const beginLongPress = (cardId) => {
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      setContextCard(cardId);
    }, 520);
  };

  const endLongPress = () => {
    window.clearTimeout(longPressTimerRef.current);
  };

  const handleMoodTap = (nextMood) => {
    setMood(nextMood);
    setIsMoodBouncing(true);
    window.setTimeout(() => setIsMoodBouncing(false), 340);
  };
  const now = Date.now();
  const weekStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay());
    return date.getTime();
  }, []);

  const dashboardTaskStats = useMemo(() => {
    const openTasks = dashboardTasks.filter((task) => !task.completed);
    const completedTasks = dashboardTasks.filter((task) => task.completed);

    const parseDueAt = (task) => new Date(task.dueAt || '').getTime();
    const overdueTasks = openTasks.filter((task) => Number.isFinite(parseDueAt(task)) && parseDueAt(task) < now);
    const dueSoonTasks = openTasks.filter((task) => {
      const dueAt = parseDueAt(task);
      return Number.isFinite(dueAt) && dueAt >= now && dueAt <= now + (7 * 24 * 60 * 60 * 1000);
    });
    const upcomingTests = dueSoonTasks.filter((task) => TEST_TASK_TYPES.has(String(task.taskType || '').toLowerCase()));

    const nextTask = [...openTasks]
      .filter((task) => Number.isFinite(parseDueAt(task)))
      .sort((left, right) => parseDueAt(left) - parseDueAt(right))[0] || null;

    return {
      total: dashboardTasks.length,
      completed: completedTasks.length,
      open: openTasks.length,
      overdue: overdueTasks.length,
      dueSoon: dueSoonTasks.length,
      upcomingTests: upcomingTests.length,
      completionRate: dashboardTasks.length > 0 ? Math.round((completedTasks.length / dashboardTasks.length) * 100) : 0,
      nextTask,
    };
  }, [dashboardTasks, now]);

  const dashboardStudyStats = useMemo(() => {
    const weekSessions = studySessions.filter((session) => {
      const startedAt = new Date(session.startedAt || '').getTime();
      return Number.isFinite(startedAt) && startedAt >= weekStart;
    });

    const streakStats = getStudyStreakStats(studySessions);

    const weekSeconds = weekSessions.reduce((sum, session) => sum + (Number(session.durationSeconds) || 0), 0);
    const todayString = new Date().toDateString();
    const todaySeconds = studySessions.reduce((sum, session) => {
      const startedAt = new Date(session.startedAt || '');
      if (startedAt.toDateString() !== todayString) return sum;
      return sum + (Number(session.durationSeconds) || 0);
    }, 0);

    return {
      weekSeconds,
      todaySeconds,
      sessionCount: weekSessions.length,
      currentStreakDays: streakStats.currentStreakDays,
      bestStreakDays: streakStats.bestStreakDays,
    };
  }, [studySessions, weekStart]);

  const financeSummary = useMemo(() => getFinanceDashboardSummary(userId, financePrefs), [userId, financePrefs]);

  const crymsonScore = useMemo(() => {
    const cgpaScore = cgpaSummary.currentCgpa !== null ? (cgpaSummary.currentCgpa / 5) * 55 : 0;
    const taskScore = dashboardTaskStats.completionRate * 0.25;
    const studyScore = Math.min(25, Math.round(dashboardStudyStats.weekSeconds / 1800) * 4);
    return Math.min(100, Math.round(cgpaScore + taskScore + studyScore));
  }, [cgpaSummary.currentCgpa, dashboardTaskStats.completionRate, dashboardStudyStats.weekSeconds]);

  const handleToggleFinanceBalance = () => {
    setFinancePrefs((prev) => ({
      ...prev,
      hideBalanceOnDashboard: !prev.hideBalanceOnDashboard,
    }));
  };

  const realSummaryCards = [
    {
      id: 'cgpa',
      label: 'Current CGPA',
      value: cgpaSummary.currentCgpa !== null ? cgpaSummary.currentCgpa.toFixed(2) : '—',
      note: cgpaSummary.currentCgpa !== null ? (cgpaSummary.classification || 'Tracked from CGPA tool') : 'Open CGPA Tracker to enter scores',
    },
    {
      id: 'tasks',
      label: 'Task Progress',
      value: dashboardTasks.length > 0 ? `${dashboardTaskStats.completionRate}%` : '—',
      note: dashboardTasks.length > 0
        ? `${dashboardTaskStats.completed}/${dashboardTaskStats.total} complete`
        : 'Add tasks in To-Do Planner',
    },
    {
      id: 'study',
      label: 'Study Time This Week',
      value: dashboardStudyStats.weekSeconds > 0 ? `${Math.round(dashboardStudyStats.weekSeconds / 60)}m` : '0m',
      note: dashboardStudyStats.sessionCount > 0
        ? `${dashboardStudyStats.sessionCount} session${dashboardStudyStats.sessionCount === 1 ? '' : 's'} logged`
        : 'Track time in Time Tracker',
    },
    {
      id: 'tests',
      label: 'Upcoming Tests',
      value: String(dashboardTaskStats.upcomingTests),
      note: dashboardTaskStats.upcomingTests > 0
        ? (dashboardTaskStats.nextTask ? dashboardTaskStats.nextTask.title : 'Tests scheduled in calendar')
        : 'No tests due in the next 7 days',
    },
  ];

  const summaryCards = realSummaryCards;

  const realLifeStats = [
    {
      label: 'Open Tasks',
      value: dashboardTaskStats.open > 0 ? String(dashboardTaskStats.open) : '0',
      note: dashboardTaskStats.overdue > 0
        ? `${dashboardTaskStats.overdue} overdue`
        : 'No overdue tasks',
    },
    {
      label: 'Due Soon',
      value: dashboardTaskStats.dueSoon > 0 ? String(dashboardTaskStats.dueSoon) : '0',
      note: dashboardTaskStats.nextTask ? dashboardTaskStats.nextTask.title : 'Nothing urgent in the next 7 days',
    },
    {
      label: 'Study Streak',
      value: `${dashboardStudyStats.currentStreakDays}d`,
      note: dashboardStudyStats.currentStreakDays > 0
        ? `${dashboardStudyStats.bestStreakDays}d best, ${dashboardStudyStats.todaySeconds > 0 ? 'studied today' : 'keep it active today'}`
        : 'Start a session today to begin a streak',
    },
    {
      label: 'Study This Week',
      value: dashboardStudyStats.weekSeconds > 0 ? formatClock(dashboardStudyStats.weekSeconds) : '00:00:00',
      note: dashboardStudyStats.sessionCount > 0
        ? `${dashboardStudyStats.sessionCount} session${dashboardStudyStats.sessionCount === 1 ? '' : 's'}`
        : 'No sessions logged this week',
    },
  ];

  const toolHubItems = [
    {
      id: 'cgpa',
      name: 'CGPA Tracker',
      icon: '🎓',
      summary: 'Track grades, CGPA trend, and semester movement.',
      status: 'Live',
      isLive: true,
      actionLabel: 'Open App',
      onOpen: () => {
        trackPanelUse('action');
        onNavigateToUserCGPA();
      },
    },
    {
      id: 'todo',
      name: 'Task Manager',
      icon: '✅',
      summary: 'Manage assignments, reminders, and deadlines.',
      status: 'Live',
      isLive: true,
      actionLabel: 'Open App',
      onOpen: () => {
        trackPanelUse('action');
        onNavigateToTodo();
      },
    },
    {
      id: 'time',
      name: 'Time Tracker',
      icon: '⏱️',
      summary: 'Log study sessions and focus blocks.',
      status: 'Live',
      isLive: true,
      actionLabel: 'Open App',
      onOpen: () => {
        trackPanelUse('action');
        onNavigateToTime();
      },
    },
    {
      id: 'finance',
      name: 'Finance Tracker',
      icon: '💳',
      summary: 'Track spending for school and personal budgets.',
      status: 'Live',
      isLive: true,
      actionLabel: 'Open App',
      onOpen: () => {
        trackPanelUse('action');
        if (onNavigateToFinance) {
          onNavigateToFinance();
        }
      },
    },
    {
      id: 'social',
      name: 'Social Layer',
      icon: '👥',
      summary: 'Connect with classmates and study groups.',
      status: 'Pending',
      isLive: false,
      actionLabel: 'Coming Soon',
    },
  ];

  const pendingModules = [
    { name: 'AI Study Planner', status: 'Pending' },
    { name: 'Social Layer', status: 'Pending' },
    { name: 'Semester Wrapped', status: 'Pending' },
  ];

  const panelClasses = `${styles.panelTrack} ${styles[`panel${activePanel}`]}`;

  if (isBooting) {
    return (
      <div className={styles.bootScreen}>
        <div className={styles.bootCard}>
          <p className={styles.bootEyebrow}>Crymson</p>
          <h1 className={styles.bootTitle}>Welcome back, {displayName} 👋</h1>
          <p className={styles.bootQuote}>{bootQuote}</p>
          <div className={styles.bootProgressTrack}>
            <span className={styles.bootProgressFill} style={{ width: `${bootProgress}%` }} />
          </div>
          <div className={styles.bootDots}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={`${styles.hero} ${styles.startupReveal} ${styles.revealDelay1}`}>
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>Crymson Command Center</p>
            <h1 className={styles.heroTitle}>Hello, {displayName}</h1>
            <p className={styles.heroSubtitle}>
              Keep your academic momentum sharp. Track performance, plan tasks,
              and stay focused with one premium workspace.
            </p>
          </div>

          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryButton} onClick={onNavigateToTime}>
              Resume Study
            </button>
            <button type="button" className={styles.secondaryButton} onClick={onLogout}>
              Log Out
            </button>
          </div>
        </header>

        <div className={`${styles.moodBar} ${styles.startupReveal} ${styles.revealDelay2}`}>
          <p className={styles.moodText}>{moodMessage}</p>
          <div className={styles.moodActions}>
            <button
              type="button"
              className={`${styles.moodButton} ${mood === 'focused' ? styles.moodActive : ''} ${isMoodBouncing ? styles.moodBounce : ''}`}
              onClick={() => handleMoodTap('focused')}
            >
              😌
            </button>
            <button
              type="button"
              className={`${styles.moodButton} ${mood === 'tired' ? styles.moodActive : ''} ${isMoodBouncing ? styles.moodBounce : ''}`}
              onClick={() => handleMoodTap('tired')}
            >
              😮‍💨
            </button>
            <button
              type="button"
              className={`${styles.moodButton} ${mood === 'motivated' ? styles.moodActive : ''} ${isMoodBouncing ? styles.moodBounce : ''}`}
              onClick={() => handleMoodTap('motivated')}
            >
              🔥
            </button>
          </div>
        </div>

        <section className={`${styles.summaryStrip} ${styles.startupReveal} ${styles.revealDelay2}`} aria-label="Quick status summary">
          {summaryCards.map((item) => (
            <article key={item.id} className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{item.label}</p>
              <p className={styles.summaryValue}>{item.value}</p>
              <p className={styles.summaryNote}>{item.note}</p>
            </article>
          ))}
        </section>

        <section className={`${styles.financeSummaryCard} ${styles.startupReveal} ${styles.revealDelay2}`} aria-label="Finance summary">
          <div className={styles.financeSummaryHeader}>
            <div>
              <p className={styles.financeEyebrow}>Finance Pulse</p>
              <h2 className={styles.sectionTitle}>Finance Tracker snapshot</h2>
              <p className={styles.sectionLead}>
                See this month&apos;s balance, savings goal progress, and how much is left before you hit your target.
              </p>
            </div>

            <div className={styles.financeSummaryActions}>
              <button type="button" className={styles.secondaryButton} onClick={handleToggleFinanceBalance}>
                {financePrefs.hideBalanceOnDashboard ? 'Show balance' : 'Hide balance'}
              </button>
              {onNavigateToFinance && (
                <button type="button" className={styles.primaryButton} onClick={onNavigateToFinance}>
                  Open Finance Tracker
                </button>
              )}
            </div>
          </div>

          <div className={styles.financeSummaryBody}>
            <div className={styles.financeGaugePanel}>
              <div
                className={styles.financeGaugeCircle}
                style={{ '--value': `${financeSummary.progressPercent}%` }}
              >
                <div className={styles.financeGaugeInner}>
                  <span className={styles.financeGaugeValue}>
                    {financePrefs.hideBalanceOnDashboard ? 'Hidden' : formatMoney(financeSummary.balance)}
                  </span>
                  <span className={styles.financeGaugeLabel}>Current balance</span>
                </div>
              </div>

              <p className={styles.financeGaugeNote}>
                {financeSummary.totalEntries > 0
                  ? `${formatMoney(financeSummary.remainingToGoal)} left to your savings goal`
                  : 'Add income and expenses in Finance Tracker to unlock your snapshot.'}
              </p>

              <p className={styles.financePrivacyNote}>
                {financePrefs.hideBalanceOnDashboard
                  ? 'Balance is hidden on the dashboard.'
                  : 'Balance is visible on the dashboard.'}
              </p>
            </div>

            <div className={styles.financeStatsGrid}>
              <article className={styles.financeStatCard}>
                <span className={styles.financeStatLabel}>This Month</span>
                <strong className={styles.financeStatValue}>{financeSummary.monthLabel}</strong>
                <p className={styles.financeStatNote}>Monthly snapshot from your logged finance entries.</p>
              </article>

              <article className={styles.financeStatCard}>
                <span className={styles.financeStatLabel}>Income</span>
                <strong className={styles.financeStatValue}>{formatMoney(financeSummary.monthIncome)}</strong>
                <p className={styles.financeStatNote}>All income logged this month.</p>
              </article>

              <article className={styles.financeStatCard}>
                <span className={styles.financeStatLabel}>Expenses</span>
                <strong className={styles.financeStatValue}>{formatMoney(financeSummary.monthExpense)}</strong>
                <p className={styles.financeStatNote}>What you&apos;ve spent so far this month.</p>
              </article>

              <article className={styles.financeStatCard}>
                <span className={styles.financeStatLabel}>Left to Goal</span>
                <strong className={styles.financeStatValue}>{formatMoney(financeSummary.remainingToGoal)}</strong>
                <p className={styles.financeStatNote}>
                  {financeSummary.progressPercent > 0
                    ? `${Math.round(financeSummary.progressPercent)}% of your savings target covered.`
                    : 'Set a savings goal inside Finance Tracker.'}
                </p>
              </article>

              <article className={styles.financeStatCard}>
                <span className={styles.financeStatLabel}>Low-Balance Mark</span>
                <strong className={styles.financeStatValue}>{formatMoney(financeSummary.lowBalanceThreshold)}</strong>
                <p className={styles.financeStatNote}>
                  {financeSummary.isLowBalance
                    ? 'You are at or below your alert level.'
                    : 'Your balance is above the warning threshold.'}
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className={`${styles.toolsHubCard} ${styles.startupReveal} ${styles.revealDelay2}`}>
          <div className={styles.toolsHubHeader}>
            <h2 className={styles.sectionTitle}>Tools Launcher</h2>
            <p className={styles.sectionLead}>Open each module like an app from your dashboard.</p>
          </div>

          <div className={styles.toolsHubGrid}>
            {toolHubItems.map((tool) => (
              <article key={tool.id} className={styles.toolHubItem}>
                <div className={styles.toolHubMeta}>
                  <div className={styles.toolHubIcon}>{tool.icon}</div>
                  <h3 className={styles.toolHubName}>{tool.name}</h3>
                  <p className={styles.toolHubSummary}>{tool.summary}</p>
                  <span className={`${styles.toolHubStatus} ${tool.isLive ? styles.toolHubStatusLive : styles.toolHubStatusPending}`}>
                    {tool.status}
                  </span>
                </div>

                <button
                  type="button"
                  className={tool.isLive ? styles.primaryButton : styles.secondaryButton}
                  onClick={tool.onOpen}
                  disabled={!tool.isLive}
                >
                  {tool.actionLabel}
                </button>
              </article>
            ))}
          </div>
        </section>

        <div className={`${styles.panelNav} ${styles.startupReveal} ${styles.revealDelay2}`}>
          {orderedPanels.map((panelId, index) => (
            <button
              key={panelId}
              type="button"
              className={`${styles.panelTab} ${index === activePanel ? styles.panelTabActive : ''}`}
              onClick={() => handlePanelSelect(index)}
            >
              {PANEL_META[panelId].title}
            </button>
          ))}
        </div>

        <main className={`${styles.mainGrid} ${styles.startupReveal} ${styles.revealDelay3}`}>
          <div
            className={panelClasses}
            onTouchStart={handleSwipeStart}
            onTouchEnd={handleSwipeEnd}
          >
            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>Academic Progress</h2>
              <p className={styles.sectionLead}>{PANEL_META.academic.insight}</p>

              <div className={styles.gaugeRow}>
                <button
                  type="button"
                  className={`${styles.gaugeCard} ${styles.tooltipHost}`}
                  onClick={() => setExpandedGauge('cgpa')}
                >
                  <span className={styles.tooltipText}>Tap for detailed analytics</span>
                  <div className={styles.gaugeCircle} style={{ '--value': `${currentPercent}%` }}>
                    <span>{cgpaSummary.currentCgpa !== null ? cgpaSummary.currentCgpa.toFixed(2) : '—'}</span>
                  </div>
                  <p>CGPA</p>
                </button>

                <button
                  type="button"
                  className={`${styles.gaugeCard} ${styles.tooltipHost}`}
                  onClick={() => setExpandedGauge('score')}
                >
                  <span className={styles.tooltipText}>Pulse reflects current task and study data</span>
                  <div className={`${styles.gaugeCircle} ${styles.scorePulse}`} style={{ '--value': `${crymsonScore}%` }}>
                    <span>{Math.round(crymsonScore)}</span>
                  </div>
                  <p>Momentum Score</p>
                </button>
              </div>

              <div className={styles.metricBars}>
                <div className={styles.metricRow}>
                  <span>Goal Reach</span>
                  <strong>{cgpaSummary.progress !== null ? `${cgpaSummary.progress.toFixed(1)}%` : '—'}</strong>
                </div>
                <div className={styles.metricTrack}>
                  <span className={styles.metricFill} style={{ width: `${Math.max(3, Math.min(100, cgpaSummary.progress || 0))}%` }} />
                </div>

                <div className={styles.metricRow}>
                  <span>Task Completion</span>
                  <strong>{dashboardTaskStats.total > 0 ? `${dashboardTaskStats.completionRate}%` : '—'}</strong>
                </div>
                <div className={styles.metricTrack}>
                  <span className={styles.metricFillDark} style={{ width: `${Math.max(3, dashboardTaskStats.completionRate || 0)}%` }} />
                </div>
              </div>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>What&apos;s Next?</h2>
              <p className={styles.sectionLead}>{PANEL_META.action.insight}</p>

              <div className={styles.actionList}>
                <article
                  className={styles.actionCard}
                  onPointerDown={() => beginLongPress('cgpa')}
                  onPointerUp={endLongPress}
                  onPointerLeave={endLongPress}
                >
                  <h3 className={styles.actionTitle}>CGPA Tracker</h3>
                  <p className={styles.actionText}>Update scores, monitor class trajectory, and project outcomes.</p>
                  <button type="button" className={styles.primaryButton} onClick={() => { trackPanelUse('action'); onNavigateToUserCGPA(); }}>
                    Open CGPA Tracker
                  </button>
                  {contextCard === 'cgpa' && (
                    <div className={styles.contextMenu}>
                      <button type="button" onClick={() => setContextCard(null)}>Edit Goal</button>
                      <button type="button" onClick={() => setContextCard(null)}>Add Reminder</button>
                    </div>
                  )}
                </article>

                <article
                  className={styles.actionCard}
                  onPointerDown={() => beginLongPress('todo')}
                  onPointerUp={endLongPress}
                  onPointerLeave={endLongPress}
                >
                  <h3 className={styles.actionTitle}>To-Do Planner</h3>
                  <p className={styles.actionText}>Keep assignments and exam blocks under control with priority cues.</p>
                  <button type="button" className={styles.secondaryButton} onClick={() => { trackPanelUse('action'); onNavigateToTodo(); }}>
                    Open To-Do Planner
                  </button>
                  {contextCard === 'todo' && (
                    <div className={styles.contextMenu}>
                      <button type="button" onClick={() => setContextCard(null)}>Add Reminder</button>
                      <button type="button" onClick={() => setContextCard(null)}>Move Priority</button>
                    </div>
                  )}
                </article>

                <article
                  className={styles.actionCard}
                  onPointerDown={() => beginLongPress('finance')}
                  onPointerUp={endLongPress}
                  onPointerLeave={endLongPress}
                >
                  <h3 className={styles.actionTitle}>Finance Tracker</h3>
                  <p className={styles.actionText}>Log allowance, expenses, and campus spending with student-friendly categories.</p>
                  <button type="button" className={styles.secondaryButton} onClick={() => { trackPanelUse('action'); if (onNavigateToFinance) onNavigateToFinance(); }}>
                    Open Finance Tracker
                  </button>
                  {contextCard === 'finance' && (
                    <div className={styles.contextMenu}>
                      <button type="button" onClick={() => setContextCard(null)}>Log Expense</button>
                      <button type="button" onClick={() => setContextCard(null)}>Add Income</button>
                    </div>
                  )}
                </article>
              </div>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>Life & Stats</h2>
              <p className={styles.sectionLead}>
                Real dashboard signals from your built tools. Pending items remain marked separately.
              </p>

              <div className={styles.lifeStatsGrid}>
                {realLifeStats.map((item) => (
                  <article key={item.label} className={styles.lifeStatCard}>
                    <p className={styles.lifeStatLabel}>{item.label}</p>
                    <p className={styles.lifeStatValue}>{item.value}</p>
                    <p className={styles.lifeStatNote}>{item.note}</p>
                  </article>
                ))}
              </div>

              <div className={styles.pendingGrid}>
                {pendingModules.map((module) => (
                  <article key={module.name} className={`${styles.pendingCard} ${styles.tooltipHost}`}>
                    <span className={styles.pendingBadge}>Pending</span>
                    <h4>{module.name}</h4>
                    <p>{module.status}</p>
                    <span className={styles.tooltipText}>This module will auto-activate when data pipeline is ready.</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </main>

        <section className={`${styles.dashboardSection} ${styles.startupReveal} ${styles.revealDelay4}`}>
        {cgpaSummary.showDashboardCard ? (
          <article className={styles.progressCard}>
            <h2 className={styles.progressTitle}>CGPA Goal Progress</h2>
            <p className={styles.progressMeta}>
              Current CGPA: <strong>{cgpaSummary.currentCgpa !== null ? cgpaSummary.currentCgpa.toFixed(2) : '—'}</strong>
              {'  '}|{'  '}
              Goal: <strong>{cgpaSummary.goalCgpa !== null ? cgpaSummary.goalCgpa.toFixed(2) : '—'}</strong>
              {cgpaSummary.showDashboardClassification && (
                <>
                  {'  '}|{'  '}
                  Class: <strong>{cgpaSummary.classification || '—'}</strong>
                </>
              )}
            </p>

            <div className={styles.ringLayout}>
              <div className={styles.ringWrapper} role="img" aria-label="Circular CGPA progress for current and goal values">
                <svg viewBox="0 0 140 140" className={styles.ringChart}>
                  <circle cx="70" cy="70" r={ringOuterRadius} className={styles.goalTrack} />
                  <circle
                    cx="70"
                    cy="70"
                    r={ringOuterRadius}
                    className={styles.goalRing}
                    strokeDasharray={ringOuterCircumference}
                    strokeDashoffset={goalDashoffset}
                    transform="rotate(-90 70 70)"
                  />
                  <circle cx="70" cy="70" r={ringInnerRadius} className={styles.currentTrack} />
                  <circle
                    cx="70"
                    cy="70"
                    r={ringInnerRadius}
                    className={styles.currentRing}
                    strokeDasharray={ringInnerCircumference}
                    strokeDashoffset={currentDashoffset}
                    transform="rotate(-90 70 70)"
                  />
                </svg>
                <div className={styles.ringCenter}>
                  <span className={styles.centerLabel}>Goal Reach</span>
                  <span className={styles.centerValue}>
                    {cgpaSummary.progress !== null ? `${cgpaSummary.progress.toFixed(1)}%` : '—'}
                  </span>
                </div>
              </div>

              <div className={styles.ringLegend}>
                <p className={styles.legendItem}>
                  <span className={`${styles.legendSwatch} ${styles.legendCurrent}`} />
                  Current level ({currentPercent.toFixed(1)}% of 5.00 scale)
                </p>
                <p className={styles.legendItem}>
                  <span className={`${styles.legendSwatch} ${styles.legendGoal}`} />
                  Goal target ({goalPercent.toFixed(1)}% of 5.00 scale)
                </p>
              </div>
            </div>

            <p className={styles.progressCaption}>
              {progressMessage}
            </p>
          </article>
        ) : (
          <article className={styles.progressCard}>
            <h2 className={styles.progressTitle}>CGPA Widget Hidden</h2>
            <p className={styles.progressCaption}>
              You turned off the dashboard CGPA widget in your tracker settings.
            </p>
            <button type="button" className={styles.secondaryButton} onClick={handleTurnOnDashboardCgpa}>
              Turn On Dashboard CGPA Widget
            </button>
          </article>
        )}
        </section>
      </div>

      {expandedGauge && (
        <div className={styles.modalOverlay} onClick={() => setExpandedGauge(null)}>
          <article className={styles.analyticsModal} onClick={(event) => event.stopPropagation()}>
            <h3>{expandedGauge === 'cgpa' ? 'CGPA Analytics' : 'Crymson Score Analytics'}</h3>
            <p>
              {expandedGauge === 'cgpa'
                ? 'Trend indicates steady performance against your stated graduation target.'
                : 'Score blends academic trajectory, completion consistency, and momentum signals.'}
            </p>
            <div className={styles.modalBars}>
              <div className={styles.metricRow}><span>Current</span><strong>{expandedGauge === 'cgpa' ? (cgpaSummary.currentCgpa?.toFixed(2) || '—') : Math.round(crymsonScore)}</strong></div>
              <div className={styles.metricTrack}><span className={styles.metricFill} style={{ width: `${expandedGauge === 'cgpa' ? currentPercent : crymsonScore}%` }} /></div>
              <div className={styles.metricRow}><span>Target</span><strong>{expandedGauge === 'cgpa' ? (cgpaSummary.goalCgpa?.toFixed(2) || '—') : '100'}</strong></div>
              <div className={styles.metricTrack}><span className={styles.metricFillDark} style={{ width: `${expandedGauge === 'cgpa' ? targetGoalPercent : 100}%` }} /></div>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={() => setExpandedGauge(null)}>
              Close
            </button>
          </article>
        </div>
      )}

      <TimerWidget />
    </div>
  );
}

export default UserHome;
