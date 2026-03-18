import React, { useEffect, useState } from 'react';
import styles from './CGPACalculator.module.css';
import CGPAHeader from '../components/CGPA/CGPAHeader';
import CGPATable from '../components/CGPA/CGPATable';
import CGPAResults from '../components/CGPA/CGPAResults';
import CGPAControls from '../components/CGPA/CGPAControls';
import Toast from '../components/Toast';
import { Toast as ToastNotification } from '../utils/toast';

function CGPACalculator({ onNavigateHome }) {
  const [courses, setCourses] = useState([]);
  const [cgpa, setCGPA] = useState(null);
  const [classification, setClassification] = useState(null);
  const [toasts, setToasts] = useState([]);
  const STORAGE_KEY = 'crymson_cgpa_courses';

  useEffect(() => {
    loadCoursesFromStorage();
  }, []);

  const loadCoursesFromStorage = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const loadedCourses = JSON.parse(stored);
        setCourses(loadedCourses.length > 0 ? loadedCourses : [createEmptyCourse()]);
      } catch (e) {
        console.error('Error loading courses:', e);
        setCourses([createEmptyCourse()]);
      }
    } else {
      setCourses([createEmptyCourse()]);
    }
  };

  const createEmptyCourse = () => ({
    id: `course-${Date.now()}`,
    courseName: '',
    creditUnits: '',
    score: '',
  });

  const saveCoursesToStorage = (updatedCourses) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCourses));
  };

  const getGradePoint = (score) => {
    if (score === '' || score === null) return null;
    const s = parseFloat(score);
    if (s >= 70 && s <= 100) return 5;
    if (s >= 60 && s < 70) return 4;
    if (s >= 50 && s < 60) return 3;
    if (s >= 45 && s < 50) return 2;
    if (s >= 40 && s < 45) return 1;
    if (s >= 0 && s < 40) return 0;
    return null;
  };

  const calculateWeightedPoints = (creditUnits, score) => {
    const gradePoint = getGradePoint(score);
    if (gradePoint !== null && creditUnits > 0) {
      return creditUnits * gradePoint;
    }
    return null;
  };

  const addCourse = () => {
    const newCourses = [...courses, createEmptyCourse()];
    setCourses(newCourses);
    saveCoursesToStorage(newCourses);
    showToast('Course row added successfully');
  };

  const updateCourse = (id, field, value) => {
    const updatedCourses = courses.map(course =>
      course.id === id ? { ...course, [field]: value } : course
    );
    setCourses(updatedCourses);
    saveCoursesToStorage(updatedCourses);
  };

  const removeCourse = (id) => {
    const updatedCourses = courses.filter(course => course.id !== id);
    const finalCourses = updatedCourses.length > 0 ? updatedCourses : [createEmptyCourse()];
    setCourses(finalCourses);
    saveCoursesToStorage(finalCourses);
    showToast(`Course removed`);
  };

  const removeSelectedCourses = (selectedIds) => {
    if (selectedIds.length === 0) {
      showToast('Please select a course to remove', 'error');
      return;
    }
    const updatedCourses = courses.filter(course => !selectedIds.includes(course.id));
    const finalCourses = updatedCourses.length > 0 ? updatedCourses : [createEmptyCourse()];
    setCourses(finalCourses);
    saveCoursesToStorage(finalCourses);
    showToast(`${selectedIds.length} course(s) removed`);
  };

  const calculateCGPA = () => {
    let totalWeightedPoints = 0;
    let totalCreditUnits = 0;
    let validCourses = 0;

    courses.forEach(course => {
      const creditUnits = parseFloat(course.creditUnits) || 0;
      const score = parseFloat(course.score);

      if (creditUnits > 0 && !isNaN(score)) {
        const gradePoint = getGradePoint(score);
        const weightedPoints = creditUnits * gradePoint;
        totalWeightedPoints += weightedPoints;
        totalCreditUnits += creditUnits;
        validCourses++;
      }
    });

    if (validCourses === 0) {
      showToast('Please enter at least one course with valid score', 'error');
      setCGPA(null);
      setClassification(null);
      return;
    }

    const calculatedCGPA = totalCreditUnits > 0 ? (totalWeightedPoints / totalCreditUnits) : 0;
    const calculatedClassification = getClassification(calculatedCGPA);
    setCGPA(calculatedCGPA);
    setClassification(calculatedClassification);
    showToast('CGPA calculated successfully');
  };

  const getClassification = (cgpa) => {
    const CLASSIFICATIONS = [
      { min: 4.50, max: 5.00, name: 'First Class' },
      { min: 3.50, max: 4.49, name: 'Second Class Upper' },
      { min: 2.40, max: 3.49, name: 'Second Class Lower' },
      { min: 1.50, max: 2.39, name: 'Third Class' },
      { min: 1.00, max: 1.49, name: 'Pass' }
    ];
    for (let range of CLASSIFICATIONS) {
      if (cgpa >= range.min && cgpa <= range.max) {
        return range.name;
      }
    }
    return 'Invalid CGPA';
  };

  const resetTable = () => {
    if (window.confirm('Are you sure you want to clear all courses? This action cannot be undone.')) {
      setCourses([createEmptyCourse()]);
      setCGPA(null);
      setClassification(null);
      localStorage.removeItem(STORAGE_KEY);
      showToast('Table reset successfully');
    }
  };

  const exportToCSV = () => {
    if (courses.length === 0) {
      showToast('No courses to export', 'error');
      return;
    }

    let csvContent = 'Course Name,Credit Units,Score,Grade Point,Weighted Points\n';

    courses.forEach(course => {
      const creditUnits = parseFloat(course.creditUnits) || '';
      const score = parseFloat(course.score);
      const gradePoint = getGradePoint(score);
      const weightedPoints = calculateWeightedPoints(creditUnits, score);

      csvContent += `"${course.courseName}",${creditUnits},${score},${gradePoint || ''},${weightedPoints ? weightedPoints.toFixed(2) : ''}\n`;
    });

    if (cgpa !== null) {
      csvContent += `\nCGPA,${cgpa.toFixed(2)}\n`;
      csvContent += `Degree Classification,${classification}\n`;
    }

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `crymson_cgpa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Courses exported to CSV successfully');
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <div className={styles.cgpaCalculator}>
      <div className={styles.container}>
        <CGPAHeader />
        <CGPAControls
          onAddCourse={addCourse}
          onCalculate={calculateCGPA}
          onExport={exportToCSV}
          onReset={resetTable}
        />
        <CGPATable
          courses={courses}
          getGradePoint={getGradePoint}
          calculateWeightedPoints={calculateWeightedPoints}
          onUpdateCourse={updateCourse}
          onRemoveCourse={removeCourse}
          onRemoveSelected={removeSelectedCourses}
        />
        <CGPAResults cgpa={cgpa} classification={classification} />
      </div>

      <footer className={styles.footer}>
        © 2026 Crymson CGPA Calculator
      </footer>

      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </div>
  );
}

export default CGPACalculator;
