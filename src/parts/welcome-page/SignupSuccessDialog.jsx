import React from 'react';
import styles from '../../pages/Landing.module.css';

function SignupSuccessDialog({ generatedCrymsonId, onClose }) {
	return (
		<div className={styles.modalOverlay} onMouseDown={onClose}>
			<section
				className={`${styles.modal} ${styles.successModal}`}
				aria-modal="true"
				role="dialog"
				aria-label="Signup successful"
				onMouseDown={(event) => event.stopPropagation()}
			>
				<button
					type="button"
					className={styles.closeButton}
					onClick={onClose}
					aria-label="Close success dialog"
				>
					×
				</button>

				<h2 className={styles.successTitle}>Signup Successful 🎉</h2>
				<p className={styles.successText}>Your Crymson ID has been generated</p>
				<p className={styles.generatedId}>{generatedCrymsonId}</p>
				<p className={styles.successHint}>Save this ID - you'll need it to log in later</p>

				<button type="button" className={styles.submitButton} onClick={onClose}>Close</button>
			</section>
		</div>
	);
}

export default SignupSuccessDialog;
