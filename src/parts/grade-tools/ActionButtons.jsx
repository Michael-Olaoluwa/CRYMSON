import React from 'react';
import styles from './ActionButtons.module.css';

function ActionButtons({ onAddCourse, onCalculate, onExport, onReset }) {
	return (
		<div className={styles.controls}>
			<button className={styles.btnPrimary} onClick={onAddCourse}>➕ Add Course</button>
			<button className={styles.btnSecondary} onClick={onCalculate}>📊 Calculate CGPA</button>
			<button className={styles.btnSecondary} onClick={onExport}>📥 Export CSV</button>
			<button className={styles.btnPrimary} onClick={onReset}>🔄 Reset Table</button>
		</div>
	);
}

export default ActionButtons;
