import React from 'react';
import styles from './ActionButtons.module.css';
import { PlusIcon, BarChartIcon, DownloadIcon, RefreshIcon } from '../../utils/icons';

function ActionButtons({ onAddCourse, onCalculate, onExport, onReset }) {
	return (
		<div className={styles.controls}>
			<button className={styles.btnPrimary} onClick={onAddCourse}><PlusIcon /> Add Course</button>
			<button className={styles.btnSecondary} onClick={onCalculate}><BarChartIcon /> Calculate CGPA</button>
			<button className={styles.btnSecondary} onClick={onExport}><DownloadIcon /> Export CSV</button>
			<button className={styles.btnPrimary} onClick={onReset}><RefreshIcon /> Reset Table</button>
		</div>
	);
}

export default ActionButtons;
