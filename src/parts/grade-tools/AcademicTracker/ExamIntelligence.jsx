import React, { useMemo } from 'react';
import { getExamRequirements, calcFinalScore, getGradePoint } from '../../../utils/academicEngine';
import styles from './AcademicTracker.module.css';

export default function ExamIntelligence({ courses }) {
  const requirements = useMemo(() => getExamRequirements(courses), [courses]);

  const coursesNeedingExam = requirements.filter((r) => !r.hasExam && !r.missingCa);
  if (coursesNeedingExam.length === 0) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Exam Score Intelligence</h3>
      <p className={styles.sectionHint}>
        What do you need in each exam to hit your target grades?
      </p>

      {coursesNeedingExam.map((req) => (
        <div key={req.courseId} className={styles.examCard}>
          <div className={styles.examCardHeader}>
            <h4 className={styles.examCourseName}>{req.courseName}</h4>
            <span className={styles.examCurrentGrade}>
              CA: {req.caScore ?? '—'}
            </span>
          </div>
          <div className={styles.examGradeRow}>
            {req.gradeRequirements.map((gr) => (
              <span
                key={gr.gradePoint}
                className={`${styles.examGradeItem} ${
                  gr.requiredScore === 0
                    ? styles.examGradeItemSecured
                    : gr.achievable
                      ? styles.examGradeItemAchievable
                      : styles.examGradeItemImpossible
                }`}
              >
                {gr.grade}: {gr.requiredScore !== null ? (gr.requiredScore === 0 ? 'Secured' : `${gr.requiredScore}/70`) : '—'}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
