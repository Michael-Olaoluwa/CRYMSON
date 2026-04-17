import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './MyTrackerWidget.module.css';
import OnboardingWizard from './OnboardingWizard';

const USER_CGPA_STATE_KEY = 'crymson_user_cgpa_state_v1';
const AUTH_SESSION_KEY = 'crymson_auth_session';
const AUTH_API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:5000`;
const ACADEMIC_REMINDER_DELAY_BY_TASK_TYPE = {
	'test-1': 24 * 60,
	'test-2': 24 * 60,
	exam: 24 * 60,
	'exam-timetable': 24 * 60,
};

const getAcademicReminderDelayMinutes = (taskType, reminderDelayMinutes) => {
	const explicitDelay = Number(reminderDelayMinutes);
	if (Number.isFinite(explicitDelay) && explicitDelay > 0) {
		return explicitDelay;
	}

	const normalizedType = String(taskType || '').toLowerCase();
	return ACADEMIC_REMINDER_DELAY_BY_TASK_TYPE[normalizedType] || 24 * 60;
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

const createCourse = (id) => ({
	id,
	courseName: '',
	creditUnits: '',
	test1Score: '',
	test2Score: '',
	examScore: '',
});

const normalizeSemesterMeta = (currentSemester, totalSemesters) => {
	const safeCurrent = Number.isInteger(currentSemester) && currentSemester > 0 ? currentSemester : 1;
	let safeTotal = Number.isInteger(totalSemesters) && totalSemesters > 0 ? totalSemesters : 8;

	if (safeTotal < safeCurrent) {
		safeTotal = safeCurrent;
	}

	return {
		safeCurrent,
		safeTotal,
	};
};

const getInitialState = () => {
	try {
		const raw = localStorage.getItem(USER_CGPA_STATE_KEY);
		if (!raw) {
			return {
				courses: [createCourse(1)],
				nextId: 2,
				goalCgpa: '',
				remainingUnits: '',
				cgpa: null,
				classification: null,
				showDashboardCard: true,
				showDashboardClassification: true,
				onboardingCompleted: false,
				currentSemester: 1,
				totalSemesters: 8,
				previousSemesters: [],
			};
		}

		const parsed = JSON.parse(raw);
		const { safeCurrent, safeTotal } = normalizeSemesterMeta(parsed.currentSemester, parsed.totalSemesters);
		const parsedCourses = Array.isArray(parsed.courses)
			? parsed.courses
					.filter((course) => Number.isInteger(course?.id))
					.map((course) => ({
						id: course.id,
						courseName: String(course.courseName || ''),
						creditUnits: String(course.creditUnits || ''),
						test1Score: String(course.test1Score || ''),
						test2Score: String(course.test2Score || ''),
						examScore: String(course.examScore || ''),
					}))
			: [];

		return {
			courses: parsedCourses.length > 0 ? parsedCourses : [createCourse(1)],
			nextId: Number.isInteger(parsed.nextId) ? parsed.nextId : 2,
			goalCgpa: typeof parsed.goalCgpa === 'string' ? parsed.goalCgpa : '',
			remainingUnits: typeof parsed.remainingUnits === 'string' ? parsed.remainingUnits : '',
			cgpa: Number.isFinite(parsed.cgpa) ? parsed.cgpa : null,
			classification: typeof parsed.classification === 'string' ? parsed.classification : null,
			showDashboardCard: typeof parsed.showDashboardCard === 'boolean' ? parsed.showDashboardCard : true,
			showDashboardClassification: typeof parsed.showDashboardClassification === 'boolean'
				? parsed.showDashboardClassification
				: true,
			onboardingCompleted: Boolean(parsed.onboardingCompleted),
			currentSemester: safeCurrent,
			totalSemesters: safeTotal,
			previousSemesters: Array.isArray(parsed.previousSemesters) ? parsed.previousSemesters : [],
		};
	} catch (error) {
		return {
			courses: [createCourse(1)],
			nextId: 2,
			goalCgpa: '',
			remainingUnits: '',
			cgpa: null,
			classification: null,
			showDashboardCard: true,
			showDashboardClassification: true,
			onboardingCompleted: false,
			currentSemester: 1,
			totalSemesters: 8,
			previousSemesters: [],
		};
	}
};

const getScoreHintFromRequiredGpa = (requiredGpa) => {
	if (!Number.isFinite(requiredGpa)) {
		return null;
	}

	if (requiredGpa <= 1) return 'At least around 40 average score';
	if (requiredGpa <= 2) return 'At least around 45 average score';
	if (requiredGpa <= 3) return 'At least around 50 average score';
	if (requiredGpa <= 4) return 'At least around 60 average score';
	if (requiredGpa <= 5) return 'At least around 70 average score';
	return 'Requires performance above current grading scale';
};

const getTargetFinalScoreFromRequiredGpa = (requiredGpa) => {
	if (!Number.isFinite(requiredGpa)) return 40;
	if (requiredGpa <= 1) return 40;
	if (requiredGpa <= 2) return 45;
	if (requiredGpa <= 3) return 50;
	if (requiredGpa <= 4) return 60;
	return 70;
};

const formatTaskTypePromptLabel = (taskType) => {
	const normalized = String(taskType || '').toLowerCase();
	if (normalized === 'test-1' || normalized === 'test-2') return 'CA';
	if (normalized === 'exam' || normalized === 'exam-timetable') return 'exam';
	return normalized.replace('-', ' ') || 'assessment';
};

const formatScoreUpdatePrompt = (event) => {
	const subject = String(event?.subject || 'course').trim();
	const taskLabel = formatTaskTypePromptLabel(event?.taskType);
	return `You said your ${subject} ${taskLabel} was today - how'd it go?`;
};

