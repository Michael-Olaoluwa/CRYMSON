import React, { useMemo } from 'react';
import { calcRequiredSemesterGpa, calcSemesterGpa, calcCumulativeCgpa, MAX_GRADE_POINT } from '../../../utils/academicEngine';
import styles from './AcademicTracker.module.css';

export default function RescueMode({ cgpaState }) {
  const goalCgpa = Number(cgpaState?.goalCgpa);
  const hasGoal = Number.isFinite(goalCgpa) && goalCgpa > 0;

  const result = useMemo(() => {
    if (!hasGoal) return null;

    const current = calcCumulativeCgpa(cgpaState);
    const totalUnits = current.totalUnits || 0;
    const currentCgpa = current.cgpa || 0;

    return calcRequiredSemesterGpa({
      currentCgpa,
      completedUnits: totalUnits,
      targetCgpa: goalCgpa,
      currentSemesterUnits: 18,
    });
  }, [cgpaState, hasGoal, goalCgpa]);

  if (!result || result.requiredSemesterGpa === null) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Academic Rescue Mode</h3>
      <p className={styles.sectionHint}>
        What GPA do you need this semester to reach your target?
      </p>

      <div className={`${styles.rescueResult} ${result.achievable ? styles.rescueAchievable : styles.rescueImpossible}`}>
        {result.achievable ? (
          <p className={styles.rescueValue}>
            You need a <strong>{result.requiredSemesterGpa.toFixed(2)}</strong> GPA this semester.
          </p>
        ) : (
          <p className={styles.rescueValue}>
            Target requires <strong>{result.requiredSemesterGpa.toFixed(2)}</strong> GPA.
          </p>
        )}
        <p className={styles.rescueReason}>{result.reason}</p>
      </div>
    </div>
  );
}
