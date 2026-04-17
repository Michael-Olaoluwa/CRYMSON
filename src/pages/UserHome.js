import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './UserHome.module.css';

const USER_CGPA_STATE_KEY = 'crymson_user_cgpa_state_v1';
const DASHBOARD_USAGE_KEY = 'crymson_dashboard_usage_v1';

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

const getCgpaSummary = () => {
  try {
    const raw = localStorage.getItem(USER_CGPA_STATE_KEY);
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

function UserHome({ userId, userName, onNavigateToUserCGPA, onNavigateToTodo, onNavigateToTime, onLogout }) {
  const displayName = userName || userId || 'Michael';
  const [cgpaSummary, setCgpaSummary] = useState(() => getCgpaSummary());
  const [usage, setUsage] = useState(() => getStoredUsage());
  const [isBooting, setIsBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootQuote, setBootQuote] = useState(BOOT_QUOTES[0]);
  const [activePanel, setActivePanel] = useState(0);
  const [expandedGauge, setExpandedGauge] = useState(null);
  const [aiToasts, setAiToasts] = useState([]);
  const [contextCard, setContextCard] = useState(null);
  const [mood, setMood] = useState('focused');
  const [isMoodBouncing, setIsMoodBouncing] = useState(false);
  const [tasks, setTasks] = useState([
    { id: 't1', title: 'Review Algorithms quiz pack', done: false },
    { id: 't2', title: 'Finalize ECON group brief', done: false },
  ]);

  const touchStartRef = useRef(0);
  const longPressTimerRef = useRef(null);

  const targetGoalPercent = cgpaSummary.goalCgpa !== null
    ? Math.min(100, Math.max(0, (cgpaSummary.goalCgpa / 5) * 100))
    : 0;
  const targetCurrentPercent = cgpaSummary.currentCgpa !== null
    ? Math.min(100, Math.max(0, (cgpaSummary.currentCgpa / 5) * 100))
    : 0;

  const ringTone = getRingTone(cgpaSummary.progress);

  const crymsonScore = useMemo(() => {
    const cgpaScore = cgpaSummary.currentCgpa !== null ? (cgpaSummary.currentCgpa / 5) * 80 : 34;
    const taskBonus = tasks.filter((task) => task.done).length * 10;
    return Math.min(100, Math.max(0, cgpaScore + taskBonus));
  }, [cgpaSummary.currentCgpa, tasks]);

  const orderedPanels = useMemo(() => {
    return [...PANEL_IDS].sort((left, right) => (usage[right] || 0) - (usage[left] || 0));
  }, [usage]);

  const currentPanelId = orderedPanels[activePanel] || orderedPanels[0];

  useEffect(() => {
    localStorage.setItem(DASHBOARD_USAGE_KEY, JSON.stringify(usage));
  }, [usage]);

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

    const aiSuggestionTimer = window.setTimeout(() => {
      setAiToasts((prev) => [
        ...prev,
        { id: `toast-${Date.now()}`, title: 'AI Suggestion Detected', body: 'Detected new assignment in uploaded syllabus.' }
      ]);
    }, 2400);

    const reminderTimer = window.setTimeout(() => {
      setAiToasts((prev) => [
        ...prev,
        { id: `toast-${Date.now()}-2`, title: 'Smart Reminder', body: 'You have not logged study time today. Start now?' }
      ]);
    }, 4200);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(aiSuggestionTimer);
      window.clearTimeout(reminderTimer);
    };
  }, []);

  useEffect(() => {
    if (aiToasts.length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAiToasts((prev) => prev.slice(1));
    }, 3600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [aiToasts]);

  const goalPercent = isBooting ? 0 : targetGoalPercent;
  const currentPercent = isBooting ? 0 : targetCurrentPercent;

  const ringOuterRadius = 56;
  const ringInnerRadius = 42;
  const ringOuterCircumference = 2 * Math.PI * ringOuterRadius;
  const ringInnerCircumference = 2 * Math.PI * ringInnerRadius;
  const goalDashoffset = ringOuterCircumference * (1 - goalPercent / 100);
  const currentDashoffset = ringInnerCircumference * (1 - currentPercent / 100);

  const handleTurnOnDashboardCgpa = () => {
    try {
      const raw = localStorage.getItem(USER_CGPA_STATE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        USER_CGPA_STATE_KEY,
        JSON.stringify({ ...parsed, showDashboardCard: true })
      );
      setCgpaSummary(getCgpaSummary());
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

  const toggleTask = (taskId) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)));
    if (navigator.vibrate) {
      navigator.vibrate(14);
    }
  };

  const handleMoodTap = (nextMood) => {
    setMood(nextMood);
    setIsMoodBouncing(true);
    window.setTimeout(() => setIsMoodBouncing(false), 340);
  };

  const completionRate = Math.round((tasks.filter((task) => task.done).length / tasks.length) * 100);

  const toolHubItems = [
    {
      id: 'cgpa',
      name: 'CGPA Tracker',
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
      id: 'focus',
      name: 'Focus Analytics',
      summary: 'See productivity trends and deep-work patterns.',
      status: 'Coming Soon',
      isLive: false,
      actionLabel: 'Coming Soon',
    },
    {
      id: 'finance',
      name: 'Finance Tracker',
      summary: 'Track spending for school and personal budgets.',
      status: 'Coming Soon',
      isLive: false,
      actionLabel: 'Coming Soon',
    },
    {
      id: 'social',
      name: 'Social Layer',
      summary: 'Connect with classmates and study groups.',
      status: 'Coming Soon',
      isLive: false,
      actionLabel: 'Coming Soon',
    },
  ];

  const pendingModules = [
    { name: 'AI Study Planner', status: 'Coming Soon' },
    { name: 'Finance Tracker', status: 'Data Sync Pending' },
    { name: 'Social Layer', status: 'Activation Pending' },
    { name: 'Semester Wrapped', status: 'Locked for Current Term' },
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

        <section className={`${styles.toolsHubCard} ${styles.startupReveal} ${styles.revealDelay2}`}>
          <div className={styles.toolsHubHeader}>
            <h2 className={styles.sectionTitle}>Tools Launcher</h2>
            <p className={styles.sectionLead}>Open each module like an app from your dashboard.</p>
          </div>

          <div className={styles.toolsHubGrid}>
            {toolHubItems.map((tool) => (
              <article key={tool.id} className={styles.toolHubItem}>
                <div className={styles.toolHubMeta}>
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
                  <span className={styles.tooltipText}>Pulse reflects recent updates</span>
                  <div className={`${styles.gaugeCircle} ${styles.scorePulse}`} style={{ '--value': `${crymsonScore}%` }}>
                    <span>{Math.round(crymsonScore)}</span>
                  </div>
                  <p>Crymson Score</p>
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
                  <strong>{completionRate}%</strong>
                </div>
                <div className={styles.metricTrack}>
                  <span className={styles.metricFillDark} style={{ width: `${Math.max(3, completionRate)}%` }} />
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
              </div>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>Life & Stats</h2>
              <p className={styles.sectionLead}>{PANEL_META.life.insight}</p>

              <div className={styles.taskList}>
                {tasks.map((task) => (
                  <label key={task.id} className={styles.taskItem}>
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task.id)}
                    />
                    <span className={task.done ? styles.taskDone : ''}>{task.title}</span>
                  </label>
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

      <div className={styles.toastStack}>
        {aiToasts.map((toast) => (
          <article key={toast.id} className={styles.aiToast}>
            <strong>{toast.title}</strong>
            <p>{toast.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default UserHome;
