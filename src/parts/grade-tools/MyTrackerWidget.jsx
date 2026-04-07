import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './MyTrackerWidget.module.css';
import OnboardingWizard from './OnboardingWizard';

const USER_CGPA_STATE_KEY = 'crymson_user_cgpa_state_v1';
const AUTH_SESSION_KEY = 'crymson_auth_session';
const AUTH_API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:5000`;
const ACADEMIC_REMINDER_DELAY_MINUTES = 60;

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

const getInitialState = () => {
	try {
		const raw = localStorage.getItem(USER_CGPA_STATE_KEY);
		if (!raw) {
			return {
				courses: [createCourse(1)],
				nextId: 2,
				goalCgpa: '',
				remainingUnits: '',
				onboardingCompleted: false,
				currentSemester: 1,
				totalSemesters: 8,
				previousSemesters: [],
			};
		}

		const parsed = JSON.parse(raw);
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
			onboardingCompleted: Boolean(parsed.onboardingCompleted),
			currentSemester: Number.isInteger(parsed.currentSemester) ? parsed.currentSemester : 1,
			totalSemesters: Number.isInteger(parsed.totalSemesters) ? parsed.totalSemesters : 8,
			previousSemesters: Array.isArray(parsed.previousSemesters) ? parsed.previousSemesters : [],
		};
	} catch (error) {
		return {
			courses: [createCourse(1)],
			nextId: 2,
			goalCgpa: '',
			remainingUnits: '',
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
	const [cgpa, setCgpa] = useState(null);
	const [classification, setClassification] = useState(null);
	const [onboardingCompleted, setOnboardingCompleted] = useState(initialState.onboardingCompleted);
	const [currentSemester, setCurrentSemester] = useState(initialState.currentSemester);
	const [totalSemesters, setTotalSemesters] = useState(initialState.totalSemesters);
	const [previousSemesters, setPreviousSemesters] = useState(initialState.previousSemesters);
	const [academicEvents, setAcademicEvents] = useState([]);
	const [academicNotice, setAcademicNotice] = useState('');
	const [clockTick, setClockTick] = useState(Date.now());
	const notifiedAcademicEventIdsRef = useRef(new Set());

	const handleOnboardingComplete = (onboardingData) => {
		setOnboardingCompleted(true);
		setGoalCgpa(String(onboardingData.goalCgpa));
		setCurrentSemester(onboardingData.currentSemester);
		setTotalSemesters(onboardingData.totalSemesters);
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
				const reminderAt = dueTime + (Number(event.reminderDelayMinutes) || ACADEMIC_REMINDER_DELAY_MINUTES) * 60000;
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
				onboardingCompleted,
				currentSemester,
				totalSemesters,
				previousSemesters,
			})
		);
	}, [courses, nextId, goalCgpa, remainingUnits, onboardingCompleted, currentSemester, totalSemesters, previousSemesters]);

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

	if (!onboardingCompleted) {
		return <OnboardingWizard onComplete={handleOnboardingComplete} />;
	}

	return (
		<div className={styles.widget}>
			<h2 className={styles.title}>CGPA Tracker</h2>
			<p className={styles.subtitle}>Track your academic performance</p>

			<div className={styles.semesterInfo}>
				<p className={styles.semesterText}>
					Semester <strong>{currentSemester}</strong> of <strong>{totalSemesters}</strong>
				</p>
				{previousSemesters.length > 0 && (
					<p className={styles.historyText}>
						Previous CGPA: {previousSemesters.map((s) => s.cgpa).join(' → ')}
					</p>
				)}
			</div>

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
