import { formatClock, toLocalDateKey, getStudyStreakStats } from './timeFormatting';

test('formatClock normalizes and formats seconds', () => {
  expect(formatClock(3661)).toBe('01:01:01');
  expect(formatClock(-20)).toBe('00:00:00');
  expect(formatClock('invalid')).toBe('00:00:00');
});

test('toLocalDateKey returns YYYY-MM-DD or null for invalid dates', () => {
  expect(toLocalDateKey(new Date(2026, 3, 23, 10, 30))).toBe('2026-04-23');
  expect(toLocalDateKey('not-a-date')).toBeNull();
});

test('getStudyStreakStats computes active and streak values', () => {
  const sessions = [
    { durationSeconds: 1200, startedAt: new Date(2026, 3, 21, 9, 0) },
    { durationSeconds: 1800, startedAt: new Date(2026, 3, 22, 11, 0) },
    { durationSeconds: 2400, startedAt: new Date(2026, 3, 23, 14, 0) },
    { durationSeconds: 0, startedAt: new Date(2026, 3, 23, 16, 0) }
  ];

  const stats = getStudyStreakStats(sessions, new Date(2026, 3, 23, 20, 0));

  expect(stats.currentStreakDays).toBe(3);
  expect(stats.bestStreakDays).toBe(3);
  expect(stats.activeDays).toBe(3);
  expect(stats.lastStudyDateKey).toBe('2026-04-23');
});
