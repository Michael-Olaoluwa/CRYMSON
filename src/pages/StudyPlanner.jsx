import React, { useCallback, useEffect, useState } from 'react';
import StudyScheduleCard from '../components/StudyScheduleCard';
import apiClient from '../utils/apiClient';
import styles from './StudyPlanner.module.css';

export default function StudyPlanner({ activeUserId }) {
  const [schedule, setSchedule] = useState(null);
  const [approvedPlans, setApprovedPlans] = useState([]);
  const [completedPlans, setCompletedPlans] = useState([]);
  const [checkInStats, setCheckInStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('suggested');

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await apiClient.get('/api/planner/schedule');
      setSchedule(data.schedule);
      setApprovedPlans(data.approvedPlans || []);
      setCompletedPlans(data.completedPlans || []);
      setCheckInStats(data.checkInStats);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const generateSchedule = async () => {
    try {
      setGenerating(true);
      const { data } = await apiClient.post('/api/planner/generate');
      setSchedule(data.schedule);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (recommendation) => {
    try {
      const { data } = await apiClient.post('/api/planner/approve', { recommendation });
      setApprovedPlans((prev) => [...prev, data.plan]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to approve');
    }
  };

  const handleDecline = async (id) => {
    try {
      await apiClient.post('/api/planner/decline', { recommendationId: id });
      setSchedule((prev) => ({
        ...prev,
        recommendations: (prev?.recommendations || []).filter((r) => r.id !== id),
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to decline');
    }
  };

  const handleReschedule = async (id, date, startTime, endTime) => {
    try {
      await apiClient.post('/api/planner/reschedule', {
        recommendationId: id, newDate: date, newStartTime: startTime, newEndTime: endTime,
      });
      setApprovedPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, date, startTime, endTime, rescheduled: true } : p))
      );
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reschedule');
    }
  };

  const handleCheckIn = async (planId, studied, minutesStudied) => {
    try {
      const { data } = await apiClient.post('/api/planner/checkin', { planId, studied, minutesStudied });
      setCheckInStats(data.stats);
      setApprovedPlans((prev) => prev.filter((p) => p.id !== planId));
      setCompletedPlans((prev) => [
        ...prev,
        { ...(approvedPlans.find((p) => p.id === planId) || {}), completed: true, checkIn: data.checkIn },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to check in');
    }
  };

  const priorityLabel = schedule?.coursePriorities
    ?.filter((p) => p.isBehind)
    ?.map((p) => p.courseTag);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>AI Study Planner</p>
          <h1 className={styles.title}>Smart Schedule</h1>
          <p className={styles.subtitle}>
            Crymson scans your tasks, study hours, and timetable to build a personalised study plan.
          </p>
        </div>
        <div className={styles.heroActions}>
          <button
            className={styles.generateBtn}
            onClick={generateSchedule}
            disabled={generating}
          >
            {generating ? (
              <>Generating...</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Generate New Schedule
              </>
            )}
          </button>
          <button className={styles.refreshBtn} onClick={fetchSchedule} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {priorityLabel && priorityLabel.length > 0 && (
        <div className={styles.alert}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            Courses needing attention: <strong>{priorityLabel.join(', ')}</strong>. Generate a schedule to catch up.
          </span>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'suggested' ? styles.tabActive : ''}`}
          onClick={() => setTab('suggested')}
        >
          Suggested
          {schedule?.recommendations?.length > 0 && (
            <span className={styles.tabCount}>{schedule.recommendations.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === 'approved' ? styles.tabActive : ''}`}
          onClick={() => setTab('approved')}
        >
          Approved
          {approvedPlans.length > 0 && (
            <span className={styles.tabCount}>{approvedPlans.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === 'completed' ? styles.tabActive : ''}`}
          onClick={() => setTab('completed')}
        >
          Completed
          {completedPlans.length > 0 && (
            <span className={styles.tabCount}>{completedPlans.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === 'stats' ? styles.tabActive : ''}`}
          onClick={() => setTab('stats')}
        >
          Stats
        </button>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.empty}>
            <p>Loading...</p>
          </div>
        ) : tab === 'suggested' ? (
          <>
            {schedule?.coursePriorities && schedule.coursePriorities.length > 0 && (
              <div className={styles.prioritiesGrid}>
                {schedule.coursePriorities.map((p) => (
                  <div key={p.courseTag} className={styles.priorityCard}>
                    <span className={styles.priorityCourse}>{p.courseTag}</span>
                    <div className={styles.priorityBar}>
                      <div
                        className={styles.priorityFill}
                        style={{ width: `${Math.min(100, (p.priorityScore || 0) * 100)}%` }}
                      />
                    </div>
                    <div className={styles.priorityMeta}>
                      <span>{p.actualHours}h / {p.recommendedHours}h studied</span>
                      {p.daysUntilDue <= 14 && <span>{p.daysUntilDue}d to deadline</span>}
                      {p.isBehind && <span className={styles.behindTag}>Behind</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {schedule?.recommendations && schedule.recommendations.length > 0 ? (
              <div className={styles.recommendations}>
                {schedule.recommendations.map((r) => (
                  <StudyScheduleCard
                    key={r.id}
                    recommendation={r}
                    onApprove={handleApprove}
                    onDecline={handleDecline}
                    onReschedule={handleReschedule}
                    onCheckIn={handleCheckIn}
                    isApproved={approvedPlans.some((p) => p.id === r.id)}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p>No suggestions yet. Generate a schedule to get started.</p>
              </div>
            )}
          </>
        ) : tab === 'approved' ? (
          <>
            {approvedPlans.length > 0 ? (
              <div className={styles.recommendations}>
                {approvedPlans.map((p) => (
                  <StudyScheduleCard
                    key={p.id}
                    recommendation={p}
                    onApprove={handleApprove}
                    onDecline={handleDecline}
                    onReschedule={handleReschedule}
                    onCheckIn={handleCheckIn}
                    isApproved={true}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No approved plans yet. Approve a suggestion to see it here.</p>
              </div>
            )}
          </>
        ) : tab === 'completed' ? (
          <>
            {completedPlans.length > 0 ? (
              <div className={styles.recommendations}>
                {completedPlans.map((p) => (
                  <StudyScheduleCard
                    key={p.id}
                    recommendation={p}
                    onApprove={handleApprove}
                    onDecline={handleDecline}
                    onReschedule={handleReschedule}
                    onCheckIn={handleCheckIn}
                    isApproved={true}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No completed sessions yet. Use the check-in after studying.</p>
              </div>
            )}
          </>
        ) : tab === 'stats' && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{checkInStats?.total || 0}</span>
              <span className={styles.statLabel}>Total Check-Ins</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{checkInStats?.studied || 0}</span>
              <span className={styles.statLabel}>Sessions Studied</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{checkInStats?.skipped || 0}</span>
              <span className={styles.statLabel}>Sessions Skipped</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{checkInStats?.totalMinutes || 0}</span>
              <span className={styles.statLabel}>Total Minutes</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{approvedPlans.length + completedPlans.length}</span>
              <span className={styles.statLabel}>Plans Approved</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {completedPlans.length > 0
                  ? `${Math.round(completedPlans.reduce((s, p) => s + (p.checkIn?.minutesStudied || 0), 0) / completedPlans.length)}m`
                  : '—'}
              </span>
              <span className={styles.statLabel}>Avg Session</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
