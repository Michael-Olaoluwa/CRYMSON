const USER_CGPA_STATE_KEY_BASE = 'crymson_user_cgpa_state_v1';
const ACADEMIC_EVENT_TYPES = new Set(['test-1', 'test-2', 'submission-deadline', 'exam', 'exam-timetable']);
const STUDY_WINDOW_DAYS = 7;
const MAX_ACTIONS = 5;
const MIN_ACTIONS = 3;

const SOURCE_WEIGHTS = {
  task: 10,
  academicEvent: 20,
  studyDeficit: 25,
  performanceRisk: 22,
  fallback: 4,
};

export const TODAY_ENGINE_WEIGHTS = {
  deadlineUrgency: {
    critical: 100,
    high: 76,
    medium: 48,
    low: 16,
  },
  academicImportance: {
    exam: 55,
    'exam-timetable': 50,
    'test-2': 40,
    'test-1': 35,
    'submission-deadline': 28,
    assignment: 22,
    general: 10,
  },
  priority: {
    high: 20,
    medium: 10,
    low: 4,
  },
  risk: {
    targetGap: 18,
    weakCourse: 24,
    lowScore: 14,
  },
  studyDeficit: {
    perHour: 9,
    cap: 36,
  },
};

const toText = (value) => String(value || '').trim();

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toTimestamp = (value) => {
  const timestamp = new Date(value || '').getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const normalizePriority = (value) => {
  const priority = toText(value).toLowerCase();
  if (priority === 'high' || priority === 'low') return priority;
  return 'medium';
};

const normalizeTaskType = (value) => toText(value).toLowerCase() || 'general';

const normalizeCourseName = (value) => toText(value);

export const normalizeTask = (task = {}) => ({
  ...task,
  id: toText(task.id),
  title: toText(task.title),
  courseTag: normalizeCourseName(task.courseTag || task.subject),
  taskType: normalizeTaskType(task.taskType),
  priority: normalizePriority(task.priority),
  dueAt: toText(task.dueAt),
  completed: Boolean(task.completed),
});

export const normalizeAcademicEvent = (event = {}) => ({
  ...event,
  id: toText(event.id),
  subject: normalizeCourseName(event.subject),
  title: toText(event.title),
  taskType: normalizeTaskType(event.taskType),
  dueAt: toText(event.dueAt),
  reminderDelayMinutes: toNumber(event.reminderDelayMinutes, 60),
  acknowledgedAt: toText(event.acknowledgedAt),
  notes: toText(event.notes),
  sourceTaskId: toText(event.sourceTaskId),
});

export const normalizeSession = (session = {}) => ({
  ...session,
  id: toText(session.id),
  courseTag: normalizeCourseName(session.courseTag || session.course || 'General Study') || 'General Study',
  startedAt: toText(session.startedAt),
  durationSeconds: Math.max(0, toNumber(session.durationSeconds, 0)),
});

export const normalizeCgpaState = (state = null) => {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return null;
  }

  const courses = Array.isArray(state.courses)
    ? state.courses.map((course) => ({
      ...course,
      id: toText(course?.id),
      courseName: normalizeCourseName(course?.courseName),
      creditUnits: toText(course?.creditUnits),
      test1Score: toText(course?.test1Score),
      test2Score: toText(course?.test2Score),
      examScore: toText(course?.examScore),
    }))
    : [];

  return {
    ...state,
    courses,
    goalCgpa: toText(state.goalCgpa),
    cgpa: state.cgpa === null || state.cgpa === undefined ? null : toNumber(state.cgpa, null),
    classification: toText(state.classification),
    currentSemester: toNumber(state.currentSemester, 1),
    totalSemesters: toNumber(state.totalSemesters, 8),
    previousSemesters: Array.isArray(state.previousSemesters) ? state.previousSemesters : [],
  };
};

export const getCgpaStateStorageKey = (activeUserId) => `${USER_CGPA_STATE_KEY_BASE}:${activeUserId || 'guest'}`;

