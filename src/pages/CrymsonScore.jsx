import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { computeCrymsonScore, getScoreHistory, getTier } from '../utils/crymsonScore';
import { getStudyStreakStats } from '../utils/timeFormatting';
import { getAuthToken } from '../utils/authSession';
import styles from './CrymsonScore.module.css';

const AUTH_API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
const USER_CGPA_STATE_KEY_BASE = 'crymson_user_cgpa_state_v1';
const TODO_STORAGE_KEY_BASE = 'crymson_todo_tasks';
const TIME_TRACKER_STORAGE_KEY_BASE = 'crymson_time_tracker_sessions';
const FINANCE_ENTRIES_STORAGE_KEY_BASE = 'crymson_finance_entries';
const FINANCE_PREFS_STORAGE_KEY_BASE = 'crymson_finance_prefs';

const TIER_IMAGES = {
  bronze: { emoji: '🟤', desc: 'Getting started — every journey begins with a single step.' },
  silver: { emoji: '⚪', desc: 'Building momentum — consistency is starting to show.' },
  gold: { emoji: '🟡', desc: 'Strong habits — you\'re in control of your semester.' },
  'crimson-elite': { emoji: '🔴', desc: 'Peak performance — mastery across every dimension.' },
};

const TIER_CARDS = [
  { id: 'bronze', label: 'Bronze', range: '0 – 39', color: '#cd7f32' },
  { id: 'silver', label: 'Silver', range: '40 – 59', color: '#a0aec0' },
  { id: 'gold', label: 'Gold', range: '60 – 79', color: '#f59e0b' },
  { id: 'crimson-elite', label: 'Crimson Elite', range: '80 – 100', color: '#dc2626' },
];

function getCgpaSummary(activeUserId) {
  try {
    const raw = localStorage.getItem(`${USER_CGPA_STATE_KEY_BASE}:${activeUserId || 'guest'}`);
    if (!raw) return { currentCgpa: null, goalCgpa: null, progress: null };
    const parsed = JSON.parse(raw);
    const courses = Array.isArray(parsed.courses) ? parsed.courses : [];
    let totalUnits = 0, totalWeighted = 0;
    for (const course of courses) {
      const units = Number(course?.creditUnits);
      const directScore = Number(course?.score);
      let finalScore;
      if (Number.isFinite(directScore)) {
        finalScore = directScore;
      } else {
        const t1 = Number(course?.test1Score), t2 = Number(course?.test2Score), e = Number(course?.examScore);
        if (Number.isFinite(t1) && Number.isFinite(t2) && Number.isFinite(e)) {
          finalScore = t1 + t2 + e;
        }
      }
      const gradePoint = Number.isFinite(finalScore)
        ? (finalScore >= 70 ? 5 : finalScore >= 60 ? 4 : finalScore >= 50 ? 3 : finalScore >= 45 ? 2 : finalScore >= 40 ? 1 : 0)
        : null;
      if (Number.isFinite(units) && units > 0 && Number.isFinite(gradePoint)) {
        totalUnits += units;
        totalWeighted += units * gradePoint;
      }
    }
    const currentCgpa = totalUnits > 0 ? totalWeighted / totalUnits : null;
    const goalCgpa = Number.isFinite(Number(parsed.goalCgpa)) ? Math.min(5, Math.max(0, Number(parsed.goalCgpa))) : null;
    const progress = currentCgpa !== null && goalCgpa !== null && goalCgpa > 0
      ? Math.min(100, Math.max(0, (currentCgpa / goalCgpa) * 100)) : null;
    return { currentCgpa, goalCgpa, progress };
  } catch {
    return { currentCgpa: null, goalCgpa: null, progress: null };
  }
}

function getTaskStats(userId) {
  try {
    const raw = localStorage.getItem(`${TODO_STORAGE_KEY_BASE}:${userId || 'guest'}`);
    const tasks = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(tasks) || tasks.length === 0) return { total: 0, completed: 0, completionRate: 0 };
    const completed = tasks.filter((t) => t.completed).length;
    return { total: tasks.length, completed, completionRate: Math.round((completed / tasks.length) * 100) };
  } catch {
    return { total: 0, completed: 0, completionRate: 0 };
  }
}

