import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ToolsSection from '../components/ToolsSection';
import IDSection from '../components/IDSection';
import DashboardSection from '../components/DashboardSection';
import AdvantagesSlideshow from '../components/AdvantagesSlideshow';
import Footer from '../components/Footer';
import SignupModal from '../components/SignupModal';
import SuccessModal from '../components/SuccessModal';
import styles from './Landing.module.css';

const INITIAL_FORM_DATA = {
  fullName: '',
  email: '',
  department: '',
  level: '100',
  password: '',
  confirmPassword: ''
};

function Landing({ onNavigateToCGPA }) {
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [generatedCrymsonId, setGeneratedCrymsonId] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [credentials, setCredentials] = useState({ crymsonId: '', password: '' });

  useEffect(() => {
    const isModalOpen = isSignInOpen || isSignupOpen || isSuccessOpen;

    if (!isModalOpen) {
      document.body.style.overflow = '';
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isSuccessOpen) {
          setIsSuccessOpen(false);
        } else if (isSignupOpen) {
          setIsSignupOpen(false);
        } else {
          setIsSignInOpen(false);
        }
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isSignInOpen, isSignupOpen, isSuccessOpen]);

  const handleSignInClick = () => {
    setIsSignupOpen(false);
    setIsSuccessOpen(false);
    setIsSignInOpen(true);
  };

  const handleSignUpClick = () => {
    setIsSignInOpen(false);
    setIsSignupOpen(true);
  };

  const handleSignInInputChange = (event) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignInSubmit = (event) => {
    event.preventDefault();
    setIsSignInOpen(false);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const generateCrymsonId = () => {
    const yearSuffix = String(new Date().getFullYear()).slice(-2);
    const randomFourDigits = Math.floor(Math.random() * 9000) + 1000;
    return `${yearSuffix}${randomFourDigits}S`;
  };

  const handleSignupSubmit = (event) => {
    event.preventDefault();

    const newId = generateCrymsonId();
    setGeneratedCrymsonId(newId);
    setIsSignupOpen(false);
    setIsSuccessOpen(true);
    setFormData(INITIAL_FORM_DATA);
  };

  const closeSignupModal = () => {
    setIsSignupOpen(false);
  };

  const closeSignInModal = () => {
    setIsSignInOpen(false);
  };

  const closeSuccessModal = () => {
    setIsSuccessOpen(false);
  };

  return (
    <div className={styles.landing}>
      <Navbar onSignInClick={handleSignInClick} onSignUpClick={handleSignUpClick} />

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
        <div className={styles.modalOverlay} onMouseDown={closeSignInModal}>
          <section
            className={styles.modal}
            aria-modal="true"
            role="dialog"
            aria-label="Sign in to Crymson"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeSignInModal}
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
                onChange={handleSignInInputChange}
                className={styles.input}
                placeholder="e.g. 260483S"
                autoComplete="username"
                required
              />

              <label className={styles.fieldLabel} htmlFor="signinPassword">Password</label>
              <input
                id="signinPassword"
                name="password"
                type="password"
                value={credentials.password}
                onChange={handleSignInInputChange}
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

      {isSignupOpen && (
        <SignupModal
          formData={formData}
          onChange={handleFormChange}
          onClose={closeSignupModal}
          onSubmit={handleSignupSubmit}
        />
      )}

      {isSuccessOpen && (
        <SuccessModal generatedCrymsonId={generatedCrymsonId} onClose={closeSuccessModal} />
      )}
    </div>
  );
}

export default Landing;
