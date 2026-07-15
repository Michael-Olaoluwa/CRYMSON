import React, { useState, useMemo } from 'react';
import { simulateCgpa, getGradePoint, resolveClassification } from '../../../utils/academicEngine';
import styles from './AcademicTracker.module.css';

const GRADE_OPTIONS = [5, 4, 3, 2, 1, 0];
const GRADE_LABELS = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E', 0: 'F' };

export default function WhatIfSimulator({ cgpaState }) {
  const [hypotheticalGrades, setHypotheticalGrades] = useState({});
  const [activeCourse, setActiveCourse] = useState(null);

  const courses = cgpaState?.courses || [];

  const setGrade = (courseId, gp) => {
    setHypotheticalGrades((prev) => ({
      ...prev,
      [courseId]: gp,
    }));
  };

  const result = useMemo(() => {
    if (Object.keys(hypotheticalGrades).length === 0) return null;
    return simulateCgpa(cgpaState, hypotheticalGrades);
  }, [cgpaState, hypotheticalGrades]);

  const reset = () => {
    setHypotheticalGrades({});
    setActiveCourse(null);
  };

  if (courses.length === 0) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>What-If Simulator</h3>
      <p className={styles.sectionHint}>
        Pick hypothetical grades and see how your CGPA changes.
      </p>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Course</th>
              <th>Hypothetical Grade</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td className={styles.impactCourseName}>
                  {course.courseName || 'Unnamed course'}
                </td>
                <td>
                  <div className={styles.simGradeSelect}>
                    {GRADE_OPTIONS.map((gp) => (
                      <button
                        key={gp}
                        className={`${styles.simGradeBtn} ${
                          hypotheticalGrades[course.id] === gp ? styles.simGradeBtnActive : ''
                        }`}
                        onClick={() => setGrade(course.id, gp)}
                      >
                        {GRADE_LABELS[gp]}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && (
        <div className={styles.simResults}>
          <div className={styles.simResultRow}>
            <span className={styles.simResultLabel}>Simulated Semester GPA</span>
            <span className={`${styles.simResultValue} ${
              result.semesterChange > 0 ? styles.simResultPositive : result.semesterChange < 0 ? styles.simResultNegative : ''
            }`}>
              {result.semesterGpa?.toFixed(2) || '—'}
              {result.semesterChange !== null && result.semesterChange !== 0 && (
                <> ({result.semesterChange > 0 ? '+' : ''}{result.semesterChange.toFixed(2)})</>
              )}
            </span>
          </div>
          <div className={styles.simResultRow}>
            <span className={styles.simResultLabel}>Simulated CGPA</span>
            <span className={`${styles.simResultValue} ${
              result.cgpaChange > 0 ? styles.simResultPositive : result.cgpaChange < 0 ? styles.simResultNegative : ''
            }`}>
              {result.cgpa?.toFixed(2) || '—'}
              {result.cgpaChange !== null && result.cgpaChange !== 0 && (
                <> ({result.cgpaChange > 0 ? '+' : ''}{result.cgpaChange.toFixed(2)})</>
              )}
            </span>
          </div>
          {result.targetStatus && (
            <div className={styles.simResultRow}>
              <span className={styles.simResultLabel}>Target Status</span>
              <span className={`${styles.simResultValue} ${
                result.targetStatus === 'met' ? styles.simResultPositive : styles.simResultNegative
              }`}>
                {result.targetStatus === 'met' ? 'Target Met!' : 'Target Not Met'}
              </span>
            </div>
          )}
        </div>
      )}

      {Object.keys(hypotheticalGrades).length > 0 && (
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={reset}
          style={{ marginTop: '0.75rem' }}
        >
          Reset Simulation
        </button>
      )}
    </div>
  );
}