function getStudyStats(userId) {
  try {
    const raw = localStorage.getItem(`${TIME_TRACKER_STORAGE_KEY_BASE}:${userId || 'guest'}`);
    const sessions = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(sessions)) return { weekSeconds: 0, currentStreakDays: 0 };
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekMs = weekStart.getTime();
    const weekSeconds = sessions.filter((s) => {
      const t = new Date(s.startedAt || '').getTime();
      return Number.isFinite(t) && t >= weekMs;
    }).reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
    const streakStats = getStudyStreakStats(sessions);
    return { weekSeconds, currentStreakDays: streakStats.currentStreakDays };
  } catch {
    return { weekSeconds: 0, currentStreakDays: 0 };
  }
}

function getFinanceSummary(userId) {
  try {
    const raw = localStorage.getItem(`${FINANCE_ENTRIES_STORAGE_KEY_BASE}:${userId || 'guest'}`);
    const entries = raw ? JSON.parse(raw) : [];
    const prefsRaw = localStorage.getItem(`${FINANCE_PREFS_STORAGE_KEY_BASE}:${userId || 'guest'}`);
    const prefs = prefsRaw ? JSON.parse(prefsRaw) : {};
    const normalized = Array.isArray(entries) ? entries.map((e) => ({
      ...e,
      kind: String(e?.kind || 'expense').toLowerCase() === 'income' ? 'income' : 'expense',
      amount: Number(e?.amount) || 0,
      date: String(e?.date || ''),
    })) : [];
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const monthEntries = normalized.filter((e) => e.date.startsWith(currentMonthKey));
    const monthIncome = monthEntries.reduce((s, e) => s + (e.kind === 'income' ? e.amount : 0), 0);
    const monthExpense = monthEntries.reduce((s, e) => s + (e.kind === 'expense' ? e.amount : 0), 0);
    const savingsGoalAmount = Number.isFinite(Number(prefs?.savingsGoalAmount)) && Number(prefs.savingsGoalAmount) > 0
      ? Number(prefs.savingsGoalAmount) : 100;
    const monthBalance = monthIncome - monthExpense;
    const progressPercent = savingsGoalAmount > 0
      ? Math.min(100, Math.max(0, (monthBalance / savingsGoalAmount) * 100)) : 0;
    return { totalEntries: normalized.length, monthIncome, monthExpense, progressPercent, savingsGoalAmount };
  } catch {
    return { totalEntries: 0, monthIncome: 0, monthExpense: 0, progressPercent: 0, savingsGoalAmount: 100 };
  }
}

