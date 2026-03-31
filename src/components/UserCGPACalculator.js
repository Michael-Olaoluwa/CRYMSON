import React, { useEffect, useMemo, useState } from 'react';
import styles from './UserCGPACalculator.module.css';

const USER_CGPA_STATE_KEY = 'crymson_user_cgpa_state_v1';

const createCourse = (id) => ({
  id,
  courseName: '',
  creditUnits: '',
  score: '',
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
            score: String(course.score || ''),
          }))
      : [];

    return {
      courses: parsedCourses.length > 0 ? parsedCourses : [createCourse(1)],
      nextId: Number.isInteger(parsed.nextId) ? parsed.nextId : 2,
      goalCgpa: typeof parsed.goalCgpa === 'string' ? parsed.goalCgpa : '',
      remainingUnits: typeof parsed.remainingUnits === 'string' ? parsed.remainingUnits : '',
    };
  } catch (error) {
    return {
      courses: [createCourse(1)],
      nextId: 2,
      goalCgpa: '',
      remainingUnits: '',
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

function UserCGPACalculator() {
  const initialState = useMemo(getInitialState, []);
  const [courses, setCourses] = useState(initialState.courses);
  const [nextId, setNextId] = useState(initialState.nextId);
  const [goalCgpa, setGoalCgpa] = useState(initialState.goalCgpa);
  const [remainingUnits, setRemainingUnits] = useState(initialState.remainingUnits);
  const [cgpa, setCgpa] = useState(null);
  const [classification, setClassification] = useState(null);

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

  const calculateWeightedPoints = (creditUnits, score) => {
    const units = Number(creditUnits);
    const gradePoint = getGradePoint(score);
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
      const weighted = calculateWeightedPoints(units, course.score);
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

  useEffect(() => {
    localStorage.setItem(
      USER_CGPA_STATE_KEY,
      JSON.stringify({ courses, nextId, goalCgpa, remainingUnits })
    );
  }, [courses, nextId, goalCgpa, remainingUnits]);

  const handleAddCourse = () => {
    setCourses((prev) => [...prev, createCourse(nextId)]);
    setNextId((prev) => prev + 1);
  };

  const handleUpdateCourse = (id, key, value) => {
    let nextValue = value;

    if (key === 'creditUnits' || key === 'score') {
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
        } else {
          const clampedScore = Math.min(100, Math.max(0, numericValue));
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

  return (
    <div className={styles.widget}>
      <h2 className={styles.title}>CGPA Calculator</h2>
      <p className={styles.subtitle}>Track your academic performance</p>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Course Name</th>
              <th>Credit Units</th>
              <th>Score</th>
              <th>Grade</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => {
              const gradePoint = getGradePoint(course.score);

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
                      max="100"
                      step="0.1"
                      placeholder="e.g., 75"
                      value={course.score}
                      onChange={(e) => handleUpdateCourse(course.id, 'score', e.target.value)}
                      className={styles.input}
                      inputMode="decimal"
                    />
                  </td>
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

export default UserCGPACalculator;
