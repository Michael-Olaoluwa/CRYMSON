import React, { useEffect, useState } from 'react';
import styles from './AdvantagesSlideshow.module.css';

function AdvantagesSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const slides = [
    { title: 'Improved Academic Organization', text: 'Centralize tasks, grades, and study goals in a single environment, reducing fragmentation and helping students maintain a clear overview of their academic responsibilities.' },
    { title: 'Unified Productivity Ecosystem', text: 'Integrate multiple tools under one cohesive brand experience, ensuring consistency, familiarity, and reduced onboarding friction across the platform.' },
    { title: 'Cross‑Device Continuity', text: 'Access Crymson tools seamlessly across devices, allowing students to transition between study environments without losing context or progress.' },
    { title: 'Minimalist Interface', text: 'A clean, distraction‑free interface reduces cognitive load, enabling students to focus on the work that matters rather than navigating complex systems.' },
    { title: 'Secure Identity Management', text: 'Crymson ID provides a secure, centralized identity layer, supporting compliance and protecting sensitive academic and personal data.' },
    { title: 'Data‑Driven Insights', text: 'Analytics‑ready structures enable institutions to derive meaningful insights from student engagement and performance trends over time.' },
    { title: 'Student‑Friendly Experience', text: 'Intuitive flows, clear language, and a visually calm environment make Crymson approachable for students at every level.' },
    { title: 'Executive‑Level Oversight', text: 'Consolidated dashboards and structured reporting support leadership teams in monitoring academic performance and operational health.' },
    { title: 'Scalable Ecosystem', text: 'The modular toolset allows institutions to adopt Crymson progressively, aligning deployment with strategic priorities and timelines.' },
    { title: 'Consistent Brand Experience', text: 'A cohesive visual and interaction language reinforces trust, professionalism, and long‑term engagement with the platform.' }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    const element = document.getElementById('advantages');
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <section id="advantages" className={`${styles.section} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.center}>
        <div className={styles.label}>Advantages</div>
        <h2 className={styles.title}>Designed for Students, Built for Institutions</h2>
        <p className={styles.subtext}>
          Crymson aligns student‑centric usability with institutional requirements, delivering a
          platform that is both approachable and executive‑ready.
        </p>

        <div className={styles.slideshow}>
          <div className={styles.slideshowTrack} style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
            {slides.map((slide, idx) => (
              <div key={idx} className={styles.slide}>
                <h3 className={styles.slideTitle}>{slide.title}</h3>
                <p className={styles.slideText}>{slide.text}</p>
              </div>
            ))}
          </div>

          <div className={styles.slideshowDots}>
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`${styles.dot} ${idx === currentIndex ? styles.active : ''}`}
                onClick={() => goToSlide(idx)}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdvantagesSlideshow;
