import React, { useEffect, useMemo, useState } from 'react';
import styles from './DashboardNew.module.css';
import { formatClock, getStudyStreakStats } from '../utils/timeFormatting';
import { getAuthToken } from '../utils/authSession';

const AUTH_API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:5000`;

const CGPA_STORAGE_KEY_BASE = 'crymson_user_cgpa_state_v1';
const TODO_STORAGE_KEY_BASE = 'crymson_todo_tasks';
const TIME_STORAGE_KEY_BASE = 'crymson_time_tracker_sessions';
const FINANCE_ENTRIES_KEY_BASE = 'crymson_finance_entries';
const FINANCE_PREFS_KEY_BASE = 'crymson_finance_prefs';

const Icons = {
  home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/></svg>,
  cgpa: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path d="M12 14l9-5-9-5-9 5 9 5z" opacity="0"/><path d="M21 12v7"/></svg>,
  tasks: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  time: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  finance: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  admin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  play: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  calc: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="16" y1="18" x2="16" y2="18.01"/></svg>,
  dollar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
};

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Icons.home },
  { id: 'cgpa', label: 'CGPA', icon: Icons.cgpa },
  { id: 'tasks', label: 'Tasks', icon: Icons.tasks },
  { id: 'time', label: 'Time', icon: Icons.time },
  { id: 'finance', label: 'Finance', icon: Icons.finance },
  { id: 'admin', label: 'Admin', icon: Icons.admin, adminOnly: true },
];

const getGradePoint = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  if (n >= 70) return 5;
  if (n >= 60) return 4;
  if (n >= 50) return 3;
  if (n >= 45) return 2;
  if (n >= 40) return 1;
  return 0;
};

const calculateFinalScore = (course) => {
  const direct = Number(course?.score);
  if (Number.isFinite(direct)) return direct;
  const t1 = Number(course?.test1Score);
  const t2 = Number(course?.test2Score);
  const exam = Number(course?.examScore);
  if (!Number.isFinite(t1) || !Number.isFinite(t2) || !Number.isFinite(exam)) return null;
  return t1 + t2 + exam;
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

const getCgpaSummary = (userId) => {
  const key = `${CGPA_STORAGE_KEY_BASE}:${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { currentCgpa: null, goalCgpa: null, classification: null };
    const parsed = JSON.parse(raw);
    const courses = Array.isArray(parsed.courses) ? parsed.courses : [];
    let totalUnits = 0, totalWeighted = 0;
    courses.forEach((c) => {
      const u = Number(c?.creditUnits);
      const s = calculateFinalScore(c);
      const gp = getGradePoint(s);
      if (Number.isFinite(u) && u > 0 && Number.isFinite(gp)) {
        totalUnits += u;
        totalWeighted += u * gp;
      }
    });
    const currentCgpa = totalUnits > 0 ? totalWeighted / totalUnits : null;
    const goalCgpa = Number.isFinite(Number(parsed.goalCgpa)) && Number(parsed.goalCgpa) > 0
      ? Math.min(5, Math.max(0, Number(parsed.goalCgpa))) : null;
    const classification = typeof parsed.classification === 'string' && parsed.classification
      ? parsed.classification : resolveClassification(currentCgpa);
    return { currentCgpa, goalCgpa, classification };
  } catch { return { currentCgpa: null, goalCgpa: null, classification: null }; }
};

