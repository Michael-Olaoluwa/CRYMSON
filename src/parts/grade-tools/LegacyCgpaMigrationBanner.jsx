import React, { useMemo, useState } from 'react';
import apiClient from '../../utils/apiClient';

const CGPA_TRACKER_STATE_KEY = 'crymson_cgpa_tracker_state_v1';

function getGradePoint(score) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return null;
  if (numericScore >= 70) return 5;
  if (numericScore >= 60) return 4;
  if (numericScore >= 50) return 3;
  if (numericScore >= 45) return 2;
  if (numericScore >= 40) return 1;
  return 0;
}

function resolveClassification(value) {
  if (value >= 4.5) return 'First Class';
  if (value >= 3.5) return 'Second Class Upper';
  if (value >= 2.4) return 'Second Class Lower';
  if (value >= 1.5) return 'Third Class';
  if (value > 0) return 'Pass';
  return null;
}

function distributeScore(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return { test1Score: '', test2Score: '', examScore: '' };
  const test1 = Math.min(15, Math.round(s * 0.15));
  const test2 = Math.min(15, Math.round(s * 0.15));
  const exam = Math.max(0, Math.min(70, s - test1 - test2));
  return {
    test1Score: String(test1),
    test2Score: String(test2),
    examScore: String(exam),
  };
}

function buildMigrationPayload() {
  const raw = localStorage.getItem(CGPA_TRACKER_STATE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return {
    data: {
      cgpaState: {
        courses: (parsed.courses || []).map((c) => ({
          id: c.id,
          courseName: String(c.courseName || ''),
          creditUnits: String(c.creditUnits || ''),
          ...distributeScore(c.score),
          score: String(c.score || ''),
        })),
        nextId: Number.isInteger(parsed.nextId) ? parsed.nextId : 2,
        goalCgpa: '',
        remainingUnits: '',
        cgpa: Number.isFinite(parsed.cgpa) ? parsed.cgpa : null,
        classification: typeof parsed.classification === 'string' ? parsed.classification : null,
        showDashboardCard: true,
        showDashboardClassification: true,
        onboardingCompleted: true,
        currentSemester: 1,
        totalSemesters: 8,
        previousSemesters: [],
      },
    },
  };
}

function computeCgpa(allCourses) {
  let totalUnits = 0;
  let totalWeighted = 0;
  (allCourses || []).forEach((c) => {
    const units = Number(c.creditUnits);
    if (!Number.isFinite(units) || units <= 0) return;
    const t1 = Number(c.test1Score);
    const t2 = Number(c.test2Score);
    const exam = Number(c.examScore);
    const finalScore = Number.isFinite(t1) && Number.isFinite(t2) && Number.isFinite(exam)
      ? t1 + t2 + exam
      : Number(c.score);
    const gp = getGradePoint(finalScore);
    if (gp === null) return;
    totalUnits += units;
    totalWeighted += units * gp;
  });
  const cgpa = totalUnits > 0 ? totalWeighted / totalUnits : null;
  const classification = cgpa !== null ? resolveClassification(cgpa) : null;
  return { cgpa, classification };
}

function LegacyCgpaMigrationBanner() {
  const [migrationStatus, setMigrationStatus] = useState('idle');
  const [migrationError, setMigrationError] = useState('');

  const hasLocalData = useMemo(() => {
    const raw = localStorage.getItem(CGPA_TRACKER_STATE_KEY);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.courses) && parsed.courses.length > 0;
    } catch { return false; }
  }, []);

  const handleMigrate = async () => {
    const localPayload = buildMigrationPayload();
    if (!localPayload) return;
    setMigrationStatus('sending');
    setMigrationError('');
    try {
      let cloudState = null;
      try {
        const { data } = await apiClient.get('/api/user-state/cgpa');
        cloudState = data.state;
      } catch {}

      const cloudCourses = cloudState?.courses || [];
      const maxCloudId = cloudCourses.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0);
      const migratedCourses = (localPayload.data.cgpaState.courses || []).map((c, i) => ({
        ...c,
        id: maxCloudId + i + 1,
      }));

      const mergedCourses = [...cloudCourses, ...migratedCourses];
      const { cgpa: mergedCgpa, classification: mergedClassification } = computeCgpa(mergedCourses);

      const mergedState = {
        ...cloudState,
        courses: mergedCourses,
        cgpa: mergedCgpa,
        classification: mergedClassification,
        onboardingCompleted: true,
        showDashboardCard: true,
        showDashboardClassification: true,
      };

      await apiClient.put('/api/user-state/all', { data: { cgpaState: mergedState } });
      localStorage.removeItem(CGPA_TRACKER_STATE_KEY);
      setMigrationStatus('done');
    } catch (err) {
      setMigrationError(err.message || 'Migration failed. Try again.');
      setMigrationStatus('error');
    }
  };

  const previewPayload = migrationStatus === 'preview' ? buildMigrationPayload() : null;

  if (!hasLocalData || migrationStatus === 'done') return null;

  return (
    <div style={{
      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 8, padding: '16px 20px', marginBottom: 16,
    }}>
      <p style={{ margin: '0 0 8px', color: '#f59e0b', fontWeight: 600 }}>
        Legacy local data found
      </p>
      <p style={{ margin: '0 0 12px', color: '#ccc', fontSize: 14 }}>
        This calculator isn't connected to your account. Migrate your saved grades
        to your synced CGPA Tracker?
      </p>
      {migrationStatus === 'preview' && previewPayload && (
        <pre style={{
          background: '#1a1a2e', color: '#a78bfa', padding: 12, borderRadius: 6,
          fontSize: 12, marginBottom: 12, overflowX: 'auto',
        }}>
{JSON.stringify(previewPayload, null, 2)}
        </pre>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        {migrationStatus === 'preview' ? (
          <>
            <button onClick={() => setMigrationStatus('idle')}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #555', background: 'transparent', color: '#ccc', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleMigrate}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#000', cursor: 'pointer', fontWeight: 600 }}>
              Confirm Migration
            </button>
          </>
        ) : (
          <button onClick={() => setMigrationStatus('preview')}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#000', cursor: 'pointer', fontWeight: 600 }}>
            {migrationStatus === 'sending' ? 'Migrating...' : 'Migrate Grades'}
          </button>
        )}
      </div>
      {migrationError && (
        <p style={{ margin: '8px 0 0', color: '#f87171', fontSize: 13 }}>{migrationError}</p>
      )}
    </div>
  );
}

export default LegacyCgpaMigrationBanner;
