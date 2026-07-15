import React from 'react';
import { calcCumulativeCgpa, resolveClassification, calcGoalProjection } from '../../../utils/academicEngine';
import styles from './AcademicTracker.module.css';

export default function AcademicStatus({ cgpaState }) {
  const { cgpa, totalUnits, semesterCount } = calcCumulativeCgpa(cgpaState);
  const classification = resolveClassification(cgpa);
  const goalCgpa = Number(cgpaState?.goalCgpa);
  const remainingUnits = Number(cgpaState?.remainingUnits);

  const hasGoal = Number.isFinite(goalCgpa) && goalCgpa > 0 && Number.isFinite(remainingUnits) && remainingUnits > 0;
  const projection = hasGoal ? calcGoalProjection({
    completedWeighted: totalUnits * (cgpa || 0),
    completedUnits: totalUnits,
    targetCgpa: goalCgpa,
    remainingUnits,
  }) : null;

  const hasData = Number.isFinite(cgpa) && cgpa > 0;

  const progressPct = hasGoal && hasData
    ? Math.min(100, Math.max(0, (cgpa / goalCgpa) * 100))
    : 0;

  const progressClass = !hasGoal
    ? styles.progressFillMet
    : cgpa >= goalCgpa
      ? styles.progressFillMet
      : progressPct > 60
        ? styles.progressFillProgress
        : styles.progressFillOver;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Academic Status</h3>
      <div className={styles.statusHero}>
        <div className={styles.statusMain}>
          <p className={styles.statusLabel}>Current CGPA</p>
          {hasData ? (
            <>
              <h2 className={styles.statusCgpa}>{cgpa.toFixed(2)}</h2>
              {classification && (
                <p className={styles.statusClassification}>{classification}</p>
              )}
              <p className={styles.sectionHint}>
                {semesterCount} semester{semesterCount !== 1 ? 's' : ''} recorded &middot; {totalUnits} total credit units
              </p>
            </>
          ) : (
            <p className={styles.statusEmpty}>
              Enter your courses to see your CGPA.
            </p>
          )}
        </div>

        {hasGoal && (
          <div className={styles.statusTarget}>
            <p className={styles.targetLabel}>Target CGPA</p>
            <p className={styles.targetValue}>{goalCgpa.toFixed(2)}</p>
            {hasData && (
              <div className={styles.targetProgress}>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${progressClass}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className={styles.progressText}>
                  {progressPct >= 100 ? 'Target met!' : `${progressPct.toFixed(0)}% progress`}
                </p>
              </div>
            )}
            {projection && projection.status === 'achievable' && (
              <p className={styles.sectionHint}>
                Need {projection.requiredGpa.toFixed(2)} GPA in remaining {remainingUnits} units
              </p>
            )}
            {projection && projection.status === 'unachievable' && (
              <p className={styles.sectionHint} style={{ color: 'var(--clr-accent-red, #ef4444)' }}>
                Target exceeds best possible CGPA
              </p>
            )}
            {projection && projection.status === 'already-met' && (
              <p className={styles.sectionHint}>
                Target already achieved!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
