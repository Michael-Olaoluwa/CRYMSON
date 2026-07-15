import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calcCumulativeCgpa,
  resolveClassification,
  calcSemesterGpa,
  getGradePoint,
  getGradeLabel,
} from '../../../utils/academicEngine';
import AcademicStatus from './AcademicStatus';
import CourseTable from './CourseTable';
import ExamIntelligence from './ExamIntelligence';
import RescueMode from './RescueMode';
import CourseImpact from './CourseImpact';
import WhatIfSimulator from './WhatIfSimulator';
import SemesterHistory from './SemesterHistory';
import styles from './AcademicTracker.module.css';

function makeBlankCourse(id) {
  return {
    id,
    courseName: '',
    creditUnits: '',
    test1Score: '',
    test2Score: '',
    examScore: '',
  };
}

const LS_KEY = 'crymson_cgpa';
const API_BASE = '/api/user-state/all';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded — silently continue */
  }
}

export default function AcademicTracker() {
  const [courses, setCourses] = useState(() => {
    const saved = loadFromStorage();
    return saved?.courses || [];
  });

  const [nextId, setNextId] = useState(() => {
    const saved = loadFromStorage();
    return saved?.nextId || (courses.length > 0 ? Math.max(...courses.map((c) => c.id || 0)) + 1 : 1);
  });

  const [goalCgpa, setGoalCgpa] = useState(() => {
    const saved = loadFromStorage();
    return saved?.goalCgpa || '';
  });

  const [remainingUnits, setRemainingUnits] = useState(() => {
    const saved = loadFromStorage();
    return saved?.remainingUnits || '';
  });

  const [cgpa, setCgpa] = useState(() => {
    const saved = loadFromStorage();
    return saved?.cgpa ?? '';
  });

  const [classification, setClassification] = useState(() => {
    const saved = loadFromStorage();
    return saved?.classification || '';
  });

  const [showDashboardCard, setShowDashboardCard] = useState(() => {
    const saved = loadFromStorage();
    return saved?.showDashboardCard ?? true;
  });

  const [showDashboardClassification, setShowDashboardClassification] = useState(() => {
    const saved = loadFromStorage();
    return saved?.showDashboardClassification ?? true;
  });

  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    const saved = loadFromStorage();
    return saved?.onboardingCompleted ?? true;
  });

  const [currentSemester, setCurrentSemester] = useState(() => {
    const saved = loadFromStorage();
    return saved?.currentSemester || 1;
  });

  const [totalSemesters, setTotalSemesters] = useState(() => {
    const saved = loadFromStorage();
    return saved?.totalSemesters || 8;
  });

  const [previousSemesters, setPreviousSemesters] = useState(() => {
    const saved = loadFromStorage();
    return saved?.previousSemesters || [];
  });

  // Auto-calculate CGPA whenever courses change
  const currentCgpa = useMemo(() => {
    const result = calcSemesterGpa(courses);
    return result.gpa;
  }, [courses]);

  const currentClassification = useMemo(() => {
    return resolveClassification(currentCgpa);
  }, [currentCgpa]);

  // Persist to localStorage and backend on change (debounced)
  useEffect(() => {
    const state = {
      courses,
      nextId,
      goalCgpa,
      remainingUnits,
      cgpa: currentCgpa,
      classification: currentClassification || '',
      showDashboardCard,
      showDashboardClassification,
      onboardingCompleted,
      currentSemester,
      totalSemesters,
      previousSemesters,
    };

    saveToStorage(state);

    const timer = setTimeout(() => {
      fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cgpaState: state }),
      }).catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [
    courses, nextId, goalCgpa, remainingUnits, currentCgpa, currentClassification,
    showDashboardCard, showDashboardClassification, onboardingCompleted,
    currentSemester, totalSemesters, previousSemesters,
  ]);

  // Compose the full cgpaState for child components
  const cgpaState = useMemo(() => ({
    courses,
    nextId,
    goalCgpa,
    remainingUnits,
    cgpa: currentCgpa,
    classification: currentClassification || '',
    showDashboardCard,
    showDashboardClassification,
    onboardingCompleted,
    currentSemester,
    totalSemesters,
    previousSemesters,
  }), [
    courses, nextId, goalCgpa, remainingUnits, currentCgpa, currentClassification,
    showDashboardCard, showDashboardClassification, onboardingCompleted,
    currentSemester, totalSemesters, previousSemesters,
  ]);

  const addCourse = useCallback(() => {
    setCourses((prev) => [...prev, makeBlankCourse(nextId)]);
    setNextId((prev) => prev + 1);
  }, [nextId]);

  const removeCourse = useCallback((id) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const advanceSemester = useCallback(() => {
    const gpa = currentCgpa;
    if (gpa === null || gpa === undefined) return;

    setPreviousSemesters((prev) => [
      ...prev,
      { semester: currentSemester, cgpa: gpa },
    ]);
    setCourses([]);
    setCurrentSemester((prev) => prev + 1);
  }, [currentCgpa, currentSemester]);

  return (
    <div className={styles.tracker}>
      {/* Preferences */}
      <div className={styles.preferenceRow}>
        <label className={styles.preferenceToggle}>
          <input
            type="checkbox"
            checked={showDashboardCard}
            onChange={(e) => setShowDashboardCard(e.target.checked)}
          />
          Show on dashboard
        </label>
        <label className={styles.preferenceToggle}>
          <input
            type="checkbox"
            checked={showDashboardClassification}
            onChange={(e) => setShowDashboardClassification(e.target.checked)}
          />
          Show classification
        </label>
      </div>

      {/* Semester Info */}
      <div className={styles.semesterBar}>
        <p className={styles.semesterText}>
          Semester <strong>{currentSemester}</strong> of {totalSemesters}
          {previousSemesters.length > 0 && (
            <> &middot; {previousSemesters.length} past semester{previousSemesters.length !== 1 ? 's' : ''}</>
          )}
        </p>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={advanceSemester}
          disabled={currentCgpa === null}
          title={currentCgpa === null ? 'Add courses before advancing' : 'Save current semester and start next'}
        >
          Advance Semester &rarr;
        </button>
      </div>

      {/* Primary Status Display */}
      <AcademicStatus cgpaState={cgpaState} />

      {/* Semester History */}
      <SemesterHistory previousSemesters={previousSemesters} />

      {/* Academic Reminders */}
      <AcademicReminders courses={courses} />

      {/* Course Input Table — auto-calculates */}
      <CourseTable
        courses={courses}
        onChange={setCourses}
        onRemove={removeCourse}
        onAdd={addCourse}
      />

      {/* Exam Score Intelligence */}
      <ExamIntelligence courses={courses} />

      {/* Rescue Mode */}
      <RescueMode cgpaState={cgpaState} />

      {/* Course Impact Analysis */}
      <CourseImpact courses={courses} />

      {/* What-If Simulator */}
      <WhatIfSimulator cgpaState={cgpaState} />
    </div>
  );
}

/* ── Inline Academic Reminders (lightweight) ────────────── */
function AcademicReminders({ courses }) {
  const reminders = useMemo(() => {
    const items = [];
    for (const course of courses) {
      const t1 = Number(course.test1Score);
      const t2 = Number(course.test2Score);
      const exam = Number(course.examScore);
      if (Number.isFinite(t1) && Number.isFinite(t2) && t1 + t2 > 30) {
        items.push({
          id: course.id,
          subject: course.courseName || 'Unnamed course',
          text: `CA score (${t1 + t2}) exceeds 30. Verify your inputs.`,
          type: 'warning',
        });
      }
      if (Number.isFinite(exam) && exam > 70) {
        items.push({
          id: course.id + '_exam',
          subject: course.courseName || 'Unnamed course',
          text: `Exam score (${exam}) exceeds 70. Verify your input.`,
          type: 'warning',
        });
      }
    }
    return items;
  }, [courses]);

  if (reminders.length === 0) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Data Validation</h3>
      {reminders.map((r) => (
        <div key={r.id} className={styles.reminderCard}>
          <div>
            <span className={styles.reminderBadge}>{r.type}</span>
            <p className={styles.reminderSubject}>{r.subject}</p>
            <p className={styles.reminderMeta}>{r.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
