import React from 'react';
import styles from '../pages/Landing.module.css';

function SignupModal({ formData, errorMessage, onChange, onClose, onSubmit, isSubmitting }) {
  const normalizedError = String(errorMessage || '').toLowerCase();
  const hasPasswordMismatch = normalizedError.includes('password');

  return (
    <div className={styles.modalOverlay} onMouseDown={onClose}>
      <section
        className={styles.modal}
        aria-modal="true"
        role="dialog"
        aria-label="Sign up for Crymson"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close sign up dialog"
        >
          ×
        </button>

        <p className={styles.modalEyebrow}>Create Access</p>
        <h2 className={styles.modalTitle}>Sign Up</h2>
        <p className={styles.modalSubtext}>Set up your Crymson account in a few steps.</p>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.fieldLabel} htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={onChange}
            className={styles.input}
            placeholder="e.g. Michael Doe"
          />

          <label className={styles.fieldLabel} htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={onChange}
            className={styles.input}
            placeholder="e.g. michael@school.edu"
          />

          <label className={styles.fieldLabel} htmlFor="department">Department</label>
          <input
            id="department"
            name="department"
            type="text"
            value={formData.department}
            onChange={onChange}
            className={styles.input}
            placeholder="e.g. Computer Science"
          />

          <label className={styles.fieldLabel} htmlFor="level">Level</label>
          <select
            id="level"
            name="level"
            value={formData.level}
            onChange={onChange}
            className={styles.input}
          >
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
            <option value="400">400</option>
          </select>

          <label className={styles.fieldLabel} htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={onChange}
            className={`${styles.input} ${hasPasswordMismatch ? styles.inputError : ''}`}
            placeholder="••••••••"
            required
            aria-invalid={hasPasswordMismatch}
          />

          <label className={styles.fieldLabel} htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={onChange}
            className={`${styles.input} ${hasPasswordMismatch ? styles.inputError : ''}`}
            placeholder="••••••••"
            required
            aria-invalid={hasPasswordMismatch}
          />

          {hasPasswordMismatch && (
            <p className={styles.fieldError} role="alert">{errorMessage}</p>
          )}

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default SignupModal;
