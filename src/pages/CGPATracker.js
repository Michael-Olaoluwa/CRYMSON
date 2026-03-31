import React, { useEffect, useMemo, useState } from 'react';
import TitleBlock from '../parts/grade-tools/TitleBlock';
import ActionButtons from '../parts/grade-tools/ActionButtons';
import CourseTable from '../parts/grade-tools/CourseTable';
import ResultCards from '../parts/grade-tools/ResultCards';
import styles from './CGPATracker.module.css';

const CGPA_TRACKER_STATE_KEY = 'crymson_cgpa_tracker_state_v1';

const createCourse = (id) => ({
  id,
  courseName: '',
  creditUnits: '',
  score: '',
});

const getInitialTrackerState = () => {
  try {
    const raw = localStorage.getItem(CGPA_TRACKER_STATE_KEY);
    if (!raw) {
      return {
        courses: [createCourse(1), createCourse(2)],
        nextId: 3,
        cgpa: null,
        classification: null,
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
      courses: parsedCourses.length > 0 ? parsedCourses : [createCourse(1), createCourse(2)],
      nextId: Number.isInteger(parsed.nextId) && parsed.nextId > 0 ? parsed.nextId : 3,
      cgpa: Number.isFinite(parsed.cgpa) ? parsed.cgpa : null,
      classification: typeof parsed.classification === 'string' ? parsed.classification : null,
    };
  } catch (error) {
    return {
      courses: [createCourse(1), createCourse(2)],
      nextId: 3,
      cgpa: null,
      classification: null,
    };
  }
};

const escapeCsvCell = (value) => {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return /[",\n]/.test(raw) ? `"${escaped}"` : escaped;
};

function CGPATracker({ onNavigateHome }) {
  const initialState = useMemo(getInitialTrackerState, []);
  const [courses, setCourses] = useState(initialState.courses);
  const [nextId, setNextId] = useState(initialState.nextId);
  const [cgpa, setCgpa] = useState(initialState.cgpa);
  const [classification, setClassification] = useState(initialState.classification);

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
      CGPA_TRACKER_STATE_KEY,
      JSON.stringify({ courses, nextId, cgpa, classification })
    );
  }, [courses, nextId, cgpa, classification]);

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

  const handleRemoveSelected = (ids) => {
    setCourses((prev) => prev.filter((course) => !ids.includes(course.id)));
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
    setCourses([createCourse(1), createCourse(2)]);
    setNextId(3);
    setCgpa(null);
    setClassification(null);
  };

  const handleExport = () => {
    const computedCgpa = stats.totalUnits > 0 ? stats.totalWeighted / stats.totalUnits : null;

    const rows = [
      ['Course Name', 'Credit Units', 'Score', 'Grade Point', 'Weighted Points'],
      ...courses.map((course) => {
        const gradePoint = getGradePoint(course.score);
        const weighted = calculateWeightedPoints(course.creditUnits, course.score);
        return [
          course.courseName,
          course.creditUnits,
          course.score,
          gradePoint ?? '',
          weighted ?? '',
        ];
      }),
      [],
      ['Total Credit Units', stats.totalUnits.toFixed(2)],
      ['Total Weighted Points', stats.totalWeighted.toFixed(2)],
      ['CGPA', computedCgpa !== null ? computedCgpa.toFixed(2) : ''],
      ['Classification', computedCgpa !== null ? resolveClassification(computedCgpa) || '' : ''],
    ];

    const csv = rows
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'crymson-cgpa.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.cgpaTracker}>
      <div className={styles.container}>
        <button type="button" onClick={onNavigateHome}>← Back To Landing</button>
        <TitleBlock />
        <ActionButtons
          onAddCourse={handleAddCourse}
          onCalculate={handleCalculate}
          onExport={handleExport}
          onReset={handleReset}
        />
        <CourseTable
          courses={courses}
          stats={stats}
          getGradePoint={getGradePoint}
          calculateWeightedPoints={calculateWeightedPoints}
          onUpdateCourse={handleUpdateCourse}
          onRemoveCourse={handleRemoveCourse}
          onRemoveSelected={handleRemoveSelected}
        />
        <ResultCards cgpa={cgpa} classification={classification} />
      </div>

      <footer className={styles.footer}>
        Crymson Student System - Academic performance utilities.
      </footer>
    </div>
  );
}

export default CGPATracker;
