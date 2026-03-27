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

const AUTH_API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:5000`;

const INITIAL_FORM_DATA = {
  fullName: '',
  email: '',
  department: '',
  level: '100',
  password: '',
  confirmPassword: ''
};

function Landing({ onNavigateToCGPA, onNavigateToTodo, onLoginSuccess }) {
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [generatedCrymsonId, setGeneratedCrymsonId] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
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
    setSignInError('');
    setIsSignInOpen(true);
  };

  const handleSignUpClick = () => {
    setIsSignInOpen(false);
    setSignInError('');
    setSignupError('');
    setIsSignupOpen(true);
  };

  const handleSignInInputChange = (event) => {
    const { name, value } = event.target;
    if (signInError) {
      setSignInError('');
    }
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignInSubmit = async (event) => {
    event.preventDefault();

    const submittedUserId = credentials.crymsonId.trim();
    const submittedPassword = credentials.password;

    if (!submittedUserId || !submittedPassword) {
      setSignInError('Crymson ID and password are required.');
      return;
    }

    setIsSigningIn(true);
    setSignInError('');

    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          crymsonId: submittedUserId,
          password: submittedPassword
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || 'Sign in failed. Please try again.');
      }

      const accountId = payload?.user?.crymsonId || submittedUserId;
      const token = payload?.token;

      setIsSignInOpen(false);
      setCredentials({ crymsonId: '', password: '' });
      onLoginSuccess(accountId, token);
    } catch (error) {
      setSignInError(error.message || 'Unable to sign in right now.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (signupError && (name === 'password' || name === 'confirmPassword')) {
        setSignupError('');
      }
      return next;
    });
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();

    const password = formData.password.trim();
    const confirmPassword = formData.confirmPassword.trim();
    if (password !== confirmPassword) {
      setSignupError('Passwords do not match. Please make sure both fields are the same.');
      return;
    }

    setSignupError('');
    setIsSigningUp(true);

    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          department: formData.department,
          level: formData.level,
          password: formData.password
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to create account.');
      }

      const newId = payload?.user?.crymsonId;
      setGeneratedCrymsonId(newId || 'Unavailable');
      setIsSignupOpen(false);
      setIsSuccessOpen(true);
      setFormData(INITIAL_FORM_DATA);
    } catch (error) {
      const isNetworkError = error instanceof TypeError;
      setSignupError(
        isNetworkError
          ? 'Cannot reach the server. Please make sure the backend is running on port 5000.'
          : (error.message || 'Unable to create account right now.')
      );
    } finally {
      setIsSigningUp(false);
    }
  };

  const closeSignupModal = () => {
    setSignupError('');
    setIsSignupOpen(false);
  };

  const closeSignInModal = () => {
    setSignInError('');
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
        <ToolsSection onNavigateToCGPA={onNavigateToCGPA} onNavigateToTodo={onNavigateToTodo} />
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

              {signInError && (
                <p className={styles.fieldError} role="alert">{signInError}</p>
              )}

              <button type="submit" className={styles.submitButton} disabled={isSigningIn}>
                {isSigningIn ? 'Signing In...' : 'Continue'}
              </button>
            </form>
          </section>
        </div>
      )}

      {isSignupOpen && (
        <SignupModal
          formData={formData}
          errorMessage={signupError}
          onChange={handleFormChange}
          onClose={closeSignupModal}
          onSubmit={handleSignupSubmit}
          isSubmitting={isSigningUp}
        />
      )}

      {isSuccessOpen && (
        <SuccessModal generatedCrymsonId={generatedCrymsonId} onClose={closeSuccessModal} />
      )}
    </div>
  );
}

export default Landing;
