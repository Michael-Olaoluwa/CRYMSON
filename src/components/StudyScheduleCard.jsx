import React, { useState } from 'react';
import styles from './StudyScheduleCard.module.css';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const priorityColors = {
  high: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444' },
  medium: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#f59e0b' },
  low: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', text: '#22c55e' },
};

export default function StudyScheduleCard({
  recommendation,
  onApprove,
  onDecline,
  onReschedule,
  onCheckIn,
  isApproved,
}) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState(recommendation.date || '');
  const [newStart, setNewStart] = useState(recommendation.startTime || '');
  const [newEnd, setNewEnd] = useState(recommendation.endTime || '');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [studied, setStudied] = useState(true);
  const [minutes, setMinutes] = useState(String(recommendation.durationMinutes || 60));

  const colors = priorityColors[recommendation.priority] || priorityColors.medium;

  const handleReschedule = () => {
    onReschedule(recommendation.id, newDate, newStart, newEnd);
    setShowReschedule(false);
  };

  const handleCheckIn = () => {
    onCheckIn(recommendation.id, studied, Number(minutes));
    setShowCheckIn(false);
  };

  return (
    <div
      className={`${styles.card} ${isApproved ? styles.approved : ''}`}
      style={{ borderLeftColor: colors.border }}
    >
      <div className={styles.header}>
        <div className={styles.courseRow}>
          <span className={styles.badge} style={{ background: colors.bg, color: colors.text }}>
            {recommendation.priority}
          </span>
          <span className={styles.courseTag}>{recommendation.courseTag}</span>
        </div>
        <div className={styles.timeRow}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{formatDate(recommendation.date)}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 8 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>{recommendation.startTime} – {recommendation.endTime}</span>
          <span className={styles.duration}>({recommendation.durationMinutes}m)</span>
        </div>
      </div>

      <p className={styles.reason}>{recommendation.reason}</p>

      {recommendation.completed ? (
        <div className={styles.completedBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Completed{recommendation.checkIn ? ` — ${recommendation.checkIn.minutesStudied}m studied` : ''}</span>
        </div>
      ) : isApproved ? (
        <div className={styles.actions}>
          <button className={styles.checkInBtn} onClick={() => setShowCheckIn(true)}>
            Check In
          </button>
          <button className={styles.rescheduleBtn} onClick={() => setShowReschedule(true)}>
            Reschedule
          </button>
        </div>
      ) : (
        <div className={styles.actions}>
          <button className={styles.approveBtn} onClick={() => onApprove(recommendation)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Approve
          </button>
          <button className={styles.declineBtn} onClick={() => onDecline(recommendation.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Skip
          </button>
        </div>
      )}

      {showReschedule && (
        <div className={styles.rescheduleForm}>
          <label>
            Date
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </label>
          <label>
            Start
            <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
          </label>
          <label>
            End
            <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
          </label>
          <div className={styles.rescheduleActions}>
            <button className={styles.saveBtn} onClick={handleReschedule}>Save</button>
            <button className={styles.cancelBtn} onClick={() => setShowReschedule(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showCheckIn && (
        <div className={styles.checkInForm}>
          <p className={styles.checkInTitle}>Did you study {recommendation.courseTag}?</p>
          <div className={styles.checkInToggle}>
            <button
              className={`${styles.toggleBtn} ${studied ? styles.toggleActive : ''}`}
              onClick={() => setStudied(true)}
            >
              Yes
            </button>
            <button
              className={`${styles.toggleBtn} ${!studied ? styles.toggleActive : ''}`}
              onClick={() => setStudied(false)}
            >
              No
            </button>
          </div>
          {studied && (
            <label>
              Minutes studied
              <input type="number" min="1" max="480" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </label>
          )}
          <div className={styles.checkInActions}>
            <button className={styles.saveBtn} onClick={handleCheckIn}>Submit</button>
            <button className={styles.cancelBtn} onClick={() => setShowCheckIn(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
