import React from 'react';
import styles from './Maintenance.module.css';

export default function Maintenance() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>This site is under renovations</h1>
        <p>We're performing scheduled maintenance. Please check back soon.</p>
      </div>
    </div>
  );
}
