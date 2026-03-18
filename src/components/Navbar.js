import React from 'react';
import styles from './Navbar.module.css';

function Navbar({ onNavigateToCGPA }) {
  return (
    <header className={styles.navbar}>
      <div className={styles.navLogo}>Crymson</div>
      <nav className={styles.navLinks}>
        <a href="#hero">Home</a>
        <a href="#tools">Tools</a>
        <a href="#id">ID</a>
        <a href="#dashboard">Dashboard</a>
        <a href="#advantages">Advantages</a>
      </nav>
      <button className={styles.navCta}>Sign In</button>
    </header>
  );
}

export default Navbar;
