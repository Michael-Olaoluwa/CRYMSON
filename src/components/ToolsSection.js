import React, { useEffect, useState } from 'react';
import styles from './ToolsSection.module.css';

const tools = [
  { name: 'CGPA Calculator', label: 'Live', href: '#', accent: 'olive' },
  { name: 'To-Do Planner', label: 'Soon', href: '#', accent: 'olive' },
  { name: 'Time Tracker', label: 'Soon', href: '#', accent: 'olive' },
  { name: 'Focus Analytics', label: 'Soon', href: '#', accent: 'olive' },
];

function ToolsSection({ onNavigateToCGPA }) {
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
    if (toolName === 'CGPA Calculator' && onNavigateToCGPA) {
      event.preventDefault();
      onNavigateToCGPA();
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

export default ToolsSection;
