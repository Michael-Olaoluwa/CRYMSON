/**
 * src/components/ProgressOverviewCard.jsx
 * Unified dashboard card showing CGPA trend, study streak, and task completion
 */

import React, { useMemo } from "react";
import styles from "./ProgressOverviewCard.module.css";
import { FireIcon, SparklesIcon, TargetIcon, CheckIcon, BookIcon, ClipboardIcon } from "../utils/icons";

export const ProgressOverviewCard = ({
  cgpaHistory = [],
  currentCgpa = null,
  goalCgpa = null,
  currentStreak = 0,
  bestStreak = 0,
  taskCompletion = 0,
  weekStudyHours = 0,
}) => {
  // Mini CGPA trend chart
  const cgpaTrend = useMemo(() => {
    if (cgpaHistory.length === 0) return null;
    const last5 = cgpaHistory.slice(-5);
    const min = 0;
    const max = 5;
    return last5.map((cgpa, idx) => ({
      x: idx,
      y: ((cgpa - min) / (max - min)) * 100,
      value: cgpa.toFixed(2),
    }));
  }, [cgpaHistory]);

  // Calculate progress indicators
  const cgpaProgress = currentCgpa
    ? goalCgpa
      ? (currentCgpa / goalCgpa) * 100
      : (currentCgpa / 5) * 100
    : 0;
  const taskProgress = taskCompletion;
  const streakProgress = (currentStreak / bestStreak) * 100 || 0;

  // Render sparkline (simple ASCII-style visualization)
  const renderSparkline = (data) => {
    if (!data || data.length === 0) return "—";
    const heights = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    return data
      .map((point) => {
        const idx = Math.floor((point.y / 100) * (heights.length - 1));
        return heights[idx];
      })
      .join("");
  };

  // Color indicators based on status
  const getStatusColor = (value, threshold) => {
    if (value >= threshold) return "success";
    if (value >= threshold * 0.75) return "warning";
    return "alert";
  };

  return (
    <div className={styles.container}>
      <h3>Progress Overview</h3>

      {/* Top metrics row */}
      <div className={styles.metricsRow}>
        {/* CGPA Section */}
        <div className={styles.metric}>
          <div className={styles.metricLabel}>CGPA</div>
          <div className={styles.metricValue}>
            {currentCgpa !== null ? currentCgpa.toFixed(2) : "—"}
          </div>
          {goalCgpa && (
            <div className={styles.metricGoal}>Goal: {goalCgpa.toFixed(2)}</div>
          )}
          <div className={styles.progressBar}>
            <div
              className={`${styles.fill} ${styles[getStatusColor(cgpaProgress, 80)]}`}
              style={{ width: `${Math.min(cgpaProgress, 100)}%` }}
            />
          </div>
          {cgpaTrend && (
            <div className={styles.sparkline}>{renderSparkline(cgpaTrend)}</div>
          )}
        </div>

        {/* Streak Section */}
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Study Streak</div>
          <div className={styles.metricValue}>{currentStreak}</div>
          <div className={styles.metricSubtext}>days <FireIcon /></div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.fill} ${styles[getStatusColor(streakProgress, 50)]}`}
              style={{ width: `${Math.min(streakProgress, 100)}%` }}
            />
          </div>
          {bestStreak > 0 && (
            <div className={styles.metricNote}>
              Best: {bestStreak} days
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Task Completion</div>
          <div className={styles.metricValue}>{Math.round(taskProgress)}%</div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.fill} ${styles[getStatusColor(taskProgress, 70)]}`}
              style={{ width: `${Math.min(taskProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Study Time Section */}
        <div className={styles.metric}>
          <div className={styles.metricLabel}>This Week</div>
          <div className={styles.metricValue}>{weekStudyHours}</div>
          <div className={styles.metricSubtext}>hours studied</div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.fill} ${styles[getStatusColor(weekStudyHours * 10, 50)]}`}
              style={{ width: `${Math.min((weekStudyHours / 20) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Insights section */}
      <div className={styles.insights}>
        {currentStreak >= 7 && (
          <div className={styles.insight + " " + styles.positive}>
            <SparklesIcon /> Amazing streak! Keep it going for day {currentStreak + 1}
          </div>
        )}
        {cgpaProgress >= 90 && (
          <div className={styles.insight + " " + styles.positive}>
            <TargetIcon /> You're very close to your CGPA goal!
          </div>
        )}
        {taskProgress >= 80 && (
          <div className={styles.insight + " " + styles.positive}>
            <CheckIcon /> Excellent task completion rate!
          </div>
        )}
        {currentStreak === 0 && (
          <div className={styles.insight + " " + styles.warning}>
            <BookIcon /> Start a study session to begin your streak
          </div>
        )}
        {taskProgress < 50 && (
          <div className={styles.insight + " " + styles.warning}>
            <ClipboardIcon /> Consider reviewing upcoming tasks
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressOverviewCard;
