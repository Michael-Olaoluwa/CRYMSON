import React, { useCallback, useEffect, useState } from 'react';
import { getAuthToken } from '../utils/authSession';
import styles from './Wellbeing.module.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

const WELLBEING_STORAGE_KEY_BASE = 'crymson_wellbeing_checkins';

const MOODS = [
  { value: 1, label: 'Terrible', emoji: 'Terrible', color: '#ef4444' },
  { value: 2, label: 'Low', emoji: 'Low', color: '#f97316' },
  { value: 3, label: 'Okay', emoji: 'Okay', color: '#eab308' },
  { value: 4, label: 'Good', emoji: 'Good', color: '#22c55e' },
  { value: 5, label: 'Amazing', emoji: 'Amazing', color: '#06b6d4' },
];

const ENERGIES = [
  { value: 1, label: 'Exhausted', emoji: 'Exhausted', color: '#6366f1' },
  { value: 2, label: 'Tired', emoji: 'Tired', color: '#8b5cf6' },
  { value: 3, label: 'Steady', emoji: 'Steady', color: '#a855f7' },
  { value: 4, label: 'Energetic', emoji: 'Energetic', color: '#06b6d4' },
  { value: 5, label: 'Energized', emoji: 'Energized', color: '#14b8a6' },
];

function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function Wellbeing() {
  const [step, setStep] = useState('mood');
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedEnergy, setSelectedEnergy] = useState(null);
  const [streak, setStreak] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [peakHours, setPeakHours] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [todaysCheckIn, setTodaysCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const syncToLocalStorage = useCallback((checkIns) => {
    try {
      const userId = '';
      const raw = localStorage.getItem('crymson_app_state');
      let uid = userId;
      if (raw) { try { const s = JSON.parse(raw); if (s.activeUserId) uid = s.activeUserId; } catch {} }
      const key = `${WELLBEING_STORAGE_KEY_BASE}:${uid || 'guest'}`;
      localStorage.setItem(key, JSON.stringify(checkIns));
    } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [todayRes, historyRes, patternsRes] = await Promise.all([
        fetch(`${API_BASE}/api/wellbeing/today`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/wellbeing/history`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/wellbeing/patterns`, { headers: getAuthHeaders() }),
      ]);
      if (todayRes.ok) {
        const todayData = await todayRes.json();
        setTodaysCheckIn(todayData.checkIn);
        if (todayData.checkIn) {
          setSelectedMood(todayData.checkIn.mood);
          setSelectedEnergy(todayData.checkIn.energy);
          setStep('done');
        }
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setCheckIns(historyData.checkIns || []);
        setStreak(historyData.streak);
        setWeeklySummary(historyData.weeklySummary);
        syncToLocalStorage(historyData.checkIns || []);
      }
      if (patternsRes.ok) {
        const patternsData = await patternsRes.json();
        setPeakHours(patternsData.peakHours);
        setPatterns(patternsData.correlation);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [syncToLocalStorage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSelectMood = async (value) => {
    setSelectedMood(value);
    setStep('energy');
  };

  const handleSelectEnergy = async (value) => {
    setSelectedEnergy(value);
    setStep('done');
    await submitCheckIn(selectedMood, value);
  };

  const submitCheckIn = async (mood, energy) => {
    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`${API_BASE}/api/wellbeing/checkin`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ mood, energy }),
      });
      if (!res.ok) throw new Error('Failed to submit check-in');
      const data = await res.json();
      setStreak(data.streak);
      setTodaysCheckIn(data.checkIn);
      const updatedCheckIns = checkIns.filter(
        (c) => (c.date || c.createdAt || '').slice(0, 10) !== new Date().toISOString().slice(0, 10)
      );
      updatedCheckIns.push(data.checkIn);
      setCheckIns(updatedCheckIns);
      syncToLocalStorage(updatedCheckIns);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRedo = () => {
    setStep('mood');
    setSelectedMood(null);
    setSelectedEnergy(null);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Wellbeing</p>
          <h1 className={styles.title}>Daily Check-In</h1>
          <p className={styles.subtitle}>Three quick taps to log how you're feeling. It takes under 10 seconds.</p>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.checkinCard}>
        {step === 'mood' && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>How's your mood?</h2>
            <p className={styles.stepHint}>Tap one — this helps us understand your wellbeing patterns.</p>
            <div className={styles.optionsGrid}>
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  className={`${styles.optionBtn} ${selectedMood === m.value ? styles.optionSelected : ''}`}
                  style={{ '--accent': m.color }}
                  onClick={() => handleSelectMood(m.value)}
                  disabled={submitting}
                >
                  <span className={styles.optionEmoji}>{m.emoji}</span>
                  <span className={styles.optionLabel}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'energy' && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>How's your energy?</h2>
            <p className={styles.stepHint}>One more tap — almost done.</p>
            <div className={styles.optionsGrid}>
              {ENERGIES.map((e) => (
                <button
                  key={e.value}
                  className={`${styles.optionBtn} ${selectedEnergy === e.value ? styles.optionSelected : ''}`}
                  style={{ '--accent': e.color }}
                  onClick={() => handleSelectEnergy(e.value)}
                  disabled={submitting}
                >
                  <span className={styles.optionEmoji}>{e.emoji}</span>
                  <span className={styles.optionLabel}>{e.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(step === 'submitting' || step === 'done') && (
          <div className={styles.stepContent}>
            {submitting ? (
              <div className={styles.doneState}>
                <div className={styles.doneIcon}>Saving...</div>
                <p className={styles.doneText}>One moment...</p>
              </div>
            ) : (
              <div className={styles.doneState}>
                <div className={styles.doneIcon}>Done</div>
                <p className={styles.doneText}>
                  Checked in for today!
                  {selectedMood && selectedEnergy && (
                    <span className={styles.doneSummary}>
                      <span style={{ color: MOODS[selectedMood - 1]?.color }}>Mood: {MOODS[selectedMood - 1]?.label}</span>
                      <span className={styles.doneSep}>·</span>
                      <span style={{ color: ENERGIES[selectedEnergy - 1]?.color }}>Energy: {ENERGIES[selectedEnergy - 1]?.label}</span>
                    </span>
                  )}
                </p>
                <button className={styles.redoBtn} onClick={handleRedo}>Update</button>
              </div>
            )}
          </div>
        )}
      </div>

      {streak && (
        <div className={styles.streakRow}>
          <div className={styles.streakCard}>
            <span className={styles.streakValue}>{streak.currentStreak}</span>
            <span className={styles.streakLabel}>Day Streak</span>
          </div>
          <div className={styles.streakCard}>
            <span className={styles.streakValue}>{streak.bestStreak}</span>
            <span className={styles.streakLabel}>Best Streak</span>
          </div>
          <div className={styles.streakCard}>
            <span className={styles.streakValue}>{streak.totalCheckIns}</span>
            <span className={styles.streakLabel}>Total Check-Ins</span>
          </div>
        </div>
      )}

      {weeklySummary && weeklySummary.daysCheckedIn > 0 && (
        <div className={styles.weeklyCard}>
          <h3 className={styles.sectionTitle}>This Week</h3>
          <div className={styles.weeklyGrid}>
            <div className={styles.weeklyStat}>
              <span className={styles.weeklyValue}>{weeklySummary.daysCheckedIn}</span>
              <span className={styles.weeklyLabel}>Days checked in</span>
            </div>
            <div className={styles.weeklyStat}>
              <span className={styles.weeklyValue}>{weeklySummary.avgMood ?? '—'}</span>
              <span className={styles.weeklyLabel}>Avg mood</span>
            </div>
            <div className={styles.weeklyStat}>
              <span className={styles.weeklyValue}>{weeklySummary.avgEnergy ?? '—'}</span>
              <span className={styles.weeklyLabel}>Avg energy</span>
            </div>
          </div>
          <div className={styles.weeklyDots}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
              const dayCheckIn = weeklySummary.days?.find((d) => {
                const dDate = new Date(d.date);
                return dDate.getDay() === i;
              });
              return (
                <div key={day} className={styles.weekDotWrap}>
                  <div
                    className={`${styles.weekDot} ${dayCheckIn ? styles.weekDotActive : ''}`}
                    style={dayCheckIn ? {
                      background: dayCheckIn.mood >= 4 ? '#22c55e' : dayCheckIn.mood >= 3 ? '#eab308' : '#ef4444',
                    } : {}}
                  />
                  <span className={styles.weekDotLabel}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {peakHours && peakHours.peak && peakHours.peak.length > 0 && (
        <div className={styles.patternsCard}>
          <h3 className={styles.sectionTitle}>Peak Energy Windows</h3>
          <p className={styles.patternsIntro}>
            Based on your check-ins, here are the times you tend to feel most energized:
          </p>
          <div className={styles.peakList}>
            {peakHours.peak.map((p, i) => (
              <div key={i} className={styles.peakItem}>
                <span className={styles.peakDay}>{p.day}</span>
                <span className={styles.peakTime}>{p.timeRange}</span>
                <span className={styles.peakScore}>{p.avgEnergy}/5</span>
              </div>
            ))}
          </div>
          {peakHours.slots && peakHours.slots.length > 0 && (
            <button
              className={styles.toggleBtn}
              onClick={() => setShowHistory((s) => !s)}
            >
              {showHistory ? 'Hide all slots' : 'Show all slots'}
            </button>
          )}
          {showHistory && peakHours.slots && (
            <div className={styles.allSlots}>
              {peakHours.slots.map((p, i) => (
                <div key={i} className={styles.slotRow}>
                  <span className={styles.slotDay}>{p.day}</span>
                  <span className={styles.slotTime}>{p.timeRange}</span>
                  <div className={styles.slotBar}>
                    <div
                      className={styles.slotFill}
                      style={{ width: `${(p.avgEnergy / 5) * 100}%` }}
                    />
                  </div>
                  <span className={styles.slotScore}>{p.avgEnergy}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {patterns && patterns.correlation && (
        <div className={styles.insightCard}>
          <h3 className={styles.sectionTitle}>Study × Wellbeing Insight</h3>
          <p className={styles.insightText}>{patterns.correlation.insight}</p>
          <div className={styles.corrGrid}>
            <div className={styles.corrStat}>
              <span className={styles.corrValue}>{patterns.correlation.highEnergyAvgMinutes}m</span>
              <span className={styles.corrLabel}>Avg study on high-energy days</span>
            </div>
            <div className={styles.corrStat}>
              <span className={styles.corrValue}>{patterns.correlation.lowEnergyAvgMinutes}m</span>
              <span className={styles.corrLabel}>Avg study on low-energy days</span>
            </div>
          </div>
        </div>
      )}

      {checkIns.length > 0 && (
        <div className={styles.historySection}>
          <h3 className={styles.sectionTitle}>Recent History</h3>
          <div className={styles.historyList}>
            {[...checkIns].reverse().slice(0, 14).map((c, i) => {
              const d = new Date(c.date || c.createdAt);
              const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={i} className={styles.historyItem}>
                  <span className={styles.historyDate}>{dateStr}</span>
                  <span className={styles.historyMood} style={{ color: MOODS[(c.mood || 3) - 1]?.color }}>
                    Mood: {c.mood}/5
                  </span>
                  <span className={styles.historyEnergy} style={{ color: ENERGIES[(c.energy || 3) - 1]?.color }}>
                    Energy: {c.energy}/5
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
