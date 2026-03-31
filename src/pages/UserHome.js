import React, { useEffect, useRef, useState } from 'react';
import styles from './UserHome.module.css';
import UserCGPACalculator from '../components/UserCGPACalculator';

function UserHome({ userId, userName, onNavigateToTodo, onLogout }) {
  const displayName = userName || userId || 'Student';
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const calculatorSectionRef = useRef(null);

  useEffect(() => {
    if (!isCalculatorVisible || !calculatorSectionRef.current) {
      return;
    }

    calculatorSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isCalculatorVisible]);

  const handleOpenUserCalculator = () => {
    if (!isCalculatorVisible) {
      setIsCalculatorVisible(true);
      return;
    }

    if (!calculatorSectionRef.current) {
      return;
    }

    calculatorSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCloseUserCalculator = () => {
    setIsCalculatorVisible(false);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Welcome Back</p>
          <h1 className={styles.title}>Crymson User Home</h1>
          <p className={styles.subtitle}>
            Signed in as <span className={styles.userId}>{displayName}</span>
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
          <button type="button" className={styles.primaryButton} onClick={handleOpenUserCalculator}>
            {isCalculatorVisible ? 'View CGPA Calculator' : 'Open CGPA Calculator'}
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

      {isCalculatorVisible && (
        <section ref={calculatorSectionRef} className={styles.calculatorSection}>
          <div className={styles.calculatorActions}>
            <button type="button" className={styles.secondaryButton} onClick={handleCloseUserCalculator}>
              Close Calculator
            </button>
          </div>
          <UserCGPACalculator />
        </section>
      )}
    </div>
  );
}

export default UserHome;
