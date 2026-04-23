import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ToDoPlanner.module.css';

const STORAGE_KEY_BASE = 'crymson_todo_tasks';
const NOTIFIED_TASKS_KEY_BASE = 'crymson_todo_notified_tasks';
const USER_CGPA_STATE_KEY_BASE = 'crymson_user_cgpa_state_v1';
const AUTH_SESSION_KEY = 'crymson_auth_session';
const AUTH_API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:5000`;
const ACADEMIC_REMINDER_DELAY_BY_TASK_TYPE = {
  'test-1': 24 * 60,
  'test-2': 24 * 60,
  exam: 24 * 60,
  'exam-timetable': 24 * 60,
  'submission-deadline': 6 * 60,
};
const REMINDER_WINDOW_MS = 10 * 60 * 1000;
const REMINDER_CHECK_INTERVAL_MS = 30 * 1000;

const INITIAL_DRAFT = {
  title: '',
  dueAt: '',
  details: '',
  courseTag: '',
  priority: 'medium',
  recurrence: 'none',
  taskType: 'general',
};

const createTask = ({ title, dueAt, details, taskType, courseTag, priority, recurrence }) => ({
  id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
  title,
  dueAt,
  details,
  taskType,
  courseTag,
  priority,
  recurrence,
  completed: false,
  createdAt: new Date().toISOString(),
});

const VALID_RECURRENCE = new Set(['none', 'daily', 'weekly', 'monthly']);

const normalizeRecurrence = (value) => {
  const normalized = String(value || 'none').toLowerCase();
  return VALID_RECURRENCE.has(normalized) ? normalized : 'none';
};

const toLocalDateTimeInputValue = (date) => {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const getNextDueAt = (dueAt, recurrence) => {
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) return '';

  const next = new Date(parsed);
  const normalized = normalizeRecurrence(recurrence);

  if (normalized === 'daily') next.setDate(next.getDate() + 1);
  if (normalized === 'weekly') next.setDate(next.getDate() + 7);
  if (normalized === 'monthly') next.setMonth(next.getMonth() + 1);

  if (normalized === 'none') return '';
  return toLocalDateTimeInputValue(next);
};

const getStoredToken = () => {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return '';
    }

    const parsed = JSON.parse(raw);
    return typeof parsed.token === 'string' ? parsed.token : '';
  } catch (error) {
    return '';
  }
};

const getCGPACourses = (activeUserId) => {
  const scopedCgpaKey = `${USER_CGPA_STATE_KEY_BASE}:${activeUserId || 'guest'}`;

  try {
    const raw = localStorage.getItem(scopedCgpaKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.courses)) return [];
    return parsed.courses
      .filter((course) => course?.courseName && String(course.courseName).trim())
      .map((course) => String(course.courseName).trim())
      .sort();
  } catch (error) {
    return [];
  }
};

const getAcademicReminderDelayMinutes = (taskType) => {
  const normalized = String(taskType || '').toLowerCase();
  return ACADEMIC_REMINDER_DELAY_BY_TASK_TYPE[normalized] || 24 * 60;
};

function ToDoPlanner({ activeUserId = 'guest', onNavigateHome }) {
  const [tasks, setTasks] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftTask, setDraftTask] = useState(INITIAL_DRAFT);
  const [editingTaskId, setEditingTaskId] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [cgpaCourses, setCgpaCourses] = useState([]);
  const hasHydratedTaskStateRef = useRef(false);
  const taskSyncTimeoutRef = useRef(null);
  const notifiedTaskIdsRef = useRef(new Set());
  const scopedTasksKey = useMemo(() => `${STORAGE_KEY_BASE}:${activeUserId}`, [activeUserId]);
  const scopedNotifiedTasksKey = useMemo(() => `${NOTIFIED_TASKS_KEY_BASE}:${activeUserId}`, [activeUserId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(scopedTasksKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Keep backward compatibility with earlier task shape.
        const normalized = parsed.map((task) => ({
          ...task,
          courseTag: String(task.courseTag || task.subject || ''),
          priority: ['high', 'medium', 'low'].includes(String(task.priority || '').toLowerCase())
            ? String(task.priority).toLowerCase()
            : 'medium',
          recurrence: normalizeRecurrence(task.recurrence),
        }));
        setTasks(normalized);
      }
    } catch (error) {
      setTasks([]);
    }
  }, [scopedTasksKey]);

  useEffect(() => {
    let cancelled = false;

    const loadRemoteTasks = async () => {
      const token = getStoredToken();
      if (!token) {
        hasHydratedTaskStateRef.current = true;
        return;
      }

      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/user-state/tasks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          hasHydratedTaskStateRef.current = true;
          return;
        }

        if (cancelled) return;

        const remoteTasks = Array.isArray(payload.tasks) ? payload.tasks : [];
        if (remoteTasks.length > 0) {
          const normalized = remoteTasks.map((task) => ({
            ...task,
            courseTag: String(task.courseTag || task.subject || ''),
            priority: ['high', 'medium', 'low'].includes(String(task.priority || '').toLowerCase())
              ? String(task.priority).toLowerCase()
              : 'medium',
            recurrence: normalizeRecurrence(task.recurrence),
          }));
          setTasks(normalized);
        }
      } catch (error) {
        // Keep local tasks if remote read fails.
      } finally {
        hasHydratedTaskStateRef.current = true;
      }
    };

    loadRemoteTasks();
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  useEffect(() => {
    localStorage.setItem(scopedTasksKey, JSON.stringify(tasks));
  }, [tasks, scopedTasksKey]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !hasHydratedTaskStateRef.current) return undefined;

    if (taskSyncTimeoutRef.current) {
      window.clearTimeout(taskSyncTimeoutRef.current);
    }

    taskSyncTimeoutRef.current = window.setTimeout(async () => {
      try {
        await fetch(`${AUTH_API_BASE_URL}/api/user-state/all`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            data: {
              tasks,
            },
          }),
        });
      } catch (error) {
        // Keep local save even if remote sync fails.
      }
    }, 300);

    return () => {
      if (taskSyncTimeoutRef.current) {
        window.clearTimeout(taskSyncTimeoutRef.current);
      }
    };
  }, [tasks]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(scopedNotifiedTasksKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        notifiedTaskIdsRef.current = new Set(parsed);
      }
    } catch (error) {
      notifiedTaskIdsRef.current = new Set();
    }
  }, [scopedNotifiedTasksKey]);

  useEffect(() => {
    if (isModalOpen) {
      setCgpaCourses(getCGPACourses(activeUserId));
    }
  }, [isModalOpen, activeUserId]);

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

      localStorage.setItem(scopedNotifiedTasksKey, JSON.stringify([...notifiedTaskIdsRef.current]));
    };

    maybeNotifyNearDueTasks();
    const intervalId = window.setInterval(maybeNotifyNearDueTasks, REMINDER_CHECK_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [tasks, notificationPermission, scopedNotifiedTasksKey]);

  const visibleTasks = useMemo(() => {
    if (activeFilter === 'active') {
      return tasks.filter((task) => !task.completed);
    }
    if (activeFilter === 'completed') {
      return tasks.filter((task) => task.completed);
    }
    if (activeFilter === 'academic') {
      return tasks.filter((task) => task.taskType && task.taskType !== 'general');
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

  const academicCalendar = useMemo(() => {
    const academicTasks = tasks
      .filter((task) => task.taskType && task.taskType !== 'general' && task.dueAt)
      .map((task) => ({
        ...task,
        dueDate: new Date(task.dueAt),
      }))
      .filter((task) => !Number.isNaN(task.dueDate.getTime()))
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());

    const grouped = academicTasks.reduce((acc, task) => {
      const dateKey = task.dueDate.toISOString().slice(0, 10);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
      return acc;
    }, {});

    return Object.entries(grouped).map(([dateKey, items]) => ({
      dateKey,
      displayDate: new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      items,
    }));
  }, [tasks]);

  const formatTaskTypeLabel = (taskType) => {
    const labels = {
      'test-1': 'Test 1',
      'test-2': 'Test 2',
      'submission-deadline': 'Submission Deadline',
      'exam-timetable': 'Exam Timetable',
    };

    return labels[taskType] || taskType;
  };

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
    setEditingTaskId('');
    setDraftTask(INITIAL_DRAFT);
    setSaveStatus('');
    setIsModalOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTaskId(task.id);
    setDraftTask({
      title: task.title || '',
      dueAt: task.dueAt || '',
      details: task.details || '',
      courseTag: task.courseTag || '',
      priority: ['high', 'medium', 'low'].includes(String(task.priority || '').toLowerCase())
        ? String(task.priority).toLowerCase()
        : 'medium',
      recurrence: normalizeRecurrence(task.recurrence),
      taskType: task.taskType || 'general',
    });
    setSaveStatus('');
    setIsModalOpen(true);
  };

  const removeAcademicEventBySourceTaskId = async (token, sourceTaskId) => {
    if (!token || !sourceTaskId) return;

    const listResponse = await fetch(`${AUTH_API_BASE_URL}/api/academic-events`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!listResponse.ok) return;

    const listPayload = await listResponse.json().catch(() => ({}));
    const events = Array.isArray(listPayload.events) ? listPayload.events : [];
    const linked = events.find((event) => String(event.sourceTaskId || '') === String(sourceTaskId));

    if (!linked) return;

    await fetch(`${AUTH_API_BASE_URL}/api/academic-events/${linked.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const createAcademicEventFromTask = async (token, task) => {
    if (!token || !task || task.taskType === 'general') return;

    const reminderDelayMinutes = getAcademicReminderDelayMinutes(task.taskType);

    const response = await fetch(`${AUTH_API_BASE_URL}/api/academic-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subject: task.courseTag,
        title: task.title,
        taskType: task.taskType,
        dueAt: task.dueAt,
        reminderDelayMinutes,
        sourceTaskId: task.id,
        notes: task.details,
      }),
    });

    if (!response.ok) {
      throw new Error('Academic reminder sync failed.');
    }
  };

  const handleAddTask = async (event) => {
    event.preventDefault();
    const cleanedTitle = draftTask.title.trim();
    const cleanedCourseTag = draftTask.courseTag.trim();
    const normalizedPriority = ['high', 'medium', 'low'].includes(String(draftTask.priority).toLowerCase())
      ? String(draftTask.priority).toLowerCase()
      : 'medium';
    const normalizedRecurrence = normalizeRecurrence(draftTask.recurrence);
    const isAcademicTask = draftTask.taskType !== 'general';

    if (!cleanedTitle || !draftTask.dueAt) return;
    if (isAcademicTask && !cleanedCourseTag) {
      setSaveStatus('Please enter a course tag for academic calendar entries.');
      return;
    }

    setSaveStatus('');

    const baseTask = {
      title: cleanedTitle,
      dueAt: draftTask.dueAt,
      details: draftTask.details.trim(),
      taskType: draftTask.taskType,
      courseTag: cleanedCourseTag,
      priority: normalizedPriority,
      recurrence: normalizedRecurrence,
    };

    const task = editingTaskId
      ? {
          ...baseTask,
          id: editingTaskId,
          completed: tasks.find((item) => item.id === editingTaskId)?.completed || false,
          createdAt: tasks.find((item) => item.id === editingTaskId)?.createdAt || new Date().toISOString(),
        }
      : createTask(baseTask);

    if (editingTaskId) {
      setTasks((prev) => prev.map((item) => (item.id === editingTaskId ? task : item)));
    } else {
      setTasks((prev) => [task, ...prev]);
    }

    const token = getStoredToken();

    if (token && editingTaskId) {
      try {
        await removeAcademicEventBySourceTaskId(token, editingTaskId);
      } catch (error) {
        // Ignore soft sync failures and keep local task update.
      }
    }

    if (isAcademicTask) {

      if (token) {
        try {
          await createAcademicEventFromTask(token, task);

          setSaveStatus(editingTaskId
            ? 'Task updated and academic reminder synced.'
            : 'Academic reminder saved for shared tracker alerts.');
        } catch (error) {
          setSaveStatus(editingTaskId
            ? 'Task updated locally, but reminder sync failed.'
            : 'Saved locally, but could not sync the academic reminder to the shared backend yet.');
        }
      } else {
        setSaveStatus('Saved locally. Sign in to sync academic reminders across devices.');
      }
    } else if (token && editingTaskId) {
      setSaveStatus('Task updated successfully.');
    }

    setEditingTaskId('');
    setDraftTask(INITIAL_DRAFT);
    setIsModalOpen(false);
  };

  const handleToggleTask = async (id) => {
    const targetTask = tasks.find((task) => task.id === id);
    if (!targetTask) return;

    const isCompleting = !targetTask.completed;
    let generatedRecurringTask = null;

    setTasks((prev) => {
      const next = prev.map((task) => {
        if (task.id !== id) return task;
        return { ...task, completed: !task.completed };
      });

      if (isCompleting && normalizeRecurrence(targetTask.recurrence) !== 'none') {
        const nextDueAt = getNextDueAt(targetTask.dueAt, targetTask.recurrence);
        if (nextDueAt) {
          generatedRecurringTask = createTask({
            title: targetTask.title,
            dueAt: nextDueAt,
            details: targetTask.details || '',
            taskType: targetTask.taskType || 'general',
            courseTag: targetTask.courseTag || '',
            priority: ['high', 'medium', 'low'].includes(String(targetTask.priority || '').toLowerCase())
              ? String(targetTask.priority).toLowerCase()
              : 'medium',
            recurrence: normalizeRecurrence(targetTask.recurrence),
          });

          return [generatedRecurringTask, ...next];
        }
      }

      return next;
    });

    const token = getStoredToken();
    if (!token || !isCompleting) return;

    if (targetTask.taskType && targetTask.taskType !== 'general') {
      try {
        await removeAcademicEventBySourceTaskId(token, targetTask.id);
      } catch (error) {
        // Keep local completion even if sync removal fails.
      }
    }

    if (generatedRecurringTask && generatedRecurringTask.taskType !== 'general') {
      try {
        await createAcademicEventFromTask(token, generatedRecurringTask);
      } catch (error) {
        // Keep local recurring task even if sync creation fails.
      }
    }
  };

  const handleDeleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((task) => !task.completed));
  };

  const handleEnableNotifications = async () => {
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

  const getPriorityClass = (priority) => {
    const normalized = String(priority || 'medium').toLowerCase();
    if (normalized === 'high') return styles.priorityHigh;
    if (normalized === 'low') return styles.priorityLow;
    return styles.priorityMedium;
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button type="button" className={styles.backButton} onClick={onNavigateHome}>
          ← Back To Home
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
              }
            >
              {notificationPermission === 'granted'
                ? 'Notifications Enabled'
                : 'Enable Device Alerts'}
            </button>
          </div>

          <p className={styles.notificationHint}>
            {notificationPermission === 'unsupported'
              ? 'This device/browser does not support system notifications.'
              : notificationPermission === 'denied'
                ? 'Notification permission is blocked. Enable notifications for this site in your browser settings.'
                : 'You will receive a system alert about 10 minutes before a task is due while this app is open.'}
          </p>

          {saveStatus && <p className={styles.notificationHint}>{saveStatus}</p>}

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
              className={`${styles.filterButton} ${activeFilter === 'academic' ? styles.filterButtonActive : ''}`}
              onClick={() => setActiveFilter('academic')}
            >
              Academic
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
          <h2 className={styles.calendarTitle}>Academic Calendar</h2>
          <p className={styles.calendarHint}>Tests, submissions, and exam timetable entries grouped by date.</p>

          {academicCalendar.length === 0 ? (
            <p className={styles.emptyState}>No academic calendar entries yet. Add one from Add Task.</p>
          ) : (
            <div className={styles.calendarGroups}>
              {academicCalendar.map((group) => (
                <article key={group.dateKey} className={styles.calendarGroup}>
                  <h3 className={styles.calendarDate}>{group.displayDate}</h3>
                  <ul className={styles.calendarItems}>
                    {group.items.map((item) => (
                      <li key={item.id} className={`${styles.calendarItem} ${getPriorityClass(item.priority)}`}>
                        <span className={styles.calendarBadge}>{formatTaskTypeLabel(item.taskType)}</span>
                        <div className={styles.calendarContent}>
                          <p className={styles.calendarTaskTitle}>{item.title}</p>
                          <p className={styles.calendarMeta}>
                            {item.courseTag || 'No course tag'} {' | '}
                            {item.dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' | '} Priority: <span className={`${styles.priorityTag} ${getPriorityClass(item.priority)}`}>{(item.priority || 'medium').toUpperCase()}</span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.listCard}>
          {visibleTasks.length === 0 ? (
            <p className={styles.emptyState}>No tasks in this view yet. Add one to get started.</p>
          ) : (
            <ul className={styles.list}>
              {visibleTasks.map((task) => (
                <li key={task.id} className={`${styles.item} ${getPriorityClass(task.priority)}`}>
                  <label className={styles.checkboxWrap}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                    />
                    <div>
                      <span className={task.completed ? styles.itemDone : styles.itemTitle}>{task.title}</span>
                      <p className={styles.itemMeta}>Due: {getDueLabel(task.dueAt)}</p>
                      {task.courseTag ? (
                        <p className={styles.itemMeta}>
                          Course: {task.courseTag} {' | '} Priority: <span className={`${styles.priorityTag} ${getPriorityClass(task.priority)}`}>{(task.priority || 'medium').toUpperCase()}</span>
                        </p>
                      ) : (
                        <p className={styles.itemMeta}>
                          Priority: <span className={`${styles.priorityTag} ${getPriorityClass(task.priority)}`}>{(task.priority || 'medium').toUpperCase()}</span>
                        </p>
                      )}
                      {normalizeRecurrence(task.recurrence) !== 'none' && (
                        <p className={styles.itemMeta}>Repeats: {normalizeRecurrence(task.recurrence)}</p>
                      )}
                      {task.taskType && task.taskType !== 'general' && (
                        <p className={styles.itemDetails}>
                          Academic event: {task.taskType.replace('-', ' ')}{task.courseTag ? ` for ${task.courseTag}` : ''}
                        </p>
                      )}
                      {task.details && <p className={styles.itemDetails}>{task.details}</p>}
                    </div>
                  </label>

                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => handleEditTask(task)}
                    aria-label={`Edit ${task.title}`}
                  >
                    Edit
                  </button>

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
              <h2 className={styles.modalTitle}>{editingTaskId ? 'Edit Task' : 'Add New Task'}</h2>
              <p className={styles.modalSubtext}>
                {editingTaskId
                  ? 'Update your task details, due date, and priority.'
                  : 'Set your task, completion time, and any useful details.'}
              </p>

              <form className={styles.form} onSubmit={handleAddTask}>
                <label className={styles.label} htmlFor="newTaskType">Task Type</label>
                <select
                  id="newTaskType"
                  className={styles.input}
                  value={draftTask.taskType}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, taskType: event.target.value }))}
                >
                  <option value="general">General task</option>
                  <option value="test-1">Test 1</option>
                  <option value="test-2">Test 2</option>
                  <option value="submission-deadline">Submission Deadline</option>
                  <option value="exam-timetable">Exam Timetable</option>
                </select>

                <label className={styles.label} htmlFor="newTaskCourseTag">
                  Course Tag (Academic only)
                  {cgpaCourses.length > 0 && <span className={styles.labelHint}> — Select from your CGPA courses</span>}
                </label>
                <input
                  id="newTaskCourseTag"
                  type="text"
                  className={styles.input}
                  list="cgpaCoursesList"
                  value={draftTask.courseTag}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, courseTag: event.target.value }))}
                  placeholder="Optional for general tasks (e.g. CSC 205)"
                />
                {cgpaCourses.length > 0 && (
                  <datalist id="cgpaCoursesList">
                    {cgpaCourses.map((course) => (
                      <option key={course} value={course} />
                    ))}
                  </datalist>
                )}

                <label className={styles.label} htmlFor="newTaskPriority">Priority</label>
                <select
                  id="newTaskPriority"
                  className={styles.input}
                  value={draftTask.priority}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, priority: event.target.value }))}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <label className={styles.label} htmlFor="newTaskRecurrence">Recurrence</label>
                <select
                  id="newTaskRecurrence"
                  className={styles.input}
                  value={draftTask.recurrence}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, recurrence: event.target.value }))}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <label className={styles.label} htmlFor="newTaskTime">Due Date</label>
                <input
                  id="newTaskTime"
                  type="datetime-local"
                  className={styles.input}
                  value={draftTask.dueAt}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, dueAt: event.target.value }))}
                  required
                />

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

                <label className={styles.label} htmlFor="newTaskDetails">Other Details</label>
                <textarea
                  id="newTaskDetails"
                  className={styles.textarea}
                  value={draftTask.details}
                  onChange={(event) => setDraftTask((prev) => ({ ...prev, details: event.target.value }))}
                  placeholder="Optional notes, links, or reminders"
                  rows={4}
                />

                <button type="submit" className={styles.primaryButton}>{editingTaskId ? 'Save Changes' : 'Save Task'}</button>
                {saveStatus && <p className={styles.notificationHint}>{saveStatus}</p>}
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default ToDoPlanner;
