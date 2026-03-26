import React from 'react';
import styles from './CGPAHeader.module.css';

function CGPAHeader() {
  return (
    <header className={styles.header}>
      <h1>Crymson CGPA Tracker</h1>
      <p className={styles.tagline}>Track your academic progress seamlessly within the Crymson ecosystem.</p>
    </header>
  );
}

export default CGPAHeader;
