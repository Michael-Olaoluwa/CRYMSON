import React, { useState } from 'react';
import styles from './CGPATable.module.css';

function CGPATable({ courses, stats, getGradePoint, calculateWeightedPoints, onUpdateCourse, onRemoveCourse, onRemoveSelected }) {
  const [selectedCourses, setSelectedCourses] = useState([]);

  const handleCheckboxChange = (id) => {
    setSelectedCourses(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleRemoveSelected = () => {
    onRemoveSelected(selectedCourses);
    setSelectedCourses([]);
  };

  return (
    <>
      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th>Course Name</th>
              <th>Credit Units</th>
              <th>Score (0-100)</th>
              <th>Grade Point</th>
              <th>Weighted Points</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => {
              const gradePoint = getGradePoint(course.score);
              const weightedPoints = calculateWeightedPoints(
                parseFloat(course.creditUnits) || 0,
                course.score
              );

              return (
                <tr key={course.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(course.id)}
                      onChange={() => handleCheckboxChange(course.id)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="e.g., Mathematics 101"
                      value={course.courseName}
                      onChange={(e) => onUpdateCourse(course.id, 'courseName', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      placeholder="e.g., 3"
                      value={course.creditUnits}
                      onChange={(e) => onUpdateCourse(course.id, 'creditUnits', e.target.value)}
                      inputMode="decimal"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="e.g., 75"
                      value={course.score}
                      onChange={(e) => onUpdateCourse(course.id, 'score', e.target.value)}
                      inputMode="decimal"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      readOnly
                      placeholder="Auto"
                      value={gradePoint !== null ? gradePoint.toFixed(1) : ''}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      readOnly
                      placeholder="Auto"
                      value={weightedPoints !== null ? weightedPoints.toFixed(2) : ''}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.summaryRow}>
              <td colSpan="2">Totals</td>
              <td>{stats.totalUnits.toFixed(2)}</td>
              <td />
              <td />
              <td>{stats.totalWeighted.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {selectedCourses.length > 0 && (
        <div className={styles.controls}>
          <button className={styles.btnDanger} onClick={handleRemoveSelected}>
            🗑️ Remove Selected
          </button>
        </div>
      )}
    </>
  );
}

export default CGPATable;
