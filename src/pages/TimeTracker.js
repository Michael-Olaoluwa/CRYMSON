import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TimeTracker.module.css';

const STORAGE_KEY_BASE = 'crymson_time_tracker_sessions';
const USER_CGPA_STATE_KEY = 'crymson_user_cgpa_state_v1';
const TODO_STORAGE_KEY_BASE = 'crymson_todo_tasks';
const AUTH_SESSION_KEY = 'crymson_auth_session';
const AUTH_API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:5000`;
const TEST_TASK_TYPES = new Set(['test-1', 'test-2', 'exam', 'exam-timetable']);
const COURSE_TOTAL_FILTERS = [
  { id: 'week', label: 'This Week' },
  { id: '7days', label: 'Last 7 Days' },
  { id: 'all', label: 'All Time' },
];

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

const formatClock = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const getLocalDateTimeParts = (date) => {
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localIso = new Date(date.getTime() - offsetMs).toISOString();
  return {
    date: localIso.slice(0, 10),
    time: localIso.slice(11, 16),
  };
};

function TimeTracker({ activeUserId = 'guest', onNavigateHome }) {
  const storageKey = useMemo(() => `${STORAGE_KEY_BASE}:${activeUserId || 'guest'}`, [activeUserId]);
  const [sessions, setSessions] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [note, setNote] = useState('');
  const [courseTag, setCourseTag] = useState('General Study');
  const [availableCourseTags, setAvailableCourseTags] = useState([]);
  const [courseTotalsRange, setCourseTotalsRange] = useState('week');
  const [calendarTasks, setCalendarTasks] = useState([]);
  const [manualDurationMinutes, setManualDurationMinutes] = useState('');
  const [manualCourseTag, setManualCourseTag] = useState('General Study');
  const [manualNote, setManualNote] = useState('');
  const [manualDate, setManualDate] = useState(() => getLocalDateTimeParts(new Date()).date);
  const [manualTime, setManualTime] = useState(() => getLocalDateTimeParts(new Date()).time);
  const [manualError, setManualError] = useState('');
  const [editingManualSessionId, setEditingManualSessionId] = useState('');
  const [sessionStartIso, setSessionStartIso] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSessions(parsed);
      }
    } catch (error) {
      setSessions([]);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(sessions));
  }, [sessions, storageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_CGPA_STATE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const courses = Array.isArray(parsed?.courses) ? parsed.courses : [];
      const tags = courses
        .map((course) => String(course?.courseName || '').trim())
        .filter(Boolean);

      setAvailableCourseTags([...new Set(tags)]);
    } catch (error) {
      setAvailableCourseTags([]);
    }
  }, []);

  useEffect(() => {
    const scopedTasksKey = `${TODO_STORAGE_KEY_BASE}:${activeUserId || 'guest'}`;

    try {
      const raw = localStorage.getItem(scopedTasksKey) || localStorage.getItem(TODO_STORAGE_KEY_BASE);
      if (!raw) {
        setCalendarTasks([]);
      } else {
        const parsed = JSON.parse(raw);
        setCalendarTasks(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      setCalendarTasks([]);
    }

    const loadRemoteTasks = async () => {
      const token = getStoredToken();
      if (!token) return;

      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/user-state/tasks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return;

        const remoteTasks = Array.isArray(payload.tasks) ? payload.tasks : [];
        if (remoteTasks.length > 0) {
          setCalendarTasks(remoteTasks);
        }
      } catch (error) {
        // Keep local tasks when remote fetch fails.
      }
    };

    loadRemoteTasks();
  }, [activeUserId]);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      return undefined;
    }

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const totalTrackedSeconds = useMemo(
    () => sessions.reduce((sum, session) => sum + (Number(session.durationSeconds) || 0), 0),
    [sessions]
  );

  const todayTrackedSeconds = useMemo(() => {
    const today = new Date().toDateString();
    return sessions.reduce((sum, session) => {
      const startedAt = new Date(session.startedAt || '');
      if (startedAt.toDateString() !== today) return sum;
      return sum + (Number(session.durationSeconds) || 0);
    }, 0);
  }, [sessions]);

  const weeklyCourseTotals = useMemo(() => {
    const now = new Date();
    const rangeStart = new Date(now);

    if (courseTotalsRange === 'week') {
      rangeStart.setHours(0, 0, 0, 0);
      rangeStart.setDate(now.getDate() - now.getDay());
    }

    if (courseTotalsRange === '7days') {
      rangeStart.setHours(0, 0, 0, 0);
      rangeStart.setDate(now.getDate() - 6);
    }

    const totals = sessions.reduce((acc, session) => {
      const startedAt = new Date(session.startedAt || '');
      if (Number.isNaN(startedAt.getTime())) {
        return acc;
      }

      if (courseTotalsRange !== 'all' && startedAt < rangeStart) {
        return acc;
      }

      const tag = String(session.courseTag || 'General Study').trim() || 'General Study';
      const duration = Number(session.durationSeconds) || 0;
      acc[tag] = (acc[tag] || 0) + duration;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([courseTag, totalSeconds]) => ({
        courseTag,
        totalSeconds,
      }))
      .sort((left, right) => right.totalSeconds - left.totalSeconds);
  }, [sessions, courseTotalsRange]);

  const lowStudyWarnings = useMemo(() => {
    const now = Date.now();
    const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    const recentStudyByCourse = sessions.reduce((acc, session) => {
      const startedAt = new Date(session.startedAt || '').getTime();
      if (!Number.isFinite(startedAt) || startedAt < sevenDaysAgo) {
        return acc;
      }

      const tag = String(session.courseTag || 'General Study').trim() || 'General Study';
      acc[tag] = (acc[tag] || 0) + (Number(session.durationSeconds) || 0);
      return acc;
    }, {});

    const upcomingTests = calendarTasks
      .filter((task) => !task?.completed)
      .filter((task) => TEST_TASK_TYPES.has(String(task?.taskType || '').toLowerCase()))
      .map((task) => {
        const dueAtTime = new Date(task.dueAt || '').getTime();
        return {
          id: String(task.id || ''),
          title: String(task.title || 'Upcoming test').trim(),
          courseTag: String(task.courseTag || 'General Study').trim() || 'General Study',
          taskType: String(task.taskType || '').toLowerCase(),
          dueAtTime,
        };
      })
      .filter((task) => Number.isFinite(task.dueAtTime) && task.dueAtTime >= now && task.dueAtTime <= sevenDaysFromNow)
      .sort((left, right) => left.dueAtTime - right.dueAtTime);

    const warnings = upcomingTests
      .map((task) => {
        const studiedSeconds = recentStudyByCourse[task.courseTag] || 0;
        const recommendedSeconds = (task.taskType === 'exam' || task.taskType === 'exam-timetable')
          ? 4 * 60 * 60
          : 2 * 60 * 60;
        const deficitSeconds = recommendedSeconds - studiedSeconds;

        if (deficitSeconds <= 0) return null;

        return {
          id: task.id || `${task.courseTag}-${task.dueAtTime}`,
          title: task.title,
          courseTag: task.courseTag,
          dueAt: new Date(task.dueAtTime).toLocaleString(),
          studiedSeconds,
          recommendedSeconds,
          deficitSeconds,
        };
      })
      .filter(Boolean);

    return {
      upcomingTestsCount: upcomingTests.length,
      warnings,
    };
  }, [calendarTasks, sessions]);

  const startTimer = () => {
    if (isRunning) return;
    setSessionStartIso(new Date().toISOString());
    setIsRunning(true);
  };

  const stopAndSaveSession = () => {
    if (!isRunning && elapsedSeconds <= 0) return;

    setIsRunning(false);

    if (elapsedSeconds <= 0) {
      setSessionStartIso('');
      return;
    }

    const startedAt = sessionStartIso || new Date(Date.now() - elapsedSeconds * 1000).toISOString();
    const endedAt = new Date().toISOString();

    setSessions((prev) => [
      {
        id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        note: note.trim(),
        courseTag: String(courseTag || 'General Study').trim() || 'General Study',
        durationSeconds: elapsedSeconds,
        startedAt,
        endedAt,
      },
      ...prev,
    ]);

    setNote('');
    setElapsedSeconds(0);
    setSessionStartIso('');
  };

  const resetCurrent = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setSessionStartIso('');
  };

  const handleManualLog = () => {
    setManualError('');

    const durationMinutes = Number(manualDurationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 24 * 60) {
      setManualError('Duration must be between 1 and 1440 minutes.');
      return;
    }

    const startedAt = new Date(`${manualDate}T${manualTime || '00:00'}`);
    if (Number.isNaN(startedAt.getTime())) {
      setManualError('Choose a valid date and start time.');
      return;
    }

    const durationSeconds = Math.round(durationMinutes * 60);
    const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000);

    if (editingManualSessionId) {
      setSessions((prev) => prev.map((session) => {
        if (session.id !== editingManualSessionId) return session;
        return {
          ...session,
          note: manualNote.trim(),
          courseTag: String(manualCourseTag || 'General Study').trim() || 'General Study',
          durationSeconds,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          source: 'manual',
        };
      }));
    } else {
      setSessions((prev) => [
        {
          id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          note: manualNote.trim(),
          courseTag: String(manualCourseTag || 'General Study').trim() || 'General Study',
          durationSeconds,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          source: 'manual',
        },
        ...prev,
      ]);
    }

    setManualDurationMinutes('');
    setManualNote('');
    setEditingManualSessionId('');
  };

  const handleEditManualSession = (session) => {
    const startedAt = new Date(session.startedAt || '');
    if (Number.isNaN(startedAt.getTime())) {
      setManualError('Cannot edit this entry because its date is invalid.');
      return;
    }

    const parts = getLocalDateTimeParts(startedAt);
    setManualDurationMinutes(String(Math.max(1, Math.round((Number(session.durationSeconds) || 0) / 60))));
    setManualCourseTag(String(session.courseTag || 'General Study').trim() || 'General Study');
    setManualNote(String(session.note || ''));
    setManualDate(parts.date);
    setManualTime(parts.time);
    setEditingManualSessionId(String(session.id || ''));
    setManualError('');
  };

  const handleDeleteManualSession = (sessionId) => {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    if (editingManualSessionId === sessionId) {
      setEditingManualSessionId('');
      setManualDurationMinutes('');
      setManualNote('');
      setManualError('');
    }
  };

  const handleCancelManualEdit = () => {
    setEditingManualSessionId('');
    setManualDurationMinutes('');
    setManualNote('');
    setManualError('');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Crymson Tools</p>
          <h1 className={styles.title}>Time Tracker</h1>
          <p className={styles.subtitle}>Track focused study time and review your session history.</p>
        </div>
        <button type="button" className={styles.backButton} onClick={onNavigateHome}>
          Back to Home
        </button>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <p className={styles.cardLabel}>Live Timer</p>
          <p className={styles.timer}>{formatClock(elapsedSeconds)}</p>

          <label className={styles.field}>
            <span>Course tag</span>
            <select
              value={courseTag}
              onChange={(event) => setCourseTag(event.target.value)}
              disabled={isRunning}
            >
              <option value="General Study">General Study</option>
              {availableCourseTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Session note (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Data Structures revision"
            />
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={startTimer} disabled={isRunning}>
              Start
            </button>
            <button type="button" className={styles.secondaryButton} onClick={stopAndSaveSession} disabled={!isRunning && elapsedSeconds === 0}>
              Stop & Save
            </button>
            <button type="button" className={styles.secondaryButton} onClick={resetCurrent} disabled={elapsedSeconds === 0 && !isRunning}>
              Reset
            </button>
          </div>

          <div className={styles.manualSection}>
            <p className={styles.manualTitle}>{editingManualSessionId ? 'Edit Manual Entry' : 'Manual Time Entry'}</p>
            <p className={styles.manualHint}>
              {editingManualSessionId
                ? 'Update this manual session and save changes.'
                : 'Log study time retroactively for sessions you forgot to track live.'}
            </p>

            <div className={styles.manualGrid}>
              <label className={styles.field}>
                <span>Duration (minutes)</span>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  value={manualDurationMinutes}
                  onChange={(event) => setManualDurationMinutes(event.target.value)}
                  placeholder="e.g. 90"
                />
              </label>

              <label className={styles.field}>
                <span>Course tag</span>
                <select value={manualCourseTag} onChange={(event) => setManualCourseTag(event.target.value)}>
                  <option value="General Study">General Study</option>
                  {availableCourseTags.map((tag) => (
                    <option key={`manual-${tag}`} value={tag}>{tag}</option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Date</span>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(event) => setManualDate(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>Start time</span>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(event) => setManualTime(event.target.value)}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>Note (optional)</span>
              <input
                type="text"
                value={manualNote}
                onChange={(event) => setManualNote(event.target.value)}
                placeholder="e.g. Late-night revision from yesterday"
              />
            </label>

            {manualError && <p className={styles.manualError}>{manualError}</p>}

            <div className={styles.manualActions}>
              <button type="button" className={styles.saveButton} onClick={handleManualLog}>
                {editingManualSessionId ? 'Save Changes' : 'Save Manual Entry'}
              </button>
              {editingManualSessionId && (
                <button type="button" className={styles.secondaryButton} onClick={handleCancelManualEdit}>
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>Summary</p>

          <div className={styles.warningSection}>
            <p className={styles.warningTitle}>Upcoming Test Readiness</p>
            {lowStudyWarnings.upcomingTestsCount === 0 ? (
              <p className={styles.warningMeta}>No tests due in the next 7 days.</p>
            ) : lowStudyWarnings.warnings.length === 0 ? (
              <p className={`${styles.warningMeta} ${styles.warningGood}`}>
                Study time looks healthy for your upcoming tests.
              </p>
            ) : (
              <ul className={styles.warningList}>
                {lowStudyWarnings.warnings.map((warning) => (
                  <li key={warning.id} className={styles.warningItem}>
                    <p className={styles.warningItemTitle}>{warning.courseTag}: {warning.title}</p>
                    <p className={styles.warningMeta}>
                      Due: {warning.dueAt}
                    </p>
                    <p className={styles.warningMeta}>
                      Studied (7d): {formatClock(warning.studiedSeconds)} | Recommended: {formatClock(warning.recommendedSeconds)}
                    </p>
                    <p className={styles.warningRisk}>
                      Low study-time warning: add at least {formatClock(warning.deficitSeconds)} more prep.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.summaryRow}>
            <span>Today</span>
            <strong>{formatClock(todayTrackedSeconds)}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>All Sessions</span>
            <strong>{sessions.length}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Total Tracked</span>
            <strong>{formatClock(totalTrackedSeconds)}</strong>
          </div>

          <div className={styles.courseTotalsHeader}>
            <p className={styles.historyTitle}>Per-Course Totals</p>
            <div className={styles.courseTotalsFilterRow}>
              {COURSE_TOTAL_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`${styles.courseTotalsFilterButton} ${courseTotalsRange === filter.id ? styles.courseTotalsFilterButtonActive : ''}`}
                  onClick={() => setCourseTotalsRange(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          {weeklyCourseTotals.length === 0 ? (
            <p className={styles.empty}>No tracked sessions found in this range.</p>
          ) : (
            <ul className={styles.courseTotalsList}>
              {weeklyCourseTotals.map((item) => (
                <li key={item.courseTag} className={styles.courseTotalsItem}>
                  <span>{item.courseTag}</span>
                  <strong>{formatClock(item.totalSeconds)}</strong>
                </li>
              ))}
            </ul>
          )}

          <p className={styles.historyTitle}>Recent Sessions</p>
          {sessions.length === 0 ? (
            <p className={styles.empty}>No sessions saved yet.</p>
          ) : (
            <ul className={styles.historyList}>
              {sessions.slice(0, 8).map((session) => (
                <li key={session.id} className={styles.historyItem}>
                  <div>
                    <p className={styles.historyNote}>{session.note || 'Focused Session'}</p>
                    <p className={styles.historyTag}>{session.courseTag || 'General Study'}</p>
                    {session.source === 'manual' && <p className={styles.manualSourceTag}>Manual</p>}
                    <p className={styles.historyMeta}>{new Date(session.startedAt).toLocaleString()}</p>
                    {session.source === 'manual' && (
                      <div className={styles.historyActions}>
                        <button type="button" onClick={() => handleEditManualSession(session)}>Edit</button>
                        <button type="button" onClick={() => handleDeleteManualSession(session.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                  <strong>{formatClock(session.durationSeconds)}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}

export default TimeTracker;
