import React from 'react';
import styles from './CGPAResults.module.css';

function CGPAResults({ cgpa, classification }) {
  return (
    <div className={styles.results}>
      <div className={`${styles.resultCard} ${cgpa === null ? styles.waiting : ''}`}>
        <label>Your CGPA</label>
        <div className={styles.value}>{cgpa !== null ? cgpa.toFixed(2) : '—'}</div>
      </div>
      <div className={`${styles.resultCard} ${styles.classification} ${classification === null ? styles.waiting : ''}`}>
        <label>Degree Classification</label>
        <div className={styles.value}>{classification || '—'}</div>
      </div>
    </div>
  );
}

export default CGPAResults;
