import React from 'react';
import UserCGPACalculator from '../components/UserCGPACalculator';
import styles from './UserCGPATracker.module.css';

function UserCGPATracker({ onNavigateHome }) {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button type="button" className={styles.backButton} onClick={onNavigateHome}>
          ← Back To User Home
        </button>

        <header className={styles.header}>
          <h1 className={styles.title}>Your CGPA Workspace</h1>
          <p className={styles.subtitle}>Set targets, project outcomes, and plan your final result.</p>
        </header>

        <UserCGPACalculator />
      </div>
    </div>
  );
}

export default UserCGPATracker;
