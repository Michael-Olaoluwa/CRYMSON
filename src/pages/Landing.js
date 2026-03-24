import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ToolsSection from '../components/ToolsSection';
import IDSection from '../components/IDSection';
import DashboardSection from '../components/DashboardSection';
import AdvantagesSlideshow from '../components/AdvantagesSlideshow';
import Footer from '../components/Footer';
import styles from './Landing.module.css';

function Landing({ onNavigateToCGPA }) {
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [credentials, setCredentials] = useState({ crymsonId: '', password: '' });

  useEffect(() => {
    if (!isSignInOpen) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSignInOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isSignInOpen]);

  const handleSignUpClick = () => {
    const idSection = document.getElementById('id');
    if (idSection) {
      idSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignInSubmit = (event) => {
    event.preventDefault();
    setIsSignInOpen(false);
  };

  const closeModalIfBackdrop = (event) => {
    if (event.target === event.currentTarget) {
      setIsSignInOpen(false);
    }
  };

  return (
    <div className={styles.landing}>
      <Navbar onSignInClick={() => setIsSignInOpen(true)} onSignUpClick={handleSignUpClick} />

      <main>
        <Hero />
        <div className={styles.line} />
        <ToolsSection onNavigateToCGPA={onNavigateToCGPA} />
        <IDSection />
        <DashboardSection />
        <AdvantagesSlideshow />
      </main>

      <Footer />

      {isSignInOpen && (
        <div className={styles.modalOverlay} onMouseDown={closeModalIfBackdrop}>
          <section className={styles.modal} aria-modal="true" role="dialog" aria-label="Sign in to Crymson">
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsSignInOpen(false)}
              aria-label="Close sign in dialog"
            >
              ×
            </button>

            <p className={styles.modalEyebrow}>Access</p>
            <h2 className={styles.modalTitle}>Sign In</h2>
            <p className={styles.modalSubtext}>Use your Crymson ID to continue.</p>

            <form className={styles.form} onSubmit={handleSignInSubmit}>
              <label className={styles.fieldLabel} htmlFor="crymsonId">Crymson ID</label>
              <input
                id="crymsonId"
                name="crymsonId"
                type="text"
                value={credentials.crymsonId}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="e.g. CRY-10284"
                autoComplete="username"
                required
              />

              <label className={styles.fieldLabel} htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={credentials.password}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />

              <button type="submit" className={styles.submitButton}>Continue</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Landing;
