import React, { useEffect, useState } from 'react';
import styles from './Hero.module.css';

function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section id="hero" className={`${styles.hero} ${isVisible ? styles.visible : ''}`}>
      <h1 className={styles.heroTitle}>Crymson</h1>
      <p className={styles.heroTagline}>A unified productivity ecosystem for modern academic environments.</p>
      <p className={styles.heroSubtext}>
        Crymson delivers a structured, reliable, and efficient suite of tools designed to support
        institutional performance and student success. The platform emphasizes clarity, operational
        consistency, and a premium user experience aligned with contemporary corporate standards.
      </p>
    </section>
  );
}

export default Hero;
