import React from 'react';
import { getGradePoint, getGradeLabel, calcFinalScore } from '../../../utils/academicEngine';
import styles from './AcademicTracker.module.css';

function gradeClass(label) {
  if (!label) return '';
  const map = { A: styles.gradeA, B: styles.gradeB, C: styles.gradeC, D: styles.gradeD, E: styles.gradeE, F: styles.gradeF };
  return map[label] || '';
}

export default function CourseTable({ courses, onChange, onRemove, onAdd }) {
  const update = (id, field, value) => {
    const updated = courses.map((c) =>
      c.id === id ? { ...c, [field]: value } : c
    );
    onChange(updated);
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Current Semester Courses</h3>
      <p className={styles.sectionHint}>
        Enter your courses, credit units, and scores. Grade updates automatically as you type.
      </p>

      {courses.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Course</th>
                <th>Units</th>
                <th>T1</th>
                <th>T2</th>
                <th>Exam</th>
                <th>Grade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const final = calcFinalScore(course);
                const gp = getGradePoint(final);
                const label = getGradeLabel(final);

                return (
                  <tr key={course.id}>
                    <td>
                      <input
                        className={styles.input}
                        type="text"
                        value={course.courseName}
                        onChange={(e) => update(course.id, 'courseName', e.target.value)}
                        placeholder="Course name"
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        step="1"
                        value={course.creditUnits}
                        onChange={(e) => update(course.id, 'creditUnits', e.target.value)}
                        placeholder="0"
                        style={{ width: '60px' }}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={course.test1Score}
                        onChange={(e) => update(course.id, 'test1Score', e.target.value)}
                        placeholder="—"
                        style={{ width: '55px' }}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={course.test2Score}
                        onChange={(e) => update(course.id, 'test2Score', e.target.value)}
                        placeholder="—"
                        style={{ width: '55px' }}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        max="70"
                        step="0.5"
                        value={course.examScore}
                        onChange={(e) => update(course.id, 'examScore', e.target.value)}
                        placeholder="—"
                        style={{ width: '55px' }}
                      />
                    </td>
                    <td className={styles.gradeCell}>
                      {label ? (
                        <span className={`${styles.gradeLabel} ${gradeClass(label)}`}>
                          {label} ({gp})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--clr-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={styles.removeBtn}
                        onClick={() => onRemove(course.id)}
                        title="Remove course"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onAdd}>
        + Add Course
      </button>
    </div>
  );
}
