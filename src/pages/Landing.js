import React, { useEffect, useState } from 'react';
import styles from './Landing.module.css';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ToolsSection from '../components/ToolsSection';
import IDSection from '../components/IDSection';
import DashboardSection from '../components/DashboardSection';
import AdvantagesSlideshow from '../components/AdvantagesSlideshow';
import Footer from '../components/Footer';

function Landing({ onNavigateToCGPA }) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.landing}>
      <Navbar onNavigateToCGPA={onNavigateToCGPA} />
      <main>
        <Hero scrollY={scrollY} />
        <div className={styles.line}></div>
        <ToolsSection onNavigateToCGPA={onNavigateToCGPA} />
        <div className={styles.line}></div>
        <IDSection />
        <div className={styles.line}></div>
        <DashboardSection scrollY={scrollY} />
        <div className={styles.line}></div>
        <AdvantagesSlideshow />
      </main>
      <Footer />
    </div>
  );
}

export default Landing;
