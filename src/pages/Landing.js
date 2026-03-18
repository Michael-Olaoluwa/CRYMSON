import React, { useEffect, useRef } from 'react';
import styles from './Landing.module.css';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ToolsSection from '../components/ToolsSection';
import IDSection from '../components/IDSection';
import DashboardSection from '../components/DashboardSection';
import AdvantagesSlideshow from '../components/AdvantagesSlideshow';
import Footer from '../components/Footer';

function Landing({ onNavigateToCGPA }) {
  const heroRef = useRef(null);
  const dashboardRef = useRef(null);

  useEffect(() => {
    let animationFrameId;

    const handleScroll = () => {
      const scrollY = window.scrollY;

      if (heroRef.current) {
        const offset = scrollY * 0.25;
        heroRef.current.style.transform = `translateY(${offset}px)`;
      }

      if (dashboardRef.current) {
        const offset = scrollY * 0.15;
        dashboardRef.current.style.transform = `translateY(${offset}px)`;
      }
    };

    const handleScrollThrottled = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', handleScrollThrottled);
    return () => {
      window.removeEventListener('scroll', handleScrollThrottled);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={styles.landing}>
      <Navbar onNavigateToCGPA={onNavigateToCGPA} />
      <main>
        <div ref={heroRef}>
          <Hero />
        </div>
        <div className={styles.line}></div>
        <ToolsSection onNavigateToCGPA={onNavigateToCGPA} />
        <div className={styles.line}></div>
        <IDSection />
        <div className={styles.line}></div>
        <div ref={dashboardRef}>
          <DashboardSection />
        </div>
        <div className={styles.line}></div>
        <AdvantagesSlideshow />
      </main>
      <Footer />
    </div>
  );
}

export default Landing;