function MyTrackerWidget() {
	const initialState = useMemo(getInitialState, []);
	const [courses, setCourses] = useState(initialState.courses);
	const [nextId, setNextId] = useState(initialState.nextId);
	const [goalCgpa, setGoalCgpa] = useState(initialState.goalCgpa);
	const [remainingUnits, setRemainingUnits] = useState(initialState.remainingUnits);
	const [cgpa, setCgpa] = useState(initialState.cgpa);
	const [classification, setClassification] = useState(initialState.classification);
	const [showDashboardCard, setShowDashboardCard] = useState(initialState.showDashboardCard);
	const [showDashboardClassification, setShowDashboardClassification] = useState(initialState.showDashboardClassification);
	const [onboardingCompleted, setOnboardingCompleted] = useState(initialState.onboardingCompleted);
	const [currentSemester, setCurrentSemester] = useState(initialState.currentSemester);
	const [totalSemesters, setTotalSemesters] = useState(initialState.totalSemesters);
	const [previousSemesters, setPreviousSemesters] = useState(initialState.previousSemesters);
	const [academicEvents, setAcademicEvents] = useState([]);
	const [academicNotice, setAcademicNotice] = useState('');
	const [semesterTransitionNotice, setSemesterTransitionNotice] = useState('');
	const [clockTick, setClockTick] = useState(Date.now());
	const notifiedAcademicEventIdsRef = useRef(new Set());
	const hasHydratedCgpaStateRef = useRef(false);
	const cgpaSyncTimeoutRef = useRef(null);

	const applyCgpaState = (state) => {
		if (!state || typeof state !== 'object') return;
		const { safeCurrent, safeTotal } = normalizeSemesterMeta(state.currentSemester, state.totalSemesters);

		const parsedCourses = Array.isArray(state.courses)
			? state.courses
					.filter((course) => Number.isInteger(course?.id))
					.map((course) => ({
						id: course.id,
						courseName: String(course.courseName || ''),
						creditUnits: String(course.creditUnits || ''),
						test1Score: String(course.test1Score || ''),
						test2Score: String(course.test2Score || ''),
						examScore: String(course.examScore || ''),
					}))
			: [];

		setCourses(parsedCourses.length > 0 ? parsedCourses : [createCourse(1)]);
		setNextId(Number.isInteger(state.nextId) ? state.nextId : 2);
		setGoalCgpa(typeof state.goalCgpa === 'string' ? state.goalCgpa : '');
		setRemainingUnits(typeof state.remainingUnits === 'string' ? state.remainingUnits : '');
		setCgpa(Number.isFinite(state.cgpa) ? state.cgpa : null);
		setClassification(typeof state.classification === 'string' ? state.classification : null);
		setShowDashboardCard(typeof state.showDashboardCard === 'boolean' ? state.showDashboardCard : true);
		setShowDashboardClassification(
			typeof state.showDashboardClassification === 'boolean'
				? state.showDashboardClassification
				: true
		);
		setOnboardingCompleted(Boolean(state.onboardingCompleted));
		setCurrentSemester(safeCurrent);
		setTotalSemesters(safeTotal);
		setPreviousSemesters(Array.isArray(state.previousSemesters) ? state.previousSemesters : []);
	};

	useEffect(() => {
		let cancelled = false;

		const loadRemoteCgpaState = async () => {
			const token = getStoredToken();
			if (!token) {
				hasHydratedCgpaStateRef.current = true;
				return;
			}

			try {
				const response = await fetch(`${AUTH_API_BASE_URL}/api/user-state/cgpa`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				const payload = await response.json().catch(() => ({}));
				if (!response.ok) {
					hasHydratedCgpaStateRef.current = true;
					return;
				}

				if (cancelled) return;

				if (payload.state && typeof payload.state === 'object') {
					applyCgpaState(payload.state);
				}
			} catch (error) {
				// Keep local state if remote load fails.
			} finally {
				hasHydratedCgpaStateRef.current = true;
			}
		};

		loadRemoteCgpaState();
		return () => {
			cancelled = true;
		};
	}, []);

	const handleOnboardingComplete = (onboardingData) => {
		const { safeCurrent, safeTotal } = normalizeSemesterMeta(
			onboardingData.currentSemester,
			onboardingData.totalSemesters
		);
		setOnboardingCompleted(true);
		setGoalCgpa(String(onboardingData.goalCgpa));
		setCurrentSemester(safeCurrent);
		setTotalSemesters(safeTotal);
		setPreviousSemesters(onboardingData.previousSemesters);
	};

	const loadAcademicEvents = async () => {
		const token = getStoredToken();
		if (!token) {
			setAcademicEvents([]);
			setAcademicNotice('Sign in to sync academic reminders across devices.');
			return;
		}

		try {
			const response = await fetch(`${AUTH_API_BASE_URL}/api/academic-events`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(payload.message || 'Unable to load academic reminders.');
			}

			setAcademicEvents(Array.isArray(payload.events) ? payload.events : []);
			setAcademicNotice('');
		} catch (error) {
			setAcademicNotice(error.message || 'Unable to load academic reminders right now.');
		}
	};

	useEffect(() => {
		loadAcademicEvents();
		const intervalId = window.setInterval(() => {
			setClockTick(Date.now());
			loadAcademicEvents();
		}, 60000);

		return () => {
			window.clearInterval(intervalId);
		};
	}, []);

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

	const calculateFinalScore = (test1, test2, exam) => {
		const t1 = Number(test1);
		const t2 = Number(test2);
		const e = Number(exam);

		if (!Number.isFinite(t1) || !Number.isFinite(t2) || !Number.isFinite(e)) {
			return null;
		}

		return t1 + t2 + e;
	};

	const calculateWeightedPoints = (creditUnits, test1Score, test2Score, examScore) => {
		const units = Number(creditUnits);
		const finalScore = calculateFinalScore(test1Score, test2Score, examScore);
		const gradePoint = getGradePoint(finalScore);
		if (!Number.isFinite(units) || units <= 0 || gradePoint === null) return null;
		return units * gradePoint;
	};

	const resolveClassification = (value) => {
		if (value >= 4.5) return 'First Class';
		if (value >= 3.5) return 'Second Class Upper';
		if (value >= 2.4) return 'Second Class Lower';
		if (value >= 1.5) return 'Third Class';
		if (value > 0) return 'Pass';
		return null;
	};

	const stats = useMemo(() => {
		let totalUnits = 0;
		let totalWeighted = 0;

		courses.forEach((course) => {
			const units = Number(course.creditUnits);
			const weighted = calculateWeightedPoints(units, course.test1Score, course.test2Score, course.examScore);
			if (Number.isFinite(units) && units > 0 && Number.isFinite(weighted)) {
				totalUnits += units;
				totalWeighted += weighted;
			}
		});

		return { totalUnits, totalWeighted };
	}, [courses]);

	const currentCgpa = useMemo(() => {
		if (stats.totalUnits <= 0) {
			return null;
		}

		return stats.totalWeighted / stats.totalUnits;
	}, [stats.totalUnits, stats.totalWeighted]);

	const semesterHistory = useMemo(() => {
		const points = Array.isArray(previousSemesters)
			? previousSemesters
					.map((semester, index) => {
						const semesterNumber = Number(semester?.semester);
						const numericCgpa = Number(semester?.cgpa);
						if (!Number.isFinite(numericCgpa)) return null;

						return {
							semester: Number.isInteger(semesterNumber) && semesterNumber > 0 ? semesterNumber : index + 1,
							cgpa: Math.min(5, Math.max(0, numericCgpa)),
						};
					})
					.filter(Boolean)
			: [];

		if (Number.isFinite(currentCgpa)) {
			const alreadyHasCurrent = points.some((point) => point.semester === currentSemester);
			if (!alreadyHasCurrent) {
				points.push({
					semester: currentSemester,
					cgpa: Math.min(5, Math.max(0, currentCgpa)),
				});
			}
		}

		points.sort((left, right) => left.semester - right.semester);

		return points.map((point, index) => {
			const previous = index > 0 ? points[index - 1] : null;
			const movement = previous ? point.cgpa - previous.cgpa : 0;
			return {
				...point,
				movement,
			};
		});
	}, [previousSemesters, currentCgpa, currentSemester]);

	const semesterHistoryPath = useMemo(() => {
		if (semesterHistory.length < 2) return '';

		return semesterHistory
			.map((point, index) => {
				const x = semesterHistory.length === 1 ? 0 : (index / (semesterHistory.length - 1)) * 100;
				const y = 100 - (Math.min(5, Math.max(0, point.cgpa)) / 5) * 100;
				return `${x},${y}`;
			})
			.join(' ');
	}, [semesterHistory]);

	const semesterHistoryInsights = useMemo(() => {
		if (semesterHistory.length === 0) {
			return {
				bestSemester: null,
				largestDrop: null,
			};
		}

		const bestSemester = semesterHistory.reduce((best, point) => {
			if (!best || point.cgpa > best.cgpa) return point;
			return best;
		}, null);

		const largestDropPoint = semesterHistory
			.slice(1)
			.filter((point) => point.movement < 0)
			.reduce((worst, point) => {
				if (!worst || point.movement < worst.movement) return point;
				return worst;
			}, null);

		return {
			bestSemester,
			largestDrop: largestDropPoint
				? {
					semester: largestDropPoint.semester,
					value: Math.abs(largestDropPoint.movement),
				}
				: null,
		};
	}, [semesterHistory]);

	const goalProjection = useMemo(() => {
		const target = Number(goalCgpa);
		const plannedUnits = Number(remainingUnits);

		if (!Number.isFinite(target) || !Number.isFinite(plannedUnits) || plannedUnits <= 0) {
			return null;
		}

		const boundedTarget = Math.min(5, Math.max(0, target));
		const requiredTotalWeighted = boundedTarget * (stats.totalUnits + plannedUnits);
		const requiredFutureWeighted = requiredTotalWeighted - stats.totalWeighted;
		const requiredFutureGpa = requiredFutureWeighted / plannedUnits;

		const status = requiredFutureGpa <= 5
			? (requiredFutureGpa <= 0 ? 'already-met' : 'achievable')
			: 'unachievable';

		return {
			target: boundedTarget,
			plannedUnits,
			requiredFutureGpa,
			requiredFutureWeighted,
			status,
			scoreHint: getScoreHintFromRequiredGpa(requiredFutureGpa),
		};
	}, [goalCgpa, remainingUnits, stats.totalUnits, stats.totalWeighted]);

	const examNeedNotifications = useMemo(() => {
		const targetFinalScore = goalProjection
			? getTargetFinalScoreFromRequiredGpa(goalProjection.requiredFutureGpa)
			: 40;

		return courses
			.map((course) => {
				const courseName = String(course.courseName || '').trim() || 'Unnamed course';
				const test1 = Number(course.test1Score);
				const test2 = Number(course.test2Score);

				if (!Number.isFinite(test1) || !Number.isFinite(test2)) {
					return null;
				}

				const continuousAssessmentTotal = test1 + test2;
				const requiredExam = targetFinalScore - continuousAssessmentTotal;

				if (requiredExam <= 0) {
					return {
						courseId: course.id,
						courseName,
						type: 'secured',
						message: `${courseName}: You already secured this target before exam.`,
					};
				}

				if (requiredExam > 70) {
					return {
						courseId: course.id,
						courseName,
						type: 'risk',
						message: `${courseName}: You need ${requiredExam.toFixed(1)} in exam (above 70, currently not feasible).`,
					};
				}

				return {
					courseId: course.id,
					courseName,
					type: 'need',
					message: `${courseName}: You need ${requiredExam.toFixed(1)} in exam.`,
				};
			})
			.filter(Boolean)
			.sort((left, right) => {
				const leftWeight = left.type === 'risk' ? 0 : left.type === 'need' ? 1 : 2;
				const rightWeight = right.type === 'risk' ? 0 : right.type === 'need' ? 1 : 2;
				return leftWeight - rightWeight;
			});
	}, [courses, goalProjection]);

	const semesterProjection = useMemo(() => {
		if (!goalProjection || goalProjection.plannedUnits <= 0) {
			return [];
		}

		const estimatedSemesters = Math.min(8, Math.max(1, Math.ceil(goalProjection.plannedUnits / 18)));
		const points = [];

		for (let semester = 1; semester <= estimatedSemesters; semester += 1) {
			const completedFutureUnits = (goalProjection.plannedUnits * semester) / estimatedSemesters;
			const projectedWeighted = stats.totalWeighted + (goalProjection.requiredFutureGpa * completedFutureUnits);
			const projectedUnits = stats.totalUnits + completedFutureUnits;
			const projectedCgpa = projectedUnits > 0 ? projectedWeighted / projectedUnits : 0;

			points.push({
				semester,
				projectedCgpa,
				targetCgpa: goalProjection.target,
			});
		}

		return points;
	}, [goalProjection, stats.totalUnits, stats.totalWeighted]);

	const chartPath = useMemo(() => {
		if (semesterProjection.length === 0) {
			return '';
		}

		return semesterProjection
			.map((point, index) => {
				const x = semesterProjection.length === 1 ? 0 : (index / (semesterProjection.length - 1)) * 100;
				const y = 100 - (Math.min(5, Math.max(0, point.projectedCgpa)) / 5) * 100;
				return `${x},${y}`;
			})
			.join(' ');
	}, [semesterProjection]);

	const targetLineY = useMemo(() => {
		if (!goalProjection) {
			return 0;
		}

		return 100 - (Math.min(5, Math.max(0, goalProjection.target)) / 5) * 100;
	}, [goalProjection]);

	const academicReminders = useMemo(() => {
		const now = clockTick;
		const scoreEntryTypes = new Set(['test-1', 'test-2', 'exam', 'exam-timetable']);

		return academicEvents
			.filter((event) => scoreEntryTypes.has(String(event.taskType || '').toLowerCase()))
			.filter((event) => !event.acknowledgedAt)
			.map((event) => {
				const dueTime = new Date(event.dueAt).getTime();
				const reminderDelayMinutes = getAcademicReminderDelayMinutes(event.taskType, event.reminderDelayMinutes);
				const reminderAt = dueTime + reminderDelayMinutes * 60000;
				return {
					...event,
					dueTime,
					reminderAt,
					isDue: Number.isFinite(reminderAt) && now >= reminderAt,
				};
			})
			.filter((event) => event.isDue)
			.sort((left, right) => left.reminderAt - right.reminderAt);
	}, [academicEvents, clockTick]);

	useEffect(() => {
		if (!('Notification' in window) || Notification.permission !== 'granted') {
			return undefined;
		}

		academicReminders.forEach((event) => {
			if (notifiedAcademicEventIdsRef.current.has(event.id)) {
				return;
			}

			new Notification('Crymson score reminder', {
				body: formatScoreUpdatePrompt(event),
				tag: `academic-${event.id}`,
			});
			notifiedAcademicEventIdsRef.current.add(event.id);
		});

		return undefined;
	}, [academicReminders]);

	const handleAcknowledgeAcademicEvent = async (eventId) => {
		const token = getStoredToken();
		if (!token) {
			setAcademicEvents((prev) => prev.filter((event) => event.id !== eventId));
			return;
		}

		try {
			const response = await fetch(`${AUTH_API_BASE_URL}/api/academic-events/${eventId}/acknowledge`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(payload.message || 'Unable to update the reminder.');
			}

			setAcademicEvents((prev) => prev.filter((event) => event.id !== eventId));
		} catch (error) {
			setAcademicNotice(error.message || 'Unable to update the reminder right now.');
		}
	};

	useEffect(() => {
		localStorage.setItem(
			USER_CGPA_STATE_KEY,
			JSON.stringify({
				courses,
				nextId,
				goalCgpa,
				remainingUnits,
				cgpa,
				classification,
				showDashboardCard,
				showDashboardClassification,
				onboardingCompleted,
				currentSemester,
				totalSemesters,
				previousSemesters,
			})
		);
	}, [
		courses,
		nextId,
		goalCgpa,
		remainingUnits,
		cgpa,
		classification,
		showDashboardCard,
		showDashboardClassification,
		onboardingCompleted,
		currentSemester,
		totalSemesters,
		previousSemesters,
	]);

	useEffect(() => {
		const token = getStoredToken();
		if (!token || !hasHydratedCgpaStateRef.current) return undefined;

		if (cgpaSyncTimeoutRef.current) {
			window.clearTimeout(cgpaSyncTimeoutRef.current);
		}

		cgpaSyncTimeoutRef.current = window.setTimeout(async () => {
			const state = {
				courses,
				nextId,
				goalCgpa,
				remainingUnits,
				cgpa,
				classification,
				showDashboardCard,
				showDashboardClassification,
				onboardingCompleted,
				currentSemester,
				totalSemesters,
				previousSemesters,
			};

			try {
				await fetch(`${AUTH_API_BASE_URL}/api/user-state/cgpa`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ state }),
				});
			} catch (error) {
				// Keep local save even if remote sync fails.
			}
		}, 300);

		return () => {
			if (cgpaSyncTimeoutRef.current) {
				window.clearTimeout(cgpaSyncTimeoutRef.current);
			}
		};
	}, [
		courses,
		nextId,
		goalCgpa,
		remainingUnits,
		cgpa,
		classification,
		showDashboardCard,
		showDashboardClassification,
		onboardingCompleted,
		currentSemester,
		totalSemesters,
		previousSemesters,
	]);

	const handleAddCourse = () => {
		setCourses((prev) => [...prev, createCourse(nextId)]);
		setNextId((prev) => prev + 1);
	};

	const handleUpdateCourse = (id, key, value) => {
		let nextValue = value;

		if (key === 'creditUnits' || key === 'test1Score' || key === 'test2Score' || key === 'examScore') {
			if (value === '') {
				nextValue = '';
			} else {
				const numericValue = Number(value);
				if (!Number.isFinite(numericValue)) {
					return;
				}

				if (key === 'creditUnits') {
					const clampedUnits = Math.min(10, Math.max(0, numericValue));
					nextValue = String(clampedUnits);
				} else if (key === 'test1Score' || key === 'test2Score') {
					// Test 1 and Test 2: max 15
					const clampedScore = Math.min(15, Math.max(0, numericValue));
					nextValue = String(clampedScore);
				} else if (key === 'examScore') {
					// Exam: max 70
					const clampedScore = Math.min(70, Math.max(0, numericValue));
					nextValue = String(clampedScore);
				}
			}
		}

		setCourses((prev) => prev.map((course) => (course.id === id ? { ...course, [key]: nextValue } : course)));
	};

	const handleRemoveCourse = (id) => {
		setCourses((prev) => prev.filter((course) => course.id !== id));
	};

	const handleCalculate = () => {
		if (stats.totalUnits === 0) {
			setCgpa(null);
			setClassification(null);
			return;
		}

		const value = stats.totalWeighted / stats.totalUnits;
		setCgpa(value);
		setClassification(resolveClassification(value));
	};

	const handleReset = () => {
		setCourses([createCourse(1)]);
		setNextId(2);
		setGoalCgpa('');
		setRemainingUnits('');
		setCgpa(null);
		setClassification(null);
		setSemesterTransitionNotice('');
	};

	const handleAdvanceSemester = () => {
		setSemesterTransitionNotice('');

		if (!Number.isFinite(currentCgpa)) {
			setSemesterTransitionNotice('Enter course scores and calculate CGPA before ending the semester.');
			return;
		}

		if (currentSemester >= totalSemesters) {
			setSemesterTransitionNotice('You are already in your final semester.');
			return;
		}

		const shouldProceed = window.confirm(
			`End Semester ${currentSemester} and start Semester ${currentSemester + 1}? This will archive the current semester CGPA and clear current course entries.`
		);

		if (!shouldProceed) {
			return;
		}

		const completedSemesterCgpa = Math.min(5, Math.max(0, currentCgpa));
		setPreviousSemesters((prev) => {
			const withoutCurrent = prev.filter((entry) => Number(entry?.semester) !== currentSemester);
			return [
				...withoutCurrent,
				{
					semester: currentSemester,
					cgpa: Number(completedSemesterCgpa.toFixed(2)),
				},
			].sort((left, right) => Number(left.semester) - Number(right.semester));
		});

		setCurrentSemester((prev) => Math.min(totalSemesters, prev + 1));
		setCourses([createCourse(1)]);
		setNextId(2);
		setCgpa(null);
		setClassification(null);
		setSemesterTransitionNotice(`Semester ${currentSemester + 1} started. Add new courses for this semester.`);
	};

	const handleGoalCgpaChange = (value) => {
		if (value === '') {
			setGoalCgpa('');
			return;
		}

		const numeric = Number(value);
		if (!Number.isFinite(numeric)) {
			return;
		}

		setGoalCgpa(String(Math.min(5, Math.max(0, numeric))));
	};

	const handleRemainingUnitsChange = (value) => {
		if (value === '') {
			setRemainingUnits('');
			return;
		}

		const numeric = Number(value);
		if (!Number.isFinite(numeric)) {
			return;
		}

		setRemainingUnits(String(Math.min(300, Math.max(0, numeric))));
	};

	const handleDashboardCardToggle = (value) => {
		setShowDashboardCard(value);
	};

	const handleDashboardClassToggle = (value) => {
		setShowDashboardClassification(value);
	};

	const canAdvanceSemester = currentSemester < totalSemesters;

	if (!onboardingCompleted) {
		return <OnboardingWizard onComplete={handleOnboardingComplete} />;
	}

	return (
		<div className={styles.widget}>
			<h2 className={styles.title}>CGPA Tracker</h2>
			<p className={styles.subtitle}>Track your academic performance</p>

			<div className={styles.preferenceRow}>
				<label className={styles.preferenceToggle}>
					<input
						type="checkbox"
						checked={showDashboardCard}
						onChange={(event) => handleDashboardCardToggle(event.target.checked)}
					/>
					<span>Show CGPA widget on dashboard</span>
				</label>
				<label className={styles.preferenceToggle}>
					<input
						type="checkbox"
						checked={showDashboardClassification}
						onChange={(event) => handleDashboardClassToggle(event.target.checked)}
					/>
					<span>Show class label on dashboard</span>
				</label>
			</div>

			<div className={styles.semesterInfo}>
				<p className={styles.semesterText}>
					Semester <strong>{currentSemester}</strong> of <strong>{totalSemesters}</strong>
				</p>
				{previousSemesters.length > 0 && (
					<p className={styles.historyText}>
						Previous CGPA: {previousSemesters.map((s) => s.cgpa).join(' → ')}
					</p>
				)}
				<div className={styles.semesterActions}>
					<button
						type="button"
						onClick={handleAdvanceSemester}
						className={styles.btnAdvanceSemester}
						disabled={!canAdvanceSemester}
					>
						End Semester {currentSemester} and Start Semester {Math.min(totalSemesters, currentSemester + 1)}
					</button>
				</div>
				{semesterTransitionNotice && <p className={styles.semesterNotice}>{semesterTransitionNotice}</p>}
			</div>

			<section className={styles.historySection}>
				<h3 className={styles.historyTitle}>Semester History</h3>
				<p className={styles.historyHint}>Track how your CGPA moves from semester to semester.</p>

				<div className={styles.historyHighlights}>
					<div className={styles.historyHighlightCard}>
						<p className={styles.historyHighlightLabel}>Best Semester</p>
						<p className={styles.historyHighlightValue}>
							{semesterHistoryInsights.bestSemester
								? `Semester ${semesterHistoryInsights.bestSemester.semester} (${semesterHistoryInsights.bestSemester.cgpa.toFixed(2)})`
								: 'No semester data yet'}
						</p>
					</div>
					<div className={styles.historyHighlightCard}>
						<p className={styles.historyHighlightLabel}>Largest Drop</p>
						<p className={`${styles.historyHighlightValue} ${styles.historyHighlightToneRisk}`}>
							{semesterHistoryInsights.largestDrop
								? `Semester ${semesterHistoryInsights.largestDrop.semester} (-${semesterHistoryInsights.largestDrop.value.toFixed(2)})`
								: 'No downward movement yet'}
						</p>
					</div>
				</div>

				{semesterHistory.length < 2 ? (
					<p className={styles.historyEmpty}>
						Add previous semester CGPAs (and calculate current CGPA) to see movement.
					</p>
				) : (
					<>
						<div className={styles.historyChartWrap}>
							<svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.historyChart}>
								<polyline points={semesterHistoryPath} className={styles.historyLine} />
							</svg>
						</div>

						<div className={styles.historyTableWrap}>
							<table className={styles.historyTable}>
								<thead>
									<tr>
										<th>Semester</th>
										<th>CGPA</th>
										<th>Movement</th>
									</tr>
								</thead>
								<tbody>
									{semesterHistory.map((point, index) => {
										const isCurrent = point.semester === currentSemester;
										const movementText = index === 0
											? 'Baseline'
											: point.movement > 0
												? `+${point.movement.toFixed(2)}`
												: point.movement.toFixed(2);

										return (
											<tr key={point.semester}>
												<td>
													Semester {point.semester}
													{isCurrent ? ' (current)' : ''}
												</td>
												<td>{point.cgpa.toFixed(2)}</td>
												<td
													className={
														index === 0
															? styles.historyMovementFlat
															: point.movement > 0
																? styles.historyMovementUp
																: point.movement < 0
																	? styles.historyMovementDown
																	: styles.historyMovementFlat
													}
												>
													{movementText}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</>
				)}
			</section>

			<section className={styles.reminderSection}>
				<h3 className={styles.reminderTitle}>Academic Score Reminders</h3>
				<p className={styles.reminderHint}>
					Tests and exams added in the To-Do Planner appear here after their reminder time, so you can enter the score into the tracker.
				</p>
				{academicNotice && <p className={styles.reminderNotice}>{academicNotice}</p>}
				{academicReminders.length === 0 ? (
					<p className={styles.reminderEmpty}>No score reminders are due right now.</p>
				) : (
					<div className={styles.reminderList}>
						{academicReminders.map((event) => (
							<article key={event.id} className={styles.reminderCard}>
								<div>
									<p className={styles.reminderBadge}>{event.taskType.replace('-', ' ')}</p>
									<h4 className={styles.reminderSubject}>{event.subject}</h4>
									<p className={styles.reminderMeta}>{event.title}</p>
									<p className={styles.reminderMeta}>{formatScoreUpdatePrompt(event)}</p>
									<p className={styles.reminderMeta}>
										Reminder time: {new Date(event.reminderAt).toLocaleString()}
									</p>
								</div>
								<button
									type="button"
									className={styles.reminderButton}
									onClick={() => handleAcknowledgeAcademicEvent(event.id)}
								>
									I entered this score
								</button>
							</article>
						))}
					</div>
				)}
			</section>

			<section className={styles.examAlertSection}>
				<h3 className={styles.examAlertTitle}>Smart Exam Alerts</h3>
				<p className={styles.examAlertHint}>
					Based on your CA/Test entries{goalProjection ? ' and current CGPA target context' : ''}, here is what you need in each exam.
				</p>
				{examNeedNotifications.length === 0 ? (
					<p className={styles.examAlertEmpty}>Enter Test 1 and Test 2 scores to get exam-needed alerts.</p>
				) : (
					<div className={styles.examAlertList}>
						{examNeedNotifications.map((alert) => (
							<article
								key={alert.courseId}
								className={`${styles.examAlertCard} ${
									alert.type === 'risk'
										? styles.examAlertRisk
										: alert.type === 'need'
											? styles.examAlertNeed
											: styles.examAlertSecured
								}`}
							>
								<p className={styles.examAlertMessage}>{alert.message}</p>
							</article>
						))}
					</div>
				)}
			</section>

			<div className={styles.tableWrapper}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Course Name</th>
							<th>Credit Units</th>
							<th>Test 1</th>
							<th>Test 2</th>
							<th>Exam</th>
							<th>Final Score</th>
							<th>Grade</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{courses.map((course) => {
							const finalScore = calculateFinalScore(course.test1Score, course.test2Score, course.examScore);
							const gradePoint = getGradePoint(finalScore);

							return (
								<tr key={course.id}>
									<td>
										<input
											type="text"
											placeholder="e.g., Math 101"
											value={course.courseName}
											onChange={(e) => handleUpdateCourse(course.id, 'courseName', e.target.value)}
											className={styles.input}
										/>
									</td>
									<td>
										<input
											type="number"
											min="0"
											max="10"
											step="0.5"
											placeholder="e.g., 3"
											value={course.creditUnits}
											onChange={(e) => handleUpdateCourse(course.id, 'creditUnits', e.target.value)}
											className={styles.input}
											inputMode="decimal"
										/>
									</td>
									<td>
										<input
											type="number"
											min="0"
											max="15"
											step="0.1"
											placeholder="e.g., 12"
											value={course.test1Score}
											onChange={(e) => handleUpdateCourse(course.id, 'test1Score', e.target.value)}
											className={styles.input}
											inputMode="decimal"
										/>
									</td>
									<td>
										<input
											type="number"
											min="0"
											max="15"
											step="0.1"
											placeholder="e.g., 10"
											value={course.test2Score}
											onChange={(e) => handleUpdateCourse(course.id, 'test2Score', e.target.value)}
											className={styles.input}
											inputMode="decimal"
										/>
									</td>
									<td>
										<input
											type="number"
											min="0"
											max="70"
											step="0.1"
											placeholder="e.g., 50"
											value={course.examScore}
											onChange={(e) => handleUpdateCourse(course.id, 'examScore', e.target.value)}
											className={styles.input}
											inputMode="decimal"
										/>
									</td>
									<td className={styles.gradeCell}>{finalScore !== null ? finalScore.toFixed(1) : '—'}</td>
									<td className={styles.gradeCell}>{gradePoint !== null ? gradePoint.toFixed(1) : '—'}</td>
									<td>
										<button
											type="button"
											onClick={() => handleRemoveCourse(course.id)}
											className={styles.removeBtn}
											aria-label={`Remove ${course.courseName || 'course'}`}
										>
											✕
										</button>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			<div className={styles.controls}>
				<button type="button" onClick={handleAddCourse} className={styles.btnAdd}>
					+ Add Course
				</button>
				<button type="button" onClick={handleCalculate} className={styles.btnCalculate}>
					Calculate CGPA
				</button>
				<button type="button" onClick={handleReset} className={styles.btnReset}>
					Reset
				</button>
			</div>

			{cgpa !== null && (
				<div className={styles.results}>
					<div className={styles.resultItem}>
						<span className={styles.resultLabel}>CGPA</span>
						<span className={styles.resultValue}>{cgpa.toFixed(2)}</span>
					</div>
					<div className={styles.resultItem}>
						<span className={styles.resultLabel}>Classification</span>
						<span className={styles.resultValue}>{classification || '—'}</span>
					</div>
				</div>
			)}

			<section className={styles.goalSection}>
				<h3 className={styles.goalTitle}>Goal CGPA Projection</h3>
				<p className={styles.goalHint}>Set a target and estimate how many credit units you still have left.</p>

				<div className={styles.goalInputs}>
					<label className={styles.goalField}>
						<span>Target CGPA (0-5)</span>
						<input
							type="number"
							min="0"
							max="5"
							step="0.01"
							inputMode="decimal"
							value={goalCgpa}
							onChange={(e) => handleGoalCgpaChange(e.target.value)}
							className={styles.input}
							placeholder="e.g., 4.20"
						/>
					</label>

					<label className={styles.goalField}>
						<span>Remaining Credit Units</span>
						<input
							type="number"
							min="0"
							max="300"
							step="0.5"
							inputMode="decimal"
							value={remainingUnits}
							onChange={(e) => handleRemainingUnitsChange(e.target.value)}
							className={styles.input}
							placeholder="How many units do you have left?"
						/>
					</label>
				</div>

				{goalProjection && (
					<div
						className={`${styles.projectionCard} ${
							goalProjection.status === 'unachievable' ? styles.projectionRisk : styles.projectionGood
						}`}
					>
						<p className={styles.projectionLine}>
							Required average future GPA:{' '}
							<strong>{Math.max(0, goalProjection.requiredFutureGpa).toFixed(2)}</strong>
						</p>
						<p className={styles.projectionLine}>
							Required weighted points in remaining units:{' '}
							<strong>{Math.max(0, goalProjection.requiredFutureWeighted).toFixed(2)}</strong>
						</p>
						<p className={styles.projectionLine}>{goalProjection.scoreHint}</p>
						{goalProjection.status === 'already-met' && (
							<p className={styles.projectionStatus}>Great news: your current CGPA trend already meets this target.</p>
						)}
						{goalProjection.status === 'unachievable' && (
							<p className={styles.projectionStatus}>
								This target is not reachable with the entered remaining units under a 5.00 grading cap.
							</p>
						)}
					</div>
				)}

				{goalProjection && semesterProjection.length > 0 && (
					<div className={styles.chartSection}>
						<p className={styles.chartTitle}>Semester Projection Path</p>
						<svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.chart}>
							<line x1="0" y1={targetLineY} x2="100" y2={targetLineY} className={styles.targetLine} />
							<polyline points={chartPath} className={styles.progressLine} />
						</svg>
						<div className={styles.chartLegend}>
							<span>Target line</span>
							<span>Projected CGPA path (up to {semesterProjection.length} semesters)</span>
						</div>

						<div className={styles.semesterList}>
							{semesterProjection.map((item) => (
								<div key={item.semester} className={styles.semesterItem}>
									<span>Semester {item.semester}</span>
									<strong>{item.projectedCgpa.toFixed(2)}</strong>
								</div>
							))}
						</div>
						{currentCgpa !== null && (
							<p className={styles.currentInfo}>Current CGPA baseline: {currentCgpa.toFixed(2)}</p>
						)}
					</div>
				)}
			</section>
		</div>
	);
}

export default MyTrackerWidget;
