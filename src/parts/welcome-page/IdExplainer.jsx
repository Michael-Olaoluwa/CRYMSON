import React, { useEffect, useState } from 'react';
import styles from './IdExplainer.module.css';

function IdExplainer() {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
				}
			},
			{ threshold: 0.2 }
		);

		const element = document.getElementById('id');
		if (element) observer.observe(element);

		return () => {
			if (element) observer.unobserve(element);
		};
	}, []);

	return (
		<section id="id" className={`${styles.section} ${isVisible ? styles.visible : ''}`}>
			<div className={styles.center}>
				<div className={styles.label}>Identity</div>
				<h2 className={styles.title}>Crymson ID</h2>
				<p className={styles.subtext}>
					The <span className={styles.idHighlight}>Crymson ID</span> provides secure, centralized access to the entire
					Crymson ecosystem. It ensures seamless synchronization across devices, enabling students
					and institutions to maintain continuity, data integrity, and operational efficiency.
				</p>
			</div>
		</section>
	);
}

export default IdExplainer;
