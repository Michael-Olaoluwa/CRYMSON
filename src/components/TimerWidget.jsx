import React from 'react';
import { formatClock } from '../utils/timeFormatting';
import { useTimer } from '../context/TimerContext';
import styles from './TimerWidget.module.css';

export default function TimerWidget() {
  const { isRunning, elapsedSeconds } = useTimer();

  // Only show widget if timer is running
  if (!isRunning || elapsedSeconds === 0) {
    return null;
  }

  return (
    <div className={styles.widget}>
      <div className={styles.timer}>
        {formatClock(elapsedSeconds)}
      </div>
    </div>
  );
}
