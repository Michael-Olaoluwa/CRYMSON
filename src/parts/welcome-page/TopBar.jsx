import React from 'react';
import styles from './TopBar.module.css';

function TopBar({ onSignInClick, onSignUpClick }) {
	return (
		<header className={styles.navbar}>
			<div className={styles.navLogo}>Crymson</div>
			<nav className={styles.navLinks}>
				<a href="#hero">Home</a>
				<a href="#tools">Tools</a>
				<a href="#id">ID</a>
				<a href="#dashboard">Dashboard</a>
				<a href="#advantages">Advantages</a>
			</nav>
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