const formatMoney = (value) => {
  const n = Number(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
};

const getFinanceSummary = (userId) => {
  const key = `${FINANCE_ENTRIES_KEY_BASE}:${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    const entries = raw ? JSON.parse(raw) : [];
    const normalized = Array.isArray(entries) ? entries.map(e => ({ ...e, kind: String(e?.kind || 'expense').toLowerCase() === 'income' ? 'income' : 'expense', amount: Number(e?.amount) || 0, date: String(e?.date || '') })) : [];
    const balance = normalized.reduce((s, e) => s + (e.kind === 'income' ? e.amount : -e.amount), 0);
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthEntries = normalized.filter(e => String(e.date || '').startsWith(monthKey));
    const income = monthEntries.reduce((s, e) => s + (e.kind === 'income' ? e.amount : 0), 0);
    const expense = monthEntries.reduce((s, e) => s + (e.kind === 'expense' ? e.amount : 0), 0);
    const prefsKey = `${FINANCE_PREFS_KEY_BASE}:${userId || 'guest'}`;
    let savingsGoal = 100;
    try {
      const prefsRaw = localStorage.getItem(prefsKey);
      if (prefsRaw) {
        const p = JSON.parse(prefsRaw);
        if (Number.isFinite(Number(p?.savingsGoalAmount)) && Number(p.savingsGoalAmount) > 0) savingsGoal = Number(p.savingsGoalAmount);
      }
    } catch {}
    return { balance, monthIncome: income, monthExpense: expense, savingsGoal };
  } catch { return { balance: 0, monthIncome: 0, monthExpense: 0, savingsGoal: 100 }; }
};

const normalizeTask = (t) => ({ ...t, courseTag: String(t?.courseTag || t?.subject || '').trim(), priority: ['high', 'medium', 'low'].includes(String(t?.priority || '').toLowerCase()) ? String(t.priority).toLowerCase() : 'medium', completed: Boolean(t?.completed) });

const normalizeSession = (s) => ({ ...s, courseTag: String(s?.courseTag || 'General Study').trim() || 'General Study', durationSeconds: Number(s?.durationSeconds) || 0 });

const PROGRESS_STATUS = (p) => {
  if (p === null || p === undefined) return 'pending';
  if (p >= 100) return 'complete';
  if (p >= 75) return 'strong';
  return 'building';
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function DashboardNew({ userId, userName, onNavigateToUserCGPA, onNavigateToTodo, onNavigateToTime, onNavigateToFinance, onNavigateToAdmin, onLogout, isAdmin = false }) {
  const displayName = userName || userId || 'User';
  const [activeNav, setActiveNav] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [cgpa, setCgpa] = useState(() => getCgpaSummary(userId));
  const [finance, setFinance] = useState(() => getFinanceSummary(userId));
  const [showBadge, setShowBadge] = useState(true);

  useEffect(() => { setCgpa(getCgpaSummary(userId)); }, [userId]);
  useEffect(() => { setFinance(getFinanceSummary(userId)); }, [userId]);

  useEffect(() => {
    const taskKey = `${TODO_STORAGE_KEY_BASE}:${userId || 'guest'}`;
    const sessionKey = `${TIME_STORAGE_KEY_BASE}:${userId || 'guest'}`;
    try {
      const rawT = localStorage.getItem(taskKey);
      if (rawT) { const p = JSON.parse(rawT); setTasks(Array.isArray(p) ? p.map(normalizeTask) : []); }
    } catch { setTasks([]); }
    try {
      const rawS = localStorage.getItem(sessionKey);
      if (rawS) { const p = JSON.parse(rawS); setSessions(Array.isArray(p) ? p.map(normalizeSession) : []); }
    } catch { setSessions([]); }

    const loadRemote = async () => {
      const token = getAuthToken();
      if (!token) return;
      try {
        const res = await fetch(`${AUTH_API_BASE_URL}/api/user-state/all`, { headers: { Authorization: `Bearer ${token}` } });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const state = payload.data && typeof payload.data === 'object' ? payload.data : null;
        if (!state) return;
        if (Array.isArray(state.tasks)) { setTasks(state.tasks.map(normalizeTask)); localStorage.setItem(taskKey, JSON.stringify(state.tasks)); }
        if (Array.isArray(state.timeSessions)) { setSessions(state.timeSessions.map(normalizeSession)); localStorage.setItem(sessionKey, JSON.stringify(state.timeSessions)); }
        if (state.finance && typeof state.finance === 'object') {
          if (Array.isArray(state.finance.entries)) localStorage.setItem(`${FINANCE_ENTRIES_KEY_BASE}:${userId || 'guest'}`, JSON.stringify(state.finance.entries));
          setFinance(getFinanceSummary(userId));
          setCgpa(getCgpaSummary(userId));
        }
      } catch {}
    };
    loadRemote();
  }, [userId]);

  const pendingTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.completed), [tasks]);
  const taskProgress = useMemo(() => tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0, [tasks, completedTasks]);

  const weekSessions = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return sessions.filter(s => new Date(s?.startedAt || s?.date || 0) >= weekStart);
  }, [sessions]);

  const weeklyStudySeconds = useMemo(() => weekSessions.reduce((s, sess) => s + (sess.durationSeconds || 0), 0), [weekSessions]);
  const streakStats = useMemo(() => getStudyStreakStats(sessions), [sessions]);
  const weeklyChartData = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const daySecs = Array(7).fill(0);
    weekSessions.forEach(s => {
      const d = new Date(s?.startedAt || s?.date || 0);
      const dayIndex = d.getDay();
      daySecs[dayIndex] += (s.durationSeconds || 0);
    });
    return DAYS.map((day, i) => ({ day, minutes: Math.round(daySecs[i] / 60) }));
  }, [weekSessions]);

  const coursePerformanceData = useMemo(() => {
    const key = `${CGPA_STORAGE_KEY_BASE}:${userId || 'guest'}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const courses = Array.isArray(parsed.courses) ? parsed.courses : [];
      return courses.slice(0, 6).map(c => ({
        code: String(c?.courseCode || c?.title || '').slice(0, 8),
        score: Number.isFinite(Number(c?.score)) ? Number(c.score) : (Number.isFinite(Number(c?.test1Score)) && Number.isFinite(Number(c?.examScore)) ? Number(c.test1Score) + Number(c.test2Score) + Number(c.examScore) : 0),
      }));
    } catch { return []; }
  }, [userId]);

  const navigateTo = (navId) => {
    setActiveNav(navId);
    switch (navId) {
      case 'cgpa': onNavigateToUserCGPA(); break;
      case 'tasks': onNavigateToTodo(); break;
      case 'time': onNavigateToTime(); break;
      case 'finance': onNavigateToFinance(); break;
      case 'admin': onNavigateToAdmin(); break;
      default: break;
    }
  };

  const visibleNav = useMemo(() => NAV_ITEMS.filter(item => !item.adminOnly || isAdmin), [isAdmin]);

  const [monthLabels, monthTotals] = useMemo(() => {
    const labels = [];
    const totals = [];
    const key = `${FINANCE_ENTRIES_KEY_BASE}:${userId || 'guest'}`;
    try {
      const raw = localStorage.getItem(key);
      const entries = raw ? JSON.parse(raw) : [];
      const normalized = Array.isArray(entries) ? entries.map(e => ({ ...e, kind: String(e?.kind || 'expense').toLowerCase() === 'income' ? 'income' : 'expense', amount: Number(e?.amount) || 0, date: String(e?.date || '') })) : [];
      const byMonth = {};
      normalized.forEach(e => {
        const m = (e.date || '').slice(0, 7);
        if (!m) return;
        if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 };
        if (e.kind === 'income') byMonth[m].income += e.amount;
        else byMonth[m].expense += e.amount;
      });
      const sorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
      sorted.forEach(([m, v]) => {
        const [y, mo] = m.split('-');
        const d = new Date(Number(y), Number(mo) - 1);
        labels.push(d.toLocaleString('en-US', { month: 'short' }));
        totals.push(v.expense);
      });
    } catch {}
    return [labels, totals];
  }, [userId]);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.profile}>
          <div className={styles.avatar}>{displayName.charAt(0).toUpperCase()}</div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{displayName}</span>
            <span className={styles.profileRole}>{isAdmin ? 'Admin' : 'Student'}</span>
          </div>
        </div>
        <nav className={styles.nav}>
          {visibleNav.map(item => (
            <button key={item.id} className={`${styles.navItem} ${activeNav === item.id ? styles.navItemActive : ''}`} onClick={() => navigateTo(item.id)}>
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className={styles.logoutBtn} onClick={onLogout}>
          <span className={styles.navIcon}>{Icons.logout}</span>
          <span className={styles.navLabel}>Log Out</span>
        </button>
      </aside>

      {showBadge && <div className={styles.badge} onClick={() => setShowBadge(false)}>Pro</div>}

      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {displayName.split(' ')[0]}</h1>
            <p className={styles.subtitle}>Here's your academic overview</p>
          </div>
        </div>

        <div className={styles.grid2col}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Pending Tasks</span>
              <span className={styles.cardCount}>{pendingTasks.length}</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${taskProgress}%` }} />
            </div>
            <span className={styles.progressLabel}>{taskProgress}% complete</span>
            <ul className={styles.taskList}>
              {pendingTasks.slice(0, 5).map((t, i) => (
                <li key={t?.id || t?._id || i} className={styles.taskItem}>
                  <span className={`${styles.priorityDot} ${styles[`priority${t.priority}`] || ''}`} />
                  <span className={styles.taskText}>{t?.title || t?.task || 'Untitled'}</span>
                  <span className={styles.taskMeta}>{t?.courseTag || t?.subject || ''}</span>
                </li>
              ))}
              {pendingTasks.length === 0 && <li className={styles.emptyState}>No pending tasks</li>}
            </ul>
            <button className={styles.cardAction} onClick={onNavigateToTodo}>View All Tasks</button>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Recent Finances</span>
              <span className={styles.cardBalance}>{formatMoney(finance.balance)}</span>
            </div>
            <div className={styles.financeStrip}>
              <div className={styles.financeItem}>
                <span className={styles.financeLabel}>Income</span>
                <span className={styles.financeIncome}>{formatMoney(finance.monthIncome)}</span>
              </div>
              <div className={styles.financeItem}>
                <span className={styles.financeLabel}>Expenses</span>
                <span className={styles.financeExpense}>{formatMoney(finance.monthExpense)}</span>
              </div>
            </div>
            <div className={styles.goalRow}>
              <span className={styles.financeLabel}>Savings Goal</span>
              <div className={styles.goalBar}>
                <div className={styles.goalFill} style={{ width: `${Math.min(100, (finance.balance / finance.savingsGoal) * 100)}%` }} />
              </div>
              <span className={styles.goalPct}>{Math.round(Math.min(100, (finance.balance / finance.savingsGoal) * 100))}%</span>
            </div>
            {monthLabels.length > 0 && (
              <div className={styles.miniChart}>
                {monthLabels.map((l, i) => (
                  <div key={l} className={styles.miniBarCol}>
                    <div className={styles.miniBar} style={{ height: `${Math.min(100, (monthTotals[i] / Math.max(...monthTotals, 1)) * 100)}%` }} />
                    <span className={styles.miniBarLabel}>{l}</span>
                  </div>
                ))}
              </div>
            )}
            <button className={styles.cardAction} onClick={onNavigateToFinance}>Manage Finances</button>
          </div>
        </div>

        <div className={styles.quickActions}>
          <span className={styles.sectionLabel}>Quick Access</span>
          <div className={styles.actionsRow}>
            <button className={styles.actionBtn} data-accent="green" onClick={onNavigateToTime}>
              <span className={styles.actionIcon}>{Icons.play}</span>
              <span className={styles.actionLabel}>Start Study</span>
            </button>
            <button className={styles.actionBtn} data-accent="purple" onClick={onNavigateToTodo}>
              <span className={styles.actionIcon}>{Icons.plus}</span>
              <span className={styles.actionLabel}>New Task</span>
            </button>
            <button className={styles.actionBtn} data-accent="green" onClick={onNavigateToUserCGPA}>
              <span className={styles.actionIcon}>{Icons.calc}</span>
              <span className={styles.actionLabel}>Calculate CGPA</span>
            </button>
            <button className={styles.actionBtn} data-accent="purple" onClick={onNavigateToFinance}>
              <span className={styles.actionIcon}>{Icons.dollar}</span>
              <span className={styles.actionLabel}>Log Expense</span>
            </button>
          </div>
        </div>

        <div className={styles.grid2col}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Course Performance</span>
              <span className={styles.cardBadge}>CGPA: {cgpa.currentCgpa !== null ? cgpa.currentCgpa.toFixed(2) : '--'}</span>
            </div>
            <div className={styles.chartArea}>
              {coursePerformanceData.length > 0 ? (
                <div className={styles.chartBars}>
                  {coursePerformanceData.map((c, i) => (
                    <div key={i} className={styles.chartBarCol}>
                      <div className={styles.chartBar} style={{ height: `${Math.min(100, (c.score / 100) * 100)}%` }} />
                      <span className={styles.chartBarLabel}>{c.code}</span>
                    </div>
                  ))}
                </div>
              ) : <div className={styles.emptyState}>No course data yet</div>}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Weekly Study Time</span>
              <span className={styles.cardBadge}>{Math.round(weeklyStudySeconds / 60)} min</span>
            </div>
            <div className={styles.chartArea}>
              <div className={styles.chartBars}>
                {weeklyChartData.map((d, i) => (
                  <div key={i} className={styles.chartBarCol}>
                    <div className={`${styles.chartBar} ${styles.chartBarPurple}`} style={{ height: `${Math.min(100, (d.minutes / Math.max(...weeklyChartData.map(x => x.minutes), 1)) * 70)}%` }} />
                    <span className={styles.chartBarLabel}>{d.day.slice(0, 2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.cardFooter}>
              <span>Streak: {streakStats.currentStreak || 0} days</span>
              <span>This week: {Math.round(weeklyStudySeconds / 60)}m</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardNew;
