import React, { useMemo } from 'react';
import { rankCourseImpact } from '../../../utils/academicEngine';
import styles from './AcademicTracker.module.css';

function impactClass(label) {
  if (!label) return '';
  if (label.startsWith('High')) return styles.impactHigh;
  if (label.startsWith('Medium')) return styles.impactMedium;
  return styles.impactLow;
}

export default function CourseImpact({ courses }) {
  const ranked = useMemo(() => rankCourseImpact(courses), [courses]);

  if (ranked.length === 0) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Course Impact Analysis</h3>
      <p className={styles.sectionHint}>
        Which courses affect your CGPA the most? Ranked by weight and performance gap.
      </p>

      <div className={styles.impactList}>
        {ranked.map((course, i) => (
          <div key={course.id} className={styles.impactItem}>
            <div>
              <span className={styles.impactCourseName}>
                {i + 1}. {course.courseName || 'Unnamed course'}
              </span>
              {course.reason && (
                <p className={styles.impactReason}>{course.reason}</p>
              )}
            </div>
            <span className={`${styles.impactLabel} ${impactClass(course.label)}`}>
              {course.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
