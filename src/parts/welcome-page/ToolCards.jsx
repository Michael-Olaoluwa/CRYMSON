import React, { useEffect, useState } from 'react';
import styles from './ToolCards.module.css';

const tools = [
	{ name: 'CGPA Tracker', label: 'Live', href: '#', accent: 'olive' },
	{ name: 'To-Do Planner', label: 'Live', href: '#', accent: 'olive' },
	{ name: 'Time Tracker', label: 'Soon', href: '#', accent: 'olive' },
	{ name: 'Focus Analytics', label: 'Soon', href: '#', accent: 'olive' },
];

function ToolCards({ onNavigateToCGPA, onNavigateToTodo }) {
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

		const element = document.getElementById('tools');
		if (element) observer.observe(element);

		return () => {
			if (element) observer.unobserve(element);
		};
	}, []);

	const handleToolClick = (event, toolName) => {
		if (toolName === 'CGPA Tracker' && onNavigateToCGPA) {
			event.preventDefault();
			onNavigateToCGPA();
			return;
		}

		if (toolName === 'To-Do Planner' && onNavigateToTodo) {
			event.preventDefault();
			onNavigateToTodo();
		}
	};

	return (
		<section id="tools" className={`${styles.section} ${isVisible ? styles.visible : ''}`}>
			<div className={styles.center}>
				<div className={styles.label}>Ecosystem</div>
				<h2 className={styles.title}>Built-In Student Productivity Tools</h2>
				<p className={styles.subtext}>
					Crymson combines key productivity utilities into one cohesive environment so students can
					plan, track, and improve performance without switching contexts.
				</p>

				<div className={styles.toolsGrid}>
					{tools.map((tool) => (
						<article key={tool.name} className={styles.toolCard}>
							<h3 className={styles.toolName}>{tool.name}</h3>
							<a
								href={tool.href}
								className={styles.toolBadge}
								onClick={(event) => handleToolClick(event, tool.name)}
							>
								{tool.label}
							</a>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

export default ToolCards;
