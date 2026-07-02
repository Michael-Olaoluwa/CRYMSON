import React from 'react';
import styles from './TopBar.module.css';

function TopBar({ onSignInClick, onSignUpClick }) {
	return (
		<header className={styles.navbar}>
			<span className={styles.logo}>Crymson</span>
			<div className={styles.authActions}>
				<button type="button" className={styles.signInBtn} onClick={onSignInClick}>
					Sign In
				</button>
				<button type="button" className={styles.signUpBtn} onClick={onSignUpClick}>
					Sign Up
				</button>
			</div>
		</header>
	);
}

export default TopBar;
