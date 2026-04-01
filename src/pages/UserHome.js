import React, { useMemo } from 'react';
import styles from './UserHome.module.css';

const USER_CGPA_STATE_KEY = 'crymson_user_cgpa_state_v1';

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

const getCgpaSummary = () => {
  try {
    const raw = localStorage.getItem(USER_CGPA_STATE_KEY);
    if (!raw) {
      return { currentCgpa: null, goalCgpa: null, progress: null };
    }

    const parsed = JSON.parse(raw);
    const courses = Array.isArray(parsed.courses) ? parsed.courses : [];
    const goalCgpa = Number(parsed.goalCgpa);

    let totalUnits = 0;
    let totalWeighted = 0;

    courses.forEach((course) => {
      const units = Number(course?.creditUnits);
      const gradePoint = getGradePoint(course?.score);

      if (Number.isFinite(units) && units > 0 && Number.isFinite(gradePoint)) {
        totalUnits += units;
        totalWeighted += units * gradePoint;
      }
    });

    const currentCgpa = totalUnits > 0 ? totalWeighted / totalUnits : null;
    const normalizedGoal = Number.isFinite(goalCgpa) && goalCgpa > 0
      ? Math.min(5, Math.max(0, goalCgpa))
      : null;

    const progress = currentCgpa !== null && normalizedGoal !== null
      ? Math.min(100, Math.max(0, (currentCgpa / normalizedGoal) * 100))
      : null;

    return { currentCgpa, goalCgpa: normalizedGoal, progress };
  } catch (error) {
    return { currentCgpa: null, goalCgpa: null, progress: null };
  }
};

function UserHome({ userId, userName, onNavigateToUserCGPA, onNavigateToTodo, onLogout }) {
  const displayName = userName || userId || 'Student';
  const cgpaSummary = useMemo(getCgpaSummary, []);
  const goalPercent = cgpaSummary.goalCgpa !== null
    ? Math.min(100, Math.max(0, (cgpaSummary.goalCgpa / 5) * 100))
    : 0;
  const currentPercent = cgpaSummary.currentCgpa !== null
    ? Math.min(100, Math.max(0, (cgpaSummary.currentCgpa / 5) * 100))
    : 0;

  const ringOuterRadius = 56;
  const ringInnerRadius = 42;
  const ringOuterCircumference = 2 * Math.PI * ringOuterRadius;
  const ringInnerCircumference = 2 * Math.PI * ringInnerRadius;
  const goalDashoffset = ringOuterCircumference * (1 - goalPercent / 100);
  const currentDashoffset = ringInnerCircumference * (1 - currentPercent / 100);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Welcome Back</p>
          <h1 className={styles.title}>Hello {displayName}</h1>
          <p className={styles.subtitle}>
            Welcome to your crymson dashboard, hope you're having a great day
          </p>
        </div>

        <button type="button" className={styles.logoutButton} onClick={onLogout}>
          Log Out
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Quick Actions</h2>
          <p className={styles.cardText}>
            Jump directly into your academic tools and continue tracking your performance.
          </p>
          <button type="button" className={styles.primaryButton} onClick={onNavigateToUserCGPA}>
            Open CGPA Tracker
          </button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>What&apos;s Next?</h2>
          <p className={styles.cardText}>
            More dashboard widgets can be connected here, such as profile details,
            semester summaries, and personalized recommendations.
          </p>
          <button type="button" className={styles.secondaryButton} onClick={onNavigateToTodo}>
            Open To-Do Planner
          </button>
        </section>
      </main>

      <section className={styles.dashboardSection}>
        <article className={styles.progressCard}>
          <h2 className={styles.progressTitle}>CGPA Goal Progress</h2>
          <p className={styles.progressMeta}>
            Current CGPA: <strong>{cgpaSummary.currentCgpa !== null ? cgpaSummary.currentCgpa.toFixed(2) : '—'}</strong>
            {'  '}|{'  '}
            Goal: <strong>{cgpaSummary.goalCgpa !== null ? cgpaSummary.goalCgpa.toFixed(2) : '—'}</strong>
          </p>

          <div className={styles.ringLayout}>
            <div className={styles.ringWrapper} role="img" aria-label="Circular CGPA progress for current and goal values">
              <svg viewBox="0 0 140 140" className={styles.ringChart}>
                <circle cx="70" cy="70" r={ringOuterRadius} className={styles.goalTrack} />
                <circle
                  cx="70"
                  cy="70"
                  r={ringOuterRadius}
                  className={styles.goalRing}
                  strokeDasharray={ringOuterCircumference}
                  strokeDashoffset={goalDashoffset}
                  transform="rotate(-90 70 70)"
                />
                <circle cx="70" cy="70" r={ringInnerRadius} className={styles.currentTrack} />
                <circle
                  cx="70"
                  cy="70"
                  r={ringInnerRadius}
                  className={styles.currentRing}
                  strokeDasharray={ringInnerCircumference}
                  strokeDashoffset={currentDashoffset}
                  transform="rotate(-90 70 70)"
                />
              </svg>
              <div className={styles.ringCenter}>
                <span className={styles.centerLabel}>Goal Reach</span>
                <span className={styles.centerValue}>
                  {cgpaSummary.progress !== null ? `${cgpaSummary.progress.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>

            <div className={styles.ringLegend}>
              <p className={styles.legendItem}>
                <span className={`${styles.legendSwatch} ${styles.legendCurrent}`} />
                Current CGPA ring ({currentPercent.toFixed(1)}% of 5.00 scale)
              </p>
              <p className={styles.legendItem}>
                <span className={`${styles.legendSwatch} ${styles.legendGoal}`} />
                Goal CGPA ring ({goalPercent.toFixed(1)}% of 5.00 scale)
              </p>
            </div>
          </div>

          <p className={styles.progressCaption}>
            {cgpaSummary.progress !== null
              ? `${cgpaSummary.progress.toFixed(1)}% of your CGPA goal reached.`
              : 'Set your CGPA goal in the CGPA workspace to track progress here.'}
          </p>
        </article>
      </section>
    </div>
  );
}

export default UserHome;