function getWellbeingData(userId) {
  try {
    const raw = localStorage.getItem(`crymson_wellbeing_checkins:${userId || 'guest'}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function CrymsonScore({ activeUserId }) {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cgpaSummary = getCgpaSummary(activeUserId);
    const dashboardTaskStats = getTaskStats(activeUserId);
    const dashboardStudyStats = getStudyStats(activeUserId);
    const financeSummary = getFinanceSummary(activeUserId);
    const wellbeingCheckIns = getWellbeingData(activeUserId);

    const scoreResult = computeCrymsonScore({
      cgpaSummary,
      dashboardTaskStats,
      dashboardStudyStats,
      financeSummary,
      wellbeingCheckIns,
      userId: activeUserId,
    });
    setResult(scoreResult);
    setHistory(getScoreHistory(activeUserId));
    setLoading(false);
  }, [activeUserId]);

  const chartData = useMemo(() => {
    if (history.length < 2) return null;
    return history.map((h) => ({
      date: h.date.slice(0, 10),
      score: h.score,
      tier: h.tier,
    }));
  }, [history]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Unable to compute score.</div>
      </div>
    );
  }

  const { score, tier, nextTier, pointsToNextTier, dimensions, weekOverWeek } = result;
  const dims = Object.values(dimensions);
  const tierInfo = TIER_IMAGES[tier.id] || TIER_IMAGES.bronze;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Crymson Score</p>
          <h1 className={styles.title}>Your Total Score</h1>
          <p className={styles.subtitle}>
            A single score reflecting how well you're managing your entire life — across academics, habits, and wellbeing.
          </p>
        </div>
      </header>

      <div className={styles.scoreHero}>
        <div className={styles.scoreRing} style={{ borderColor: tier.color }}>
          <span className={styles.scoreValue}>{score}</span>
          <span className={styles.scoreMax}>/100</span>
          <span className={styles.scoreTier} style={{ color: tier.color }}>{tier.label}</span>
        </div>
        <div className={styles.scoreMeta}>
          <h2 className={styles.tierTitle} style={{ color: tier.color }}>{tierInfo.emoji} {tier.label}</h2>
          <p className={styles.tierDesc}>{tierInfo.desc}</p>
          {weekOverWeek && (
            <div className={`${styles.wow} ${weekOverWeek.direction === 'up' ? styles.wowUp : weekOverWeek.direction === 'down' ? styles.wowDown : styles.wowFlat}`}>
              {weekOverWeek.direction === 'up' && '↑'} {weekOverWeek.direction === 'down' && '↓'} {weekOverWeek.direction === 'flat' && '—'} {weekOverWeek.change} from last week
            </div>
          )}
          {nextTier && (
            <p className={styles.nextTier}>
              {pointsToNextTier} point{pointsToNextTier !== 1 ? 's' : ''} to {nextTier.label}
            </p>
          )}
        </div>
      </div>

      <div className={styles.dimensionsSection}>
        <h3 className={styles.sectionTitle}>Dimension Breakdown</h3>
        <div className={styles.dimensionsGrid}>
          {dims.map((d) => (
            <div key={d.label} className={styles.dimensionCard}>
              <div className={styles.dimHeader}>
                <span className={styles.dimLabel}>{d.label}</span>
                <span className={styles.dimScore}>{d.score}/{d.max}</span>
              </div>
              <div className={styles.dimBar}>
                <div
                  className={styles.dimFill}
                  style={{ width: `${d.percent}%` }}
                />
              </div>
              <p className={styles.dimDetail}>{d.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {chartData && chartData.length >= 2 && (
        <div className={styles.chartSection}>
          <h3 className={styles.sectionTitle}>Score History</h3>
          <div className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T12:00:00');
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(value) => [`${value}/100`, 'Score']}
                  labelFormatter={(v) => {
                    const d = new Date(v + 'T12:00:00');
                    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  }}
                />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="url(#scoreGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className={styles.tiersSection}>
        <h3 className={styles.sectionTitle}>Tiers</h3>
        <p className={styles.tiersIntro}>
          Your tier reflects your overall balance. Progress through the ranks by improving across all five dimensions.
        </p>
        <div className={styles.tiersGrid}>
          {TIER_CARDS.map((t) => (
            <div
              key={t.id}
              className={`${styles.tierCard} ${tier.id === t.id ? styles.tierCardActive : ''}`}
              style={tier.id === t.id ? { borderColor: t.color, boxShadow: `0 0 20px ${t.color}22` } : {}}
            >
              <span className={styles.tierRange}>{t.range}</span>
              <span className={styles.tierLabel} style={{ color: t.color }}>{t.label}</span>
              {tier.id === t.id && <span className={styles.tierCurrent}>Current</span>}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.breakdownSection}>
        <h3 className={styles.sectionTitle}>How It's Calculated</h3>
        <div className={styles.breakdownList}>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownWeight}>25%</span>
            <span className={styles.breakdownLabel}>CGPA Progress</span>
            <span className={styles.breakdownSource}>CGPA Tracker</span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownWeight}>20%</span>
            <span className={styles.breakdownLabel}>Study Consistency</span>
            <span className={styles.breakdownSource}>Time Tracker</span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownWeight}>20%</span>
            <span className={styles.breakdownLabel}>Task Completion</span>
            <span className={styles.breakdownSource}>Task Manager</span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownWeight}>20%</span>
            <span className={styles.breakdownLabel}>Financial Discipline</span>
            <span className={styles.breakdownSource}>Finance Tracker</span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownWeight}>15%</span>
            <span className={styles.breakdownLabel}>Wellbeing Consistency</span>
            <span className={styles.breakdownSource}>Mood & Energy Log</span>
          </div>
        </div>
      </div>
    </div>
  );
}
