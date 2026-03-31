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
    };
  } catch (error) {
    return {
      courses: [createCourse(1)],
      nextId: 2,
    };
  }
};

function UserCGPACalculator() {
  const initialState = useMemo(getInitialState, []);
  const [courses, setCourses] = useState(initialState.courses);
  const [nextId, setNextId] = useState(initialState.nextId);
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

  useEffect(() => {
    localStorage.setItem(
      USER_CGPA_STATE_KEY,
      JSON.stringify({ courses, nextId })
    );
  }, [courses, nextId]);

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
    setCgpa(null);
    setClassification(null);
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
    </div>
  );
}

export default UserCGPACalculator;
