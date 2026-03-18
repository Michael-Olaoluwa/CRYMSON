import React, { useEffect } from 'react';
import styles from './Footer.module.css';

function Footer() {
  useEffect(() => {
    document.getElementById('year').textContent = new Date().getFullYear();
  }, []);

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div>
          <div className={styles.footerLogo}>Crymson</div>
          <p className={styles.footerMuted}>
            A minimalist, corporate‑grade ecosystem of tools designed to enhance student productivity
            and institutional performance.
          </p>
        </div>
        <div>
          <div className={styles.footerHeading}>Company</div>
          <div className={styles.footerLinks}>
            <a href="#hero">Overview</a>
            <a href="#tools">Solutions</a>
            <a href="#dashboard">Platform</a>
            <a href="#advantages">Advantages</a>
          </div>
        </div>
        <div>
          <div className={styles.footerHeading}>Legal</div>
          <div className={styles.footerLinks}>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Compliance</a>
          </div>
        </div>
      </div>
      <div className={styles.footerBottom}>
        © <span id="year"></span> Crymson. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