export const readCgpaStateFromStorage = (activeUserId) => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(getCgpaStateStorageKey(activeUserId));
    if (!raw) return null;
    return normalizeCgpaState(JSON.parse(raw));
  } catch (error) {
    return null;
  }
};

const formatDurationLabel = (minutes) => {
  const safeMinutes = Math.max(15, Math.round(toNumber(minutes, 0) / 15) * 15 || 15);
  const hours = safeMinutes / 60;

  if (safeMinutes < 60) {
    return `${safeMinutes} minutes`;
  }

  if (Number.isInteger(hours)) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${hours.toFixed(1)} hours`;
};

const getDeadlineBand = (dueAt, now) => {
  const dueTime = toTimestamp(dueAt);
  if (!Number.isFinite(dueTime)) return 'low';

  const delta = dueTime - now;
  if (delta <= 0) return 'critical';
  if (delta <= 24 * 60 * 60 * 1000) return 'critical';
  if (delta <= 3 * 24 * 60 * 60 * 1000) return 'high';
  if (delta <= 7 * 24 * 60 * 60 * 1000) return 'medium';
  return 'low';
};

const getUrgencyWeight = (band) => TODAY_ENGINE_WEIGHTS.deadlineUrgency[band] || TODAY_ENGINE_WEIGHTS.deadlineUrgency.low;

const getAcademicImportanceWeight = (taskType) => {
  const normalized = normalizeTaskType(taskType);
  return TODAY_ENGINE_WEIGHTS.academicImportance[normalized] || TODAY_ENGINE_WEIGHTS.academicImportance.general;
};

const getTaskPriorityWeight = (priority) => TODAY_ENGINE_WEIGHTS.priority[normalizePriority(priority)] || TODAY_ENGINE_WEIGHTS.priority.medium;

const getScoreValue = (course) => {
  const directScore = toNumber(course?.score, NaN);
  if (Number.isFinite(directScore)) return directScore;

  const test1 = toNumber(course?.test1Score, NaN);
  const test2 = toNumber(course?.test2Score, NaN);
  const exam = toNumber(course?.examScore, NaN);

  if (!Number.isFinite(test1) || !Number.isFinite(test2) || !Number.isFinite(exam)) {
    return null;
  }

  return test1 + test2 + exam;
};

const getGradePoint = (score) => {
  const numericScore = toNumber(score, NaN);
  if (!Number.isFinite(numericScore)) return null;
  if (numericScore >= 70) return 5;
  if (numericScore >= 60) return 4;
  if (numericScore >= 50) return 3;
  if (numericScore >= 45) return 2;
  if (numericScore >= 40) return 1;
  return 0;
};

const getCurrentCgpa = (cgpaState) => {
  if (!cgpaState || !Array.isArray(cgpaState.courses)) {
    return null;
  }

  let totalUnits = 0;
  let totalWeighted = 0;

  cgpaState.courses.forEach((course) => {
    const units = toNumber(course?.creditUnits, NaN);
    const gradePoint = getGradePoint(getScoreValue(course));

    if (Number.isFinite(units) && units > 0 && Number.isFinite(gradePoint)) {
      totalUnits += units;
      totalWeighted += units * gradePoint;
    }
  });

  return totalUnits > 0 ? totalWeighted / totalUnits : null;
};

const getTargetCgpa = (cgpaState) => {
  const target = toNumber(cgpaState?.goalCgpa, NaN);
  return Number.isFinite(target) && target > 0 ? Math.min(5, target) : null;
};

const getCourseKey = (courseName) => normalizeCourseName(courseName).toLowerCase();

const getCourseMap = (cgpaState) => {
  const courses = Array.isArray(cgpaState?.courses) ? cgpaState.courses : [];
  return courses
    .flatMap((course) => {
      const normalized = {
        ...course,
        courseName: normalizeCourseName(course?.courseName),
        scoreValue: getScoreValue(course),
        creditUnitsValue: Math.max(0, toNumber(course?.creditUnits, 0)),
      };
      return normalized.courseName ? [normalized] : [];
    });
};

const getStudyWindowSeconds = (session, windowStart) => {
  const startedAt = toTimestamp(session?.startedAt);
  if (!Number.isFinite(startedAt) || startedAt < windowStart) {
    return 0;
  }

  return Math.max(0, toNumber(session?.durationSeconds, 0));
};

const getRecommendedStudyMinutes = (taskType) => {
  const normalized = normalizeTaskType(taskType);
  if (normalized === 'exam') return 240;
  if (normalized === 'test-1' || normalized === 'test-2') return 120;
  if (normalized === 'exam-timetable') return 60;
  if (normalized === 'submission-deadline') return 90;
  if (ACADEMIC_EVENT_TYPES.has(normalized)) return 90;
  return 60;
};

const buildStudyDeficitByCourse = ({ academicEvents, tasks, studySessions, cgpaState, now }) => {
  const windowStart = now - (STUDY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const courses = getCourseMap(cgpaState);
  const deficits = new Map();
  const recommended = new Map();
  const actual = new Map();

  const allAcademicItems = [
    ...academicEvents.filter((event) => ACADEMIC_EVENT_TYPES.has(normalizeTaskType(event.taskType))),
    ...tasks.filter((task) => task.dueAt && ACADEMIC_EVENT_TYPES.has(normalizeTaskType(task.taskType))),
  ];

  allAcademicItems.forEach((item) => {
    const courseName = normalizeCourseName(item.subject || item.courseTag);
    if (!courseName) return;

    const dueAt = toTimestamp(item.dueAt);
    if (!Number.isFinite(dueAt) || dueAt < windowStart - (24 * 60 * 60 * 1000)) {
      return;
    }

    const minutes = getRecommendedStudyMinutes(item.taskType);
    recommended.set(courseName, (recommended.get(courseName) || 0) + minutes);
  });

  studySessions.forEach((session) => {
    const courseName = normalizeCourseName(session.courseTag);
    if (!courseName) return;

    const seconds = getStudyWindowSeconds(session, windowStart);
    if (seconds <= 0) return;

    actual.set(courseName, (actual.get(courseName) || 0) + (seconds / 60));
  });

  courses.forEach((course) => {
    const nameKey = getCourseKey(course.courseName);
    const matchedCourseName = [...recommended.keys(), ...actual.keys()].find((key) => getCourseKey(key) === nameKey) || course.courseName;
    const recommendedMinutes = recommended.get(matchedCourseName) || 0;
    const actualMinutes = actual.get(matchedCourseName) || 0;
    const deficit = Math.max(0, recommendedMinutes - actualMinutes);

    deficits.set(course.courseName, {
      courseName: course.courseName,
      recommendedMinutes,
      actualMinutes,
      deficitMinutes: deficit,
      scoreValue: course.scoreValue,
      creditUnits: course.creditUnitsValue,
    });
  });

  [...recommended.entries()].forEach(([courseName, recommendedMinutes]) => {
    if (deficits.has(courseName)) {
      return;
    }

    const actualMinutes = actual.get(courseName) || 0;
    deficits.set(courseName, {
      courseName,
      recommendedMinutes,
      actualMinutes,
      deficitMinutes: Math.max(0, recommendedMinutes - actualMinutes),
      scoreValue: null,
      creditUnits: 0,
    });
  });

  return [...deficits.values()];
};

const buildTaskAction = (task, now) => {
  const dueBand = getDeadlineBand(task.dueAt, now);
  const dueWeight = getUrgencyWeight(dueBand);
  const academicWeight = getAcademicImportanceWeight(task.taskType);
  const priorityWeight = getTaskPriorityWeight(task.priority);
  const minutes = task.taskType === 'general' ? 45 : getRecommendedStudyMinutes(task.taskType);
  const titlePrefix = task.taskType === 'general' ? 'Complete' : 'Finish';
  const relatedCourse = task.courseTag || task.subject || '';
  const isAcademic = task.taskType !== 'general' || Boolean(relatedCourse);

  return {
    key: `task:${task.id}`,
    kind: 'task',
    title: `${titlePrefix} ${task.title}`,
    reason: dueBand === 'critical'
      ? 'This is due very soon and needs attention first.'
      : relatedCourse
        ? `${relatedCourse} is tied to a live academic task.`
        : 'This task is still open and should be cleared today.',
    estimatedDuration: minutes,
    relatedCourse: relatedCourse || undefined,
    taskId: task.id,
    urgencyLevel: dueBand === 'critical' || dueBand === 'high' ? 'high' : dueBand === 'medium' ? 'medium' : 'low',
    score: dueWeight + academicWeight + priorityWeight + (isAcademic ? SOURCE_WEIGHTS.task : 0),
    actionLabel: 'Open Task',
  };
};

const buildAcademicEventAction = (event, now) => {
  const dueBand = getDeadlineBand(event.dueAt, now);
  const dueWeight = getUrgencyWeight(dueBand);
  const academicWeight = getAcademicImportanceWeight(event.taskType);
  const courseName = event.subject || 'Unknown course';
  const minutes = getRecommendedStudyMinutes(event.taskType);

  return {
    key: `event:${event.id}`,
    kind: 'study',
    title: `Study ${courseName} for ${formatDurationLabel(minutes)}`,
    reason: dueBand === 'critical'
      ? `${event.title || 'An academic event'} is very close.`
      : `${event.taskType.replace('-', ' ')} is approaching for ${courseName}.`,
    estimatedDuration: minutes,
    relatedCourse: courseName,
    urgencyLevel: dueBand === 'critical' || dueBand === 'high' ? 'high' : dueBand === 'medium' ? 'medium' : 'low',
    score: dueWeight + academicWeight + SOURCE_WEIGHTS.academicEvent,
    actionLabel: 'Start Timer',
  };
};

const buildStudyDeficitAction = (item) => {
  const roundedMinutes = Math.max(60, Math.min(240, Math.round(item.deficitMinutes / 30) * 30 || 60));
  const studyBand = roundedMinutes >= 180 ? 'high' : roundedMinutes >= 90 ? 'medium' : 'low';
  const riskBonus = item.scoreValue !== null && item.scoreValue < 50 ? TODAY_ENGINE_WEIGHTS.risk.lowScore : 0;
  const targetGapBonus = item.scoreValue !== null && item.scoreValue < 45 ? TODAY_ENGINE_WEIGHTS.risk.weakCourse : 0;
  const labelMinutes = formatDurationLabel(roundedMinutes);

  return {
    key: `deficit:${item.courseName.toLowerCase()}`,
    kind: 'study',
    title: `Study ${item.courseName} for ${labelMinutes}`,
    reason: item.recommendedMinutes > 0
      ? `${item.courseName} is short by ${Math.round(item.deficitMinutes)} minute${Math.round(item.deficitMinutes) === 1 ? '' : 's'} against the last 7 days of required work.`
      : `Keep ${item.courseName} active to protect your academic momentum.`,
    estimatedDuration: roundedMinutes,
    relatedCourse: item.courseName,
    urgencyLevel: studyBand,
    score: Math.min(TODAY_ENGINE_WEIGHTS.studyDeficit.cap, Math.round(item.deficitMinutes / 60) * TODAY_ENGINE_WEIGHTS.studyDeficit.perHour)
      + riskBonus
      + targetGapBonus
      + SOURCE_WEIGHTS.studyDeficit,
    actionLabel: 'Start Timer',
  };
};

const buildPerformanceRiskAction = (item, targetCgpa, currentCgpa) => {
  const courseName = item.courseName;
  const lowScore = item.scoreValue !== null && item.scoreValue < 50;
  const urgent = item.scoreValue !== null && item.scoreValue < 45;
  const gapPenalty = Number.isFinite(targetCgpa) && Number.isFinite(currentCgpa) && currentCgpa < targetCgpa
    ? Math.round((targetCgpa - currentCgpa) * TODAY_ENGINE_WEIGHTS.risk.targetGap)
    : 0;

  const score = gapPenalty + (lowScore ? TODAY_ENGINE_WEIGHTS.risk.lowScore : 0) + (urgent ? TODAY_ENGINE_WEIGHTS.risk.weakCourse : 0);

  if (score <= 0) {
    return null;
  }

  return {
    key: `risk:${courseName.toLowerCase()}`,
    kind: 'study',
    title: `Protect ${courseName}`,
    reason: urgent
      ? `${courseName} is currently weak and needs immediate attention.`
      : lowScore
        ? `${courseName} is drifting below a safe score band.`
        : `Your CGPA target puts ${courseName} under pressure.`,
    estimatedDuration: urgent ? 120 : 90,
    relatedCourse: courseName,
    urgencyLevel: urgent ? 'high' : 'medium',
    score: score + SOURCE_WEIGHTS.performanceRisk,
    actionLabel: 'Start Timer',
  };
};

const buildFallbackActions = (courses, tasks, hasCgpaState) => {
  if (courses.length === 0 && tasks.length === 0) {
    return [
      {
        key: 'fallback:plan',
        kind: 'study',
        title: 'Set today\'s priorities',
        reason: 'There is no task backlog yet, so use today to define the first two academic wins.',
        estimatedDuration: 30,
        urgencyLevel: 'low',
        score: SOURCE_WEIGHTS.fallback + 3,
        actionLabel: 'Open Task',
      },
      {
        key: 'fallback:focus',
        kind: 'study',
        title: 'Start a 25 minute focus block',
        reason: 'A short session is the fastest way to keep momentum active.',
        estimatedDuration: 25,
        urgencyLevel: 'low',
        score: SOURCE_WEIGHTS.fallback + 2,
        actionLabel: 'Start Timer',
      },
      {
        key: 'fallback:review',
        kind: 'study',
        title: 'Review your CGPA goals',
        reason: hasCgpaState
          ? 'You already have grade data, so turn it into a plan for the next block.'
          : 'Once grade data exists, the engine will rank weak courses automatically.',
        estimatedDuration: 20,
        urgencyLevel: 'low',
        score: SOURCE_WEIGHTS.fallback + 1,
        actionLabel: hasCgpaState ? 'Open Task' : 'Open Task',
      },
    ];
  }

  return [];
};

const buildFeedback = ({ actions, overdueTasks, totalStudyDeficitMinutes, targetGapMinutes, weakCourses }) => {
  const messages = [];

  if (overdueTasks.length > 0) {
    const leadTask = overdueTasks[0];
    messages.push(`You are falling behind in ${leadTask.courseTag || leadTask.title}.`);
  }

  if (totalStudyDeficitMinutes > 0) {
    messages.push(`You need ${Math.max(1, Math.round(totalStudyDeficitMinutes / 60))} more study hours today.`);
  }

  if (targetGapMinutes > 0) {
    messages.push('At this pace, you may miss your CGPA target.');
  }

  if (weakCourses.length > 0) {
    messages.push(`You are falling behind in ${weakCourses[0]}.`);
  }

  if (messages.length === 0 && actions.length > 0) {
    messages.push(`First move: ${actions[0].title}.`);
  }

  return messages;
};

export const getTodayPlan = (userData = {}) => {
  const now = Date.now();
  const tasks = Array.isArray(userData.tasks)
    ? userData.tasks.flatMap((task) => {
        const normalized = normalizeTask(task);
        return normalized.title ? [normalized] : [];
      })
    : [];
  const academicEvents = Array.isArray(userData.academicEvents)
    ? userData.academicEvents.flatMap((event) => {
        const normalized = normalizeAcademicEvent(event);
        return normalized.subject || normalized.title ? [normalized] : [];
      })
    : [];
  const studySessions = Array.isArray(userData.timeSessions)
    ? userData.timeSessions.map(normalizeSession)
    : [];
  const cgpaState = normalizeCgpaState(userData.cgpaState);

  const openTasks = tasks.filter((task) => !task.completed);
  const overdueTasks = openTasks.filter((task) => getDeadlineBand(task.dueAt, now) === 'critical' && toTimestamp(task.dueAt) < now);
  const currentCgpa = getCurrentCgpa(cgpaState);
  const targetCgpa = getTargetCgpa(cgpaState);
  const studyDeficits = buildStudyDeficitByCourse({ academicEvents, tasks: openTasks, studySessions, cgpaState, now });

  const taskActions = openTasks.map((task) => buildTaskAction(task, now));
  const eventActions = academicEvents
    .flatMap((event) => !event.acknowledgedAt ? [buildAcademicEventAction(event, now)] : []);
  const deficitActions = studyDeficits
    .flatMap((item) => item.deficitMinutes > 0 ? [buildStudyDeficitAction(item)] : []);

  const weakCourses = [];
  const riskActions = [];

  if (cgpaState && Array.isArray(cgpaState.courses)) {
    cgpaState.courses.forEach((course) => {
      const scoreValue = getScoreValue(course);
      const courseName = normalizeCourseName(course?.courseName);
      if (!courseName) return;

      if (Number.isFinite(scoreValue) && scoreValue < 50) {
        weakCourses.push(courseName);
      }

      const riskAction = buildPerformanceRiskAction(
        {
          courseName,
          scoreValue,
        },
        targetCgpa,
        currentCgpa
      );

      if (riskAction) {
        riskActions.push(riskAction);
      }
    });
  }

  const allActions = [
    ...taskActions,
    ...eventActions,
    ...deficitActions,
    ...riskActions,
  ];

  const fallbackActions = buildFallbackActions(
    cgpaState?.courses || [],
    openTasks,
    Boolean(cgpaState)
  );

  const deduped = allActions
    .concat(fallbackActions)
    .reduce((acc, action) => {
      if (!action || !action.title) {
        return acc;
      }

      const existingIndex = acc.findIndex((item) => item.key === action.key);
      if (existingIndex >= 0) {
        if (action.score > acc[existingIndex].score) {
          acc[existingIndex] = action;
        }
        return acc;
      }

      acc.push(action);
      return acc;
    }, [])
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));

  const supplementalActions = deduped.length >= MIN_ACTIONS
    ? []
    : buildFallbackActions([], [], Boolean(cgpaState));

  const finalActions = deduped
    .concat(supplementalActions)
    .reduce((acc, action) => {
      if (!action || !action.title) {
        return acc;
      }

      const existingIndex = acc.findIndex((item) => item.key === action.key);
      if (existingIndex >= 0) {
        if (action.score > acc[existingIndex].score) {
          acc[existingIndex] = action;
        }
        return acc;
      }

      acc.push(action);
      return acc;
    }, [])
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));

  const trimmedActions = finalActions.slice(0, MAX_ACTIONS);
  const totalStudyDeficitMinutes = deficitActions.reduce((sum, action) => sum + toNumber(action.estimatedDuration, 0), 0);
  const targetGapMinutes = Number.isFinite(currentCgpa) && Number.isFinite(targetCgpa) && currentCgpa < targetCgpa
    ? Math.round((targetCgpa - currentCgpa) * 60)
    : 0;

  const feedback = buildFeedback({
    actions: trimmedActions,
    overdueTasks,
    totalStudyDeficitMinutes,
    targetGapMinutes,
    weakCourses,
  });

  return {
    actions: trimmedActions,
    feedback,
    summary: {
      currentCgpa,
      targetCgpa,
      openTasks: openTasks.length,
      academicEvents: academicEvents.filter((event) => !event.acknowledgedAt).length,
      studyDeficitMinutes: totalStudyDeficitMinutes,
    },
  };
};
