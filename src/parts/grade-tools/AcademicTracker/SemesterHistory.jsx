import React, { useMemo } from 'react';
import styles from './AcademicTracker.module.css';

export default function SemesterHistory({ previousSemesters }) {
  if (!Array.isArray(previousSemesters) || previousSemesters.length === 0) return null;

  const chartData = useMemo(() => {
    const sorted = [...previousSemesters].sort((a, b) => a.semester - b.semester);
    return sorted.map((s, i) => ({
      semester: s.semester,
      cgpa: Number(s.cgpa) || 0,
      index: i,
    }));
  }, [previousSemesters]);

  const width = 280;
  const height = 100;
  const pad = { top: 12, right: 16, bottom: 20, left: 28 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxCgpa = 5;

  const points = chartData.map((d, i) => {
    const x = pad.left + (chartData.length > 1 ? (i / (chartData.length - 1)) * plotW : plotW / 2);
    const y = pad.top + plotH - (d.cgpa / maxCgpa) * plotH;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Semester History</h3>

      {points.length > 1 && (
        <div className={styles.historyChartWrap}>
          <svg
            className={styles.historyChart}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <path d={pathD} className={styles.historyLine} />
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="3.5" fill="var(--clr-accent, #a855f7)" />
                <text
                  x={p.x}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill="var(--clr-text-muted, #999)"
                >
                  S{p.semester}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}

      <div className={styles.historyTableWrap}>
        <table className={styles.historyTable}>
          <thead>
            <tr>
              <th>Semester</th>
              <th>CGPA</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((entry, i) => {
              const prev = i > 0 ? chartData[i - 1].cgpa : null;
              const diff = prev !== null ? entry.cgpa - prev : null;
              let trendLabel = '—';
              let trendClass = styles.historyFlat;
              if (diff !== null) {
                if (diff > 0) {
                  trendLabel = `+${diff.toFixed(2)}`;
                  trendClass = styles.historyUp;
                } else if (diff < 0) {
                  trendLabel = diff.toFixed(2);
                  trendClass = styles.historyDown;
                } else {
                  trendLabel = 'No change';
                }
              }
              return (
                <tr key={entry.semester}>
                  <td>Semester {entry.semester}</td>
                  <td>{entry.cgpa.toFixed(2)}</td>
                  <td className={trendClass}>{trendLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
