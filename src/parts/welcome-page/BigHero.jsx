import React, { useEffect, useState } from 'react';
import styles from './BigHero.module.css';

function BigHero() {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		setIsVisible(true);
	}, []);

	return (
		<section id="hero" className={`${styles.hero} ${isVisible ? styles.visible : ''}`}>
			<h1 className={styles.heroTitle}>Crymson</h1>
			<p className={styles.heroTagline}>Student Productivity Ecosystem</p>
			<p className={styles.heroSubtext}>
				Crymson helps students organize coursework, track academic progress, and stay productive
				through one cohesive digital environment designed for both learners and institutions.
			</p>
		</section>
	);
}

export default BigHero;
