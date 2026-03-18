import React, { useEffect, useState } from 'react';
import styles from './ToolsSection.module.css';

function ToolsSection({ onNavigateToCGPA }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    const element = document.getElementById('tools');
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  return (
    <section id="tools" className={`${styles.section} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.center}>
        <div className={styles.label}>Solutions</div>
        <h2 className={styles.title}>Purpose‑Built Tools for Academic Efficiency</h2>
        <p className={styles.subtext}>
          Each Crymson solution is engineered to streamline essential academic workflows.
          From performance tracking to financial organization, our tools are designed to
          enhance productivity while maintaining a clean, distraction‑free interface.
        </p>

        <div className={styles.toolsGrid}>
          <div className={styles.toolCard}>
            <div className={styles.toolName}>CGPA Calculator</div>
            <button onClick={onNavigateToCGPA} className={styles.toolBadge}>
              Launch App
            </button>
          </div>

          <div className={styles.toolCard}>
            <div className={styles.toolName}>Smart To‑Do</div>
            <span className={styles.toolBadge}>Coming Soon</span>
          </div>

          <div className={styles.toolCard}>
            <div className={styles.toolName}>Time Tracker</div>
            <span className={styles.toolBadge}>Coming Soon</span>
          </div>

          <div className={styles.toolCard}>
            <div className={styles.toolName}>Finance Tracker</div>
            <span className={styles.toolBadge}>Coming Soon</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ToolsSection;
