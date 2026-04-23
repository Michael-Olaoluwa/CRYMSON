import React from 'react';
import MyTrackerWidget from '../parts/grade-tools/MyTrackerWidget';
import styles from './UserCGPATracker.module.css';

function UserCGPATracker({ activeUserId = 'guest', onNavigateHome }) {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Academic Intelligence</p>
            <h1 className={styles.title}>CGPA Workspace</h1>
            <p className={styles.subtitle}>
              Tune your semester strategy, monitor trajectory, and project your final class with confidence.
            </p>
          </div>

          <button type="button" className={styles.backButton} onClick={onNavigateHome}>
            Back To User Home
          </button>
        </header>

        <section className={styles.kpiRow}>
          <article className={styles.kpiCard}>
            <span>Trajectory</span>
            <strong>Live</strong>
          </article>
          <article className={styles.kpiCard}>
            <span>Predictions</span>
            <strong>Adaptive</strong>
          </article>
          <article className={styles.kpiCard}>
            <span>Class Goal</span>
            <strong>Visible</strong>
          </article>
        </section>

        <div className={styles.workspacePane}>
          <MyTrackerWidget activeUserId={activeUserId} />
        </div>
      </div>
    </div>
  );
}

export default UserCGPATracker;
