import React from 'react';
import styles from './BottomBar.module.css';

function BottomBar() {
	return (
		<footer className={styles.footer}>
			<span>© {new Date().getFullYear()} Crymson</span>
		</footer>
	);
}

export default BottomBar;
