import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ToDoPlanner.module.css';

const STORAGE_KEY = 'crymson_todo_tasks';
const NOTIFIED_TASKS_KEY = 'crymson_todo_notified_tasks';
const REMINDER_WINDOW_MS = 10 * 60 * 1000;
const REMINDER_CHECK_INTERVAL_MS = 30 * 1000;

const INITIAL_DRAFT = {
  title: '',
  dueAt: '',
  details: '',
};

const createTask = ({ title, dueAt, details }) => ({
  id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
  title,
  dueAt,
  details,
  completed: false,
  createdAt: new Date().toISOString(),
});

function ToDoPlanner({ onNavigateHome }) {
  const [tasks, setTasks] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftTask, setDraftTask] = useState(INITIAL_DRAFT);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const notifiedTaskIdsRef = useRef(new Set());

  const isIOSLikeDevice = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);

  const isStandaloneApp = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const mediaMatch = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const legacyStandalone = window.navigator.standalone === true;
    return mediaMatch || legacyStandalone;
  }, []);

  const needsIOSInstallForNotifications = isIOSLikeDevice && !isStandaloneApp;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setTasks(parsed);
      }
    } catch (error) {
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIFIED_TASKS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        notifiedTaskIdsRef.current = new Set(parsed);
      }
    } catch (error) {
      notifiedTaskIdsRef.current = new Set();
    }
  }, []);

  useEffect(() => {
    if (notificationPermission !== 'granted') return undefined;

    const maybeNotifyNearDueTasks = () => {
      const now = Date.now();

      tasks.forEach((task) => {
        if (task.completed || !task.dueAt) return;

        const dueTime = new Date(task.dueAt).getTime();
        if (Number.isNaN(dueTime)) return;

        const timeUntilDue = dueTime - now;
        const shouldNotify = timeUntilDue > 0 && timeUntilDue <= REMINDER_WINDOW_MS;
        const alreadyNotified = notifiedTaskIdsRef.current.has(task.id);

        if (!shouldNotify || alreadyNotified) return;

        const minutesLeft = Math.max(1, Math.round(timeUntilDue / 60000));
        new Notification('Crymson Task Reminder', {
          body: `${task.title} is due in about ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
          tag: `task-${task.id}`,
        });

        notifiedTaskIdsRef.current.add(task.id);
      });

      localStorage.setItem(NOTIFIED_TASKS_KEY, JSON.stringify([...notifiedTaskIdsRef.current]));
    };

    maybeNotifyNearDueTasks();
    const intervalId = window.setInterval(maybeNotifyNearDueTasks, REMINDER_CHECK_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [tasks, notificationPermission]);

  const visibleTasks = useMemo(() => {
    if (activeFilter === 'active') {
      return tasks.filter((task) => !task.completed);
    }
    if (activeFilter === 'completed') {
      return tasks.filter((task) => task.completed);
    }
    return tasks;
  }, [tasks, activeFilter]);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    return {
      total: tasks.length,
      completed,
      active: tasks.length - completed,
    };
  }, [tasks]);

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isModalOpen]);

  const handleOpenModal = () => {
    setDraftTask(INITIAL_DRAFT);
    setIsModalOpen(true);
  };

  const handleAddTask = (event) => {
    event.preventDefault();
    const cleanedTitle = draftTask.title.trim();
    if (!cleanedTitle || !draftTask.dueAt) return;

    setTasks((prev) => [
      createTask({
        title: cleanedTitle,
        dueAt: draftTask.dueAt,
        details: draftTask.details.trim(),
      }),
      ...prev,
    ]);
    setDraftTask(INITIAL_DRAFT);
    setIsModalOpen(false);
  };

  const handleToggleTask = (id) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task))
    );
  };

  const handleDeleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((task) => !task.completed));
  };

  const handleEnableNotifications = async () => {
    if (needsIOSInstallForNotifications) {
      setNotificationPermission('unsupported');
      return;
    }

    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const getDueLabel = (dueAt) => {
    if (!dueAt) return 'No due time set';
    const parsed = new Date(dueAt);
    if (Number.isNaN(parsed.getTime())) return 'No due time set';
    return parsed.toLocaleString();
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button type="button" className={styles.backButton} onClick={onNavigateHome}>
          ← Back To Landing
        </button>

        <header className={styles.header}>
          <p className={styles.eyebrow}>Productivity</p>
          <h1 className={styles.title}>To-Do Planner</h1>
          <p className={styles.subtitle}>
            Plan your day with clear priorities, then track progress task by task.
          </p>
        </header>

        <section className={styles.card}>
          <div className={styles.topActions}>
            <button type="button" className={styles.primaryButton} onClick={handleOpenModal}>
              Add Task
            </button>

            <button
              type="button"
              className={styles.notificationButton}
              onClick={handleEnableNotifications}
              disabled={
                notificationPermission === 'granted'
                || notificationPermission === 'unsupported'
                || needsIOSInstallForNotifications
              }
            >
              {notificationPermission === 'granted'
                ? 'Notifications Enabled'
                : needsIOSInstallForNotifications
                  ? 'Install the Crymson app to enable push notifications on iOS devices'
                  : 'Enable Device Alerts'}
            </button>
          </div>

          <p className={styles.notificationHint}>
            {needsIOSInstallForNotifications
              ? 'On iPad/iPhone, add this app to your Home Screen from Safari, then open it from the Home Screen to enable device alerts.'
              : notificationPermission === 'unsupported'
                ? 'This device/browser does not support system notifications.'
                : notificationPermission === 'denied'
                  ? 'Notification permission is blocked. Enable notifications for this site in your browser/device settings.'
                  : 'You will receive a system alert about 10 minutes before a task is due while this app is open.'}
          </p>

          <div className={styles.stats}>
            <span>Total: {stats.total}</span>
            <span>Active: {stats.active}</span>
            <span>Completed: {stats.completed}</span>
          </div>

          <div className={styles.filters}>
            <button
              type="button"
              className={`${styles.filterButton} ${activeFilter === 'all' ? styles.filterButtonActive : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`${styles.filterButton} ${activeFilter === 'active' ? styles.filterButtonActive : ''}`}
              onClick={() => setActiveFilter('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`${styles.filterButton} ${activeFilter === 'completed' ? styles.filterButtonActive : ''}`}
              onClick={() => setActiveFilter('completed')}
            >
              Completed
            </button>

            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClearCompleted}
              disabled={stats.completed === 0}
            >
              Clear Completed
            </button>
          </div>
        </section>

        <section className={styles.listCard}>
          {visibleTasks.length === 0 ? (
            <p className={styles.emptyState}>No tasks in this view yet. Add one to get started.</p>
          ) : (
            <ul className={styles.list}>
              {visibleTasks.map((task) => (
                <li key={task.id} className={styles.item}>
                  <label className={styles.checkboxWrap}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                    />
                    <div>
                      <span className={task.completed ? styles.itemDone : styles.itemTitle}>{task.title}</span>
                      <p className={styles.itemMeta}>Due: {getDueLabel(task.dueAt)}</p>
                      {task.details && <p className={styles.itemDetails}>{task.details}</p>}
                    </div>
                  </label>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDeleteTask(task.id)}
                    aria-label={`Delete ${task.title}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isModalOpen && (
          <div className={styles.modalOverlay} onMouseDown={() => setIsModalOpen(false)}>
            <section
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-label="Add a new task"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Close add task dialog"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>

              <p className={styles.modalEyebrow}>Planner</p>
              <h2 className={styles.modalTitle}>Add New Task</h2>
              <p className={styles.modalSubtext}>Set your task, completion time, and any useful details.</p>

              <form className={styles.form} onSubmit={handleAddTask}>
                <label className={styles.label} htmlFor="newTaskTitle">Task</label>
                <input
                  id="newTaskTitle"
                  type="text"
                  className={styles.input}
                  value={draftTask.title}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="e.g. Revise CST 305 notes"
                  required
                />

                <label className={styles.label} htmlFor="newTaskTime">Completion Time</label>
                <input
                  id="newTaskTime"
                  type="datetime-local"
                  className={styles.input}
                  value={draftTask.dueAt}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, dueAt: event.target.value }))}
                  required
                />

                <label className={styles.label} htmlFor="newTaskDetails">Other Details</label>
                <textarea
                  id="newTaskDetails"
                  className={styles.textarea}
                  value={draftTask.details}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, details: event.target.value }))}
                  placeholder="Optional notes, links, or reminders"
                  rows={4}
                />

                <button type="submit" className={styles.primaryButton}>Save Task</button>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default ToDoPlanner;
