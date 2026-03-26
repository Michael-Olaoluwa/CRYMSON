import React from 'react';
import styles from './UserHome.module.css';

function UserHome({ userId, onNavigateToCGPA, onNavigateToTodo, onLogout }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Welcome Back</p>
          <h1 className={styles.title}>Crymson User Home</h1>
          <p className={styles.subtitle}>
            Signed in as <span className={styles.userId}>{userId || 'Student'}</span>
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
          <button type="button" className={styles.primaryButton} onClick={onNavigateToCGPA}>
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
    </div>
  );
}

export default UserHome;
