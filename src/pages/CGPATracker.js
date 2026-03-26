import React, { useMemo, useState } from 'react';
import CGPAHeader from '../components/CGPA/CGPAHeader';
import CGPAControls from '../components/CGPA/CGPAControls';
import CGPATable from '../components/CGPA/CGPATable';
import CGPAResults from '../components/CGPA/CGPAResults';
import styles from './CGPATracker.module.css';

const createCourse = (id) => ({
  id,
  courseName: '',
  creditUnits: '',
  score: '',
});

function CGPATracker({ onNavigateHome }) {
  const [courses, setCourses] = useState([createCourse(1), createCourse(2)]);
  const [nextId, setNextId] = useState(3);
  const [cgpa, setCgpa] = useState(null);
  const [classification, setClassification] = useState(null);

  const getGradePoint = (score) => {
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore)) return null;
    if (numericScore >= 70) return 5;
    if (numericScore >= 60) return 4;
    if (numericScore >= 50) return 3;
    if (numericScore >= 45) return 2;
    if (numericScore >= 40) return 1;
    return 0;
  };

  const calculateWeightedPoints = (creditUnits, score) => {
    const units = Number(creditUnits);
    const gradePoint = getGradePoint(score);
    if (!Number.isFinite(units) || units <= 0 || gradePoint === null) return null;
    return units * gradePoint;
  };

  const resolveClassification = (value) => {
    if (value >= 4.5) return 'First Class';
    if (value >= 3.5) return 'Second Class Upper';
    if (value >= 2.4) return 'Second Class Lower';
    if (value >= 1.5) return 'Third Class';
    if (value > 0) return 'Pass';
    return null;
  };

  const stats = useMemo(() => {
    let totalUnits = 0;
    let totalWeighted = 0;

    courses.forEach((course) => {
      const units = Number(course.creditUnits);
      const weighted = calculateWeightedPoints(units, course.score);
      if (Number.isFinite(units) && units > 0 && Number.isFinite(weighted)) {
        totalUnits += units;
        totalWeighted += weighted;
      }
    });

    return { totalUnits, totalWeighted };
  }, [courses]);

  const handleAddCourse = () => {
    setCourses((prev) => [...prev, createCourse(nextId)]);
    setNextId((prev) => prev + 1);
  };

  const handleUpdateCourse = (id, key, value) => {
    setCourses((prev) => prev.map((course) => (course.id === id ? { ...course, [key]: value } : course)));
  };

  const handleRemoveCourse = (id) => {
    setCourses((prev) => prev.filter((course) => course.id !== id));
  };

  const handleRemoveSelected = (ids) => {
    setCourses((prev) => prev.filter((course) => !ids.includes(course.id)));
  };

  const handleCalculate = () => {
    if (stats.totalUnits === 0) {
      setCgpa(null);
      setClassification(null);
      return;
    }

    const value = stats.totalWeighted / stats.totalUnits;
    setCgpa(value);
    setClassification(resolveClassification(value));
  };

  const handleReset = () => {
    setCourses([createCourse(1), createCourse(2)]);
    setNextId(3);
    setCgpa(null);
    setClassification(null);
  };

  const handleExport = () => {
    const rows = [
      ['Course Name', 'Credit Units', 'Score', 'Grade Point', 'Weighted Points'],
      ...courses.map((course) => {
        const gradePoint = getGradePoint(course.score);
        const weighted = calculateWeightedPoints(course.creditUnits, course.score);
        return [
          course.courseName,
          course.creditUnits,
          course.score,
          gradePoint ?? '',
          weighted ?? '',
        ];
      }),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'crymson-cgpa.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.cgpaTracker}>
      <div className={styles.container}>
        <button type="button" onClick={onNavigateHome}>← Back To Landing</button>
        <CGPAHeader />
        <CGPAControls
          onAddCourse={handleAddCourse}
          onCalculate={handleCalculate}
          onExport={handleExport}
          onReset={handleReset}
        />
        <CGPATable
          courses={courses}
          getGradePoint={getGradePoint}
          calculateWeightedPoints={calculateWeightedPoints}
          onUpdateCourse={handleUpdateCourse}
          onRemoveCourse={handleRemoveCourse}
          onRemoveSelected={handleRemoveSelected}
        />
        <CGPAResults cgpa={cgpa} classification={classification} />
      </div>

      <footer className={styles.footer}>
        Crymson Student System - Academic performance utilities.
      </footer>
    </div>
  );
}

export default CGPATracker;
