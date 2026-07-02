import React, { useEffect, useState } from 'react';
import styles from './PreviewPanel.module.css';

function PreviewPanel() {
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

		const element = document.getElementById('dashboard');
		if (element) observer.observe(element);

		return () => {
			if (element) observer.unobserve(element);
		};
	}, []);

	return (
		<section
			id="dashboard"
			className={`${styles.section} ${isVisible ? styles.visible : ''}`}
		>
			<div className={styles.center}>
				<div className={styles.label}>Preview</div>
				<h2 className={styles.title}>Operational Clarity at a Glance</h2>
				<p className={styles.subtext}>
					The Crymson dashboard consolidates essential academic insights into a single,
					intuitive interface. Designed with executive-level clarity, it supports informed
					decision-making and streamlined daily management.
				</p>

				<div className={styles.dashboardShell}>
					<div className={styles.dashboardGrid}>
						{['Tasks', 'Grades', 'Study Goals', 'Time Tracking', 'Finance', 'Analytics'].map((title, idx) => (
							<div key={idx} className={styles.widget}>
								<div className={styles.widgetTitle}>{title}</div>
								<div className={styles.widgetBody}></div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

export default PreviewPanel;
