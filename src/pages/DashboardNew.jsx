import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './DashboardNew.module.css';
import { formatClock, getStudyStreakStats } from '../utils/timeFormatting';
import apiClient from '../utils/apiClient';

const WIDGET_ORDER_KEY = 'crymson_dashboard_widget_order';
const DEFAULT_WIDGET_ORDER = ['cgpa', 'tasks', 'study', 'finance', 'wellbeing_score', 'insights'];

const TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#a0aec0',
  gold: '#f59e0b',
  'crimson-elite': '#dc2626',
};

const TIER_LABELS = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  'crimson-elite': 'Crimson Elite',
};

function getWidgetOrder() {
  try {
    const raw = localStorage.getItem(WIDGET_ORDER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_WIDGET_ORDER;
}

function saveWidgetOrder(order) {
  try {
    localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(order));
  } catch {}
}

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

function formatMoney(value) {
  const n = Number(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

/* ── Icons ── */
const Icons = {
  fire: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  warning: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  dollar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  heart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  star: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  lightbulb: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 008.91 14"/></svg>,
  drag: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg>,
};

/* ── Insight Card ── */
function InsightCard({ insight }) {
  const typeStyles = {
    warning: { border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.08)', icon: '#f59e0b' },
    achievement: { border: 'rgba(52,211,153,0.3)', bg: 'rgba(52,211,153,0.08)', icon: '#34d399' },
    alert: { border: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.08)', icon: '#f87171' },
    info: { border: 'rgba(96,165,250,0.3)', bg: 'rgba(96,165,250,0.08)', icon: '#60a5fa' },
    concern: { border: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.08)', icon: '#f87171' },
    goal: { border: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.08)', icon: '#a78bfa' },
    reminder: { border: 'rgba(96,165,250,0.3)', bg: 'rgba(96,165,250,0.08)', icon: '#60a5fa' },
    tip: { border: 'rgba(52,211,153,0.3)', bg: 'rgba(52,211,153,0.08)', icon: '#34d399' },
  };
  const s = typeStyles[insight.type] || typeStyles.info;

  return (
    <div className={styles.insightCard} style={{ borderColor: s.border, background: s.bg }}>
      <div className={styles.insightIcon} style={{ color: s.icon }}>{Icons[insight.icon] || Icons.star}</div>
      <div className={styles.insightBody}>
        <div className={styles.insightTitle}>{insight.title}</div>
        <div className={styles.insightMessage}>{insight.message}</div>
      </div>
    </div>
  );
}

/* ── Widget Components ── */

function CgpaWidget({ cgpa, onNavigate }) {
  if (!cgpa) return null;
  const gpa = cgpa.currentCgpa;
  const goal = cgpa.goalCgpa;
  const pct = goal && gpa ? Math.min(100, Math.round((gpa / goal) * 100)) : gpa ? Math.round((gpa / 5) * 100) : 0;
  const color = gpa >= 4.5 ? '#34d399' : gpa >= 3.5 ? '#60a5fa' : gpa >= 2.4 ? '#f59e0b' : '#f87171';

  return (
    <div className={`${styles.widget} ${styles.widgetCgpa}`}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>CGPA Snapshot</span>
        <button className={styles.widgetAction} onClick={onNavigate}>Details</button>
      </div>
      <div className={styles.cgpaRow}>
        <div className={styles.cgpaMain}>
          <span className={styles.cgpaValue} style={{ color }}>{gpa !== null ? gpa.toFixed(2) : '--'}</span>
          <span className={styles.cgpaGoal}>Goal: {goal !== null ? goal.toFixed(2) : 'Not set'}</span>
        </div>
        <div className={styles.cgpaRing}>
          <svg width="72" height="72" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round"/>
          </svg>
          <span className={styles.cgpaRingLabel}>{pct}%</span>
        </div>
      </div>
      <div className={styles.cgpaFooter}>
        {cgpa.classification && <span className={styles.classBadge}>{cgpa.classification}</span>}
        {cgpa.courses && <span className={styles.mutedText}>{cgpa.courses.length} courses</span>}
      </div>
    </div>
  );
}

function TasksWidget({ tasks, onNavigate }) {
  if (!tasks) return null;
  return (
    <div className={`${styles.widget} ${styles.widgetTasks}`}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>Tasks</span>
        <button className={styles.widgetAction} onClick={onNavigate}>View All</button>
      </div>
      <div className={styles.taskMetrics}>
        <div className={styles.taskMetric}>
          <span className={styles.taskMetricValue}>{tasks.pending}</span>
          <span className={styles.taskMetricLabel}>Pending</span>
        </div>
        <div className={styles.taskMetric}>
          <span className={styles.taskMetricValue} style={{ color: tasks.dueSoon > 0 ? '#f59e0b' : undefined }}>{tasks.dueSoon}</span>
          <span className={styles.taskMetricLabel}>Due Soon</span>
        </div>
        <div className={styles.taskMetric}>
          <span className={styles.taskMetricValue} style={{ color: tasks.overdue > 0 ? '#f87171' : undefined }}>{tasks.overdue}</span>
          <span className={styles.taskMetricLabel}>Overdue</span>
        </div>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressTrackBar}>
          <div className={styles.progressTrackFill} style={{ width: `${tasks.completionRate}%` }} />
        </div>
        <span className={styles.progressTrackLabel}>{tasks.completionRate}% done</span>
      </div>
    </div>
  );
}

function StudyWidget({ study }) {
  if (!study) return null;
  return (
    <div className={`${styles.widget} ${styles.widgetStudy}`}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>Study Hours</span>
        <span className={styles.studyWeekTotal}>{study.weeklyHours}h this week</span>
      </div>
      {study.courseHours && study.courseHours.length > 0 ? (
        <div className={styles.courseList}>
          {study.courseHours.map(c => (
            <div key={c.course} className={styles.courseRow}>
              <span className={styles.courseName}>{c.course}</span>
              <div className={styles.courseBarTrack}>
                <div
                  className={`${styles.courseBarFill} ${c.weekHours < 3 && c.weekHours > 0 ? styles.courseBarLow : ''}`}
                  style={{ width: `${Math.min(100, (c.weekHours / 10) * 100)}%` }}
                />
              </div>
              <span className={styles.courseHours}>{c.weekHours}h</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyWidget}>No study time recorded yet</div>
      )}
      <div className={styles.studyFooter}>
        <span>Streak: <strong>{study.currentStreakDays}d</strong></span>
      </div>
    </div>
  );
}

function FinanceWidget({ finance, onNavigate }) {
  if (!finance) return null;
  const pct = Math.min(100, finance.progressPercent || 0);
  return (
    <div className={`${styles.widget} ${styles.widgetFinance}`}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>Finance</span>
        <button className={styles.widgetAction} onClick={onNavigate}>Details</button>
      </div>
      <div className={styles.financeBalance}>
        <span className={styles.financeAmount}>{formatMoney(finance.balance)}</span>
      </div>
      <div className={styles.financeRow}>
        <div className={styles.financeItem}>
          <span className={styles.financeItemLabel}>Income</span>
          <span className={styles.financeIncome}>{formatMoney(finance.monthIncome)}</span>
        </div>
        <div className={styles.financeItem}>
          <span className={styles.financeItemLabel}>Expenses</span>
          <span className={styles.financeExpense}>{formatMoney(finance.monthExpense)}</span>
        </div>
      </div>
      <div className={styles.savingsRow}>
        <span className={styles.savingsLabel}>Savings goal: {formatMoney(finance.savingsGoal)}</span>
        <div className={styles.savingsTrack}>
          <div className={styles.savingsFill} style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.savingsPct}>{pct}%</span>
      </div>
    </div>
  );
}

function ScoreWidget({ score }) {
  if (!score) return null;
  const tierColor = TIER_COLORS[score.tier] || '#a78bfa';
  return (
    <div className={`${styles.widget} ${styles.widgetScore}`} style={{ borderColor: tierColor + '33' }}>
      <div className={styles.scoreTop}>
        <div className={styles.scoreRingOuter} style={{ borderColor: tierColor }}>
          <div className={styles.scoreRingInner}>
            <span className={styles.scoreValue} style={{ color: tierColor }}>{score.score}</span>
            <span className={styles.scoreLabel}>{TIER_LABELS[score.tier] || score.tier}</span>
          </div>
        </div>
        <div className={styles.scoreDims}>
          {Object.entries(score.dimensions || {}).map(([key, dim]) => (
            <div key={key} className={styles.scoreDim}>
              <span className={styles.scoreDimLabel}>{key}</span>
              <div className={styles.scoreDimBar}>
                <div className={styles.scoreDimFill} style={{ width: `${(dim.score / dim.max) * 100}%` }} />
              </div>
              <span className={styles.scoreDimValue}>{dim.score}</span>
            </div>
          ))}
        </div>
      </div>
      {score.nextTier && (
        <div className={styles.scoreNext}>
          {score.pointsToNextTier} pts to {score.nextTier}
        </div>
      )}
    </div>
  );
}

function WellbeingWidget({ wellbeing }) {
  if (!wellbeing) return null;
  const moodEmoji = ['', '😔', '😕', '😐', '😊', '😄'];
  const moodLabel = ['', 'Terrible', 'Low', 'Okay', 'Good', 'Amazing'];
  return (
    <div className={`${styles.widget} ${styles.widgetWellbeing}`}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>Wellbeing</span>
        <span className={styles.moodBadge}>
          {wellbeing.latestMood ? `${moodEmoji[wellbeing.latestMood] || ''} ${moodLabel[wellbeing.latestMood] || ''}` : 'No data'}
        </span>
      </div>
      <div className={styles.wellbeingMetrics}>
        <div className={styles.wellbeingMetric}>
          <span className={styles.wellbeingValue}>{wellbeing.recentCheckIns}</span>
          <span className={styles.wellbeingLabel}>Recent check-ins</span>
        </div>
        <div className={styles.wellbeingMetric}>
          <span className={styles.wellbeingValue}>{wellbeing.uniqueDays}</span>
          <span className={styles.wellbeingLabel}>Days (30d)</span>
        </div>
        <div className={styles.wellbeingMetric}>
          <span className={styles.wellbeingValue}>{wellbeing.avgMood !== null ? wellbeing.avgMood.toFixed(1) : '--'}</span>
          <span className={styles.wellbeingLabel}>Avg mood</span>
        </div>
      </div>
    </div>
  );
}

/* ── Draggable Widget Grid ── */

function DraggableWidget({ id, children, index, onDragStart, onDragOver, onDrop, onDragEnd, isDragging }) {
  return (
    <div
      className={`${styles.widgetWrapper} ${isDragging ? styles.dragging : ''}`}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', id); onDragStart(index); }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => { e.preventDefault(); onDrop(index); }}
      onDragEnd={onDragEnd}
    >
      <div className={styles.dragHandle}>
        {Icons.drag}
      </div>
      {children}
    </div>
  );
}

/* ── Main Dashboard ── */

export default function DashboardNew({
  userId, userName, onNavigateToUserCGPA, onNavigateToTodo,
  onNavigateToTime, onNavigateToFinance, isAdmin = false,
}) {
  const displayName = userName || userId || 'User';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [widgetOrder, setWidgetOrder] = useState(() => getWidgetOrder());
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [showBriefing, setShowBriefing] = useState(() => {
    try { return localStorage.getItem('crymson_briefing_dismissed') !== 'true'; } catch { return true; }
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/dashboard');
      setData(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const dismissBriefing = () => {
    setShowBriefing(false);
    try { localStorage.setItem('crymson_briefing_dismissed', 'true'); } catch {}
  };

  /* ── Drag and Drop ── */
  const handleDragStart = (idx) => setDraggedIdx(idx);
  const handleDragOver = (idx) => {
    if (draggedIdx === null || draggedIdx === idx) return;
    const newOrder = [...widgetOrder];
    const [removed] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(idx, 0, removed);
    setWidgetOrder(newOrder);
    setDraggedIdx(idx);
    saveWidgetOrder(newOrder);
  };
  const handleDrop = () => setDraggedIdx(null);
  const handleDragEnd = () => setDraggedIdx(null);

  /* ── Widget Map ── */
  const widgets = {
    cgpa: { component: <CgpaWidget cgpa={data?.cgpa} onNavigate={onNavigateToUserCGPA} />, label: 'CGPA' },
    tasks: { component: <TasksWidget tasks={data?.tasks} onNavigate={onNavigateToTodo} />, label: 'Tasks' },
    study: { component: <StudyWidget study={data?.study} />, label: 'Study Hours' },
    finance: { component: <FinanceWidget finance={data?.finance} onNavigate={onNavigateToFinance} />, label: 'Finance' },
    wellbeing_score: { component: <ScoreWidget score={data?.score} />, label: 'Crymson Score' },
    insights: { component: data?.insights?.length > 0 ? (
      <div className={`${styles.widget} ${styles.widgetInsights}`}>
        <div className={styles.widgetHeader}>
          <span className={styles.widgetTitle}>AI Insights</span>
          <span className={styles.insightCount}>{data.insights.length}</span>
        </div>
        <div className={styles.insightList}>
          {data.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      </div>
    ) : null, label: 'Insights' },
  };

  const visibleWidgets = widgetOrder.filter(id => widgets[id] && widgets[id].component !== null);

  /* ── Briefing ── */
  const briefing = data?.briefing;
  const score = data?.score;

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loadingState}>Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Greeting + Score Banner */}
      <div className={styles.banner}>
        <div className={styles.greetingArea}>
          <h1 className={styles.greeting}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {displayName.split(' ')[0]}
          </h1>
          <p className={styles.bannerSub}>
            {score
              ? `${TIER_LABELS[score.tier] || score.tier} · ${score.score} pts`
              : 'Here\'s your academic overview'}
          </p>
        </div>
        {score && (
          <div className={styles.scorePill} style={{ background: (TIER_COLORS[score.tier] || '#a78bfa') + '22', borderColor: (TIER_COLORS[score.tier] || '#a78bfa') + '44' }}>
            <span className={styles.scorePillValue} style={{ color: TIER_COLORS[score.tier] || '#a78bfa' }}>{score.score}</span>
            <span className={styles.scorePillLabel}>{TIER_LABELS[score.tier] || score.tier}</span>
          </div>
        )}
      </div>

      {/* Briefing Bar */}
      {briefing && showBriefing && (
        <div className={styles.briefing}>
          <div className={styles.briefingHeader}>
            <span className={styles.briefingTitle}>{briefing.greeting} Briefing</span>
            <button className={styles.briefingDismiss} onClick={dismissBriefing}>Dismiss</button>
          </div>
          <div className={styles.briefingItems}>
            {briefing.items.map((item, i) => (
              <div key={i} className={styles.briefingItem}>
                <span className={styles.briefingValue}>{item.label}</span>
                <span className={styles.briefingDetail}>{item.detail}</span>
              </div>
            ))}
          </div>
          {briefing.topInsight && (
            <div className={styles.briefingInsight}>
              <InsightCard insight={briefing.topInsight} />
            </div>
          )}
        </div>
      )}

      {/* Widget Grid */}
      <div className={styles.widgetGrid}>
        {visibleWidgets.map((id, idx) => {
          const w = widgets[id];
          if (!w) return null;
          return (
            <DraggableWidget
              key={id}
              id={id}
              index={idx}
              isDragging={draggedIdx === idx}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            >
              {w.component}
            </DraggableWidget>
          );
        })}
      </div>

      {/* Empty state if no data at all */}
      {!data && (
        <div className={styles.emptyState}>
          <h2>Welcome to Crymson</h2>
          <p>Start using the tools below to populate your dashboard.</p>
        </div>
      )}
    </div>
  );
}
