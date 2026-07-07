import React, { useEffect, useMemo, useRef, useState } from 'react';
import { computeSemesterWrapped, generateShareText, getSemesterLabel } from '../utils/semesterWrapped';
import styles from './SemesterWrapped.module.css';

const CARD_COLORS = {
  bronze: { from: '#1a0a00', to: '#3d1f00', accent: '#cd7f32' },
  silver: { from: '#0f172a', to: '#1e293b', accent: '#a0aec0' },
  gold: { from: '#1a1200', to: '#3d2e00', accent: '#f59e0b' },
  'crimson-elite': { from: '#1a0000', to: '#3d0000', accent: '#dc2626' },
};

const STATS = [
  { key: 'cgpa', icon: '📊', label: 'CGPA' },
  { key: 'study', icon: '📚', label: 'Study Hours' },
  { key: 'tasks', icon: '✅', label: 'Tasks Done' },
  { key: 'finance', icon: '💰', label: 'Saved' },
  { key: 'wellbeing', icon: '😊', label: 'Check-Ins' },
  { key: 'streak', icon: '🔥', label: 'Best Streak' },
];

function AnimatedCounter({ value, suffix = '', prefix = '', decimals = 0, duration = 1500 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const num = Number(value) || 0;
    const startTime = Date.now();
    let raf;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(num * eased);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}

function StatReveal({ children, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return <div className={`${styles.statReveal} ${visible ? styles.statVisible : ''}`}>{children}</div>;
}

export default function SemesterWrapped({ activeUserId }) {
  const [wrapped, setWrapped] = useState(null);
  const [step, setStep] = useState('loading');
  const [shared, setShared] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!activeUserId) return;
    const result = computeSemesterWrapped(activeUserId);
    if (!result) {
      setStep('empty');
      return;
    }
    setWrapped(result);
    const t = setTimeout(() => setStep('reveal'), 600);
    return () => clearTimeout(t);
  }, [activeUserId]);

  const handleShare = async () => {
    if (!wrapped) return;
    const text = generateShareText(wrapped);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Crymson Wrapped', text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch {}
    }
  };

  const colors = wrapped ? CARD_COLORS[wrapped.score.tier.id] || CARD_COLORS.silver : CARD_COLORS.silver;
  const displayStats = useMemo(() => {
    if (!wrapped) return [];
    return [
      { key: 'cgpa', value: wrapped.cgpa.current !== null ? wrapped.cgpa.current.toFixed(2) : '—', suffix: '' },
      { key: 'study', value: wrapped.study.totalHours, suffix: 'h' },
      { key: 'tasks', value: wrapped.tasks.rate, suffix: '%' },
      { key: 'finance', value: wrapped.finance.netSavings > 0 ? formatShort(wrapped.finance.netSavings) : '₦0', suffix: '' },
      { key: 'wellbeing', value: wrapped.wellbeing.totalCheckIns, suffix: '' },
      { key: 'streak', value: wrapped.study.bestStreak, suffix: 'd' },
    ];
  }, [wrapped]);

  if (step === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <p>Crunching your semester...</p>
        </div>
      </div>
    );
  }

  if (step === 'empty' || !wrapped) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🎓</span>
          <h2 className={styles.emptyTitle}>No Semester Data Yet</h2>
          <p className={styles.emptyText}>Start using Crymson tools to track your courses, study time, and habits. Your Wrapped will appear here at the end of the semester.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Crymson Wrapped</p>
        <h1 className={styles.title}>Your Semester in Review</h1>
        <p className={styles.subtitle}>{getSemesterLabel(wrapped.semesterNumber, wrapped.totalSemesters)}</p>
      </header>

      <div className={styles.cardWrapper} ref={cardRef}>
        <div className={styles.card} style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
          <div className={styles.cardGlow} style={{ background: `radial-gradient(ellipse at 50% 0%, ${colors.accent}22, transparent 70%)` }} />

          <div className={styles.cardHeader}>
            <span className={styles.cardBrand}>Crymson</span>
            <span className={styles.cardLabel}>Wrapped</span>
          </div>

          <div className={styles.cardTitleBlock}>
            <h2 className={styles.cardTitle}>{wrapped.semesterLabel}</h2>
            <p className={styles.cardSubtitle}>{getSemesterLabel(wrapped.semesterNumber, wrapped.totalSemesters)}</p>
          </div>

          {wrapped.cgpaMovement.change !== null && (
            <StatReveal delay={200}>
              <div className={styles.cgpaRow}>
                <span className={styles.cgpaFrom}>{wrapped.cgpaMovement.from.toFixed(2)}</span>
                <span className={styles.cgpaArrow}>→</span>
                <span className={styles.cgpaTo} style={{ color: colors.accent }}>{wrapped.cgpaMovement.to.toFixed(2)}</span>
                <span className={`${styles.cgpaChange} ${wrapped.cgpaMovement.change >= 0 ? styles.changeUp : styles.changeDown}`}>
                  {wrapped.cgpaMovement.change >= 0 ? '+' : ''}{wrapped.cgpaMovement.change.toFixed(2)}
                </span>
              </div>
            </StatReveal>
          )}

          <div className={styles.divider} style={{ background: colors.accent }} />

          {wrapped.topCourse && (
            <StatReveal delay={400}>
              <div className={styles.highlight}>
                <span className={styles.highlightIcon}>🏆</span>
                <span>Top course: <strong>{wrapped.topCourse.name}</strong> — {wrapped.topCourse.hours}h studied</span>
              </div>
            </StatReveal>
          )}

          {wrapped.mostProductiveWeek && (
            <StatReveal delay={600}>
              <div className={styles.highlight}>
                <span className={styles.highlightIcon}>⚡</span>
                <span>Most productive: <strong>Week {wrapped.mostProductiveWeek.weekNumber}</strong> — {wrapped.mostProductiveWeek.hours}h</span>
              </div>
            </StatReveal>
          )}

          <div className={styles.statsGrid}>
            {displayStats.map((stat, i) => (
              <StatReveal key={stat.key} delay={800 + i * 150}>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}>{STATS.find((s) => s.key === stat.key)?.icon}</span>
                  <span className={styles.statValue}>
                    <AnimatedCounter value={typeof stat.value === 'string' ? parseFloat(stat.value) || 0 : stat.value} suffix={stat.suffix} decimals={typeof stat.value === 'string' && stat.value.includes('.') ? 2 : 0} />
                  </span>
                  <span className={styles.statLabel}>{STATS.find((s) => s.key === stat.key)?.label}</span>
                </div>
              </StatReveal>
            ))}
          </div>

          <StatReveal delay={2000}>
            <div className={styles.scoreRow}>
              <div className={styles.scoreBadge} style={{ borderColor: colors.accent, color: colors.accent }}>
                {wrapped.score.total}
              </div>
              <div className={styles.scoreInfo}>
                <span className={styles.scoreLabel}>Crymson Score</span>
                <span className={styles.scoreTier} style={{ color: colors.accent }}>{wrapped.score.tier.label}</span>
              </div>
            </div>
          </StatReveal>

          {wrapped.semesterHistory.length > 1 && (
            <StatReveal delay={2200}>
              <div className={styles.historyStrip}>
                <span className={styles.historyStripLabel}>CGPA Journey</span>
                <div className={styles.historyDots}>
                  {wrapped.semesterHistory.map((h) => (
                    <div key={h.semester} className={styles.historyDotWrap}>
                      <div
                        className={`${styles.historyDot} ${h.semester === wrapped.semesterNumber ? styles.historyDotCurrent : ''}`}
                        style={h.semester === wrapped.semesterNumber ? { borderColor: colors.accent } : {}}
                      />
                      <span className={styles.historyDotLabel}>S{h.semester}</span>
                    </div>
                  ))}
                </div>
              </div>
            </StatReveal>
          )}
        </div>

        <div className={styles.cardActions}>
          <button className={styles.shareBtn} onClick={handleShare} style={{ background: colors.accent }}>
            {shared ? 'Copied!' : 'Share Wrapped'}
          </button>
          <button className={styles.regenerateBtn} onClick={() => { setStep('loading'); setWrapped(null); setTimeout(() => setStep('reveal'), 100); }}>
            Replay
          </button>
        </div>
      </div>

      {wrapped.courseBreakdown.length > 1 && (
        <div className={styles.courseBreakdown}>
          <h3 className={styles.sectionTitle}>Course Breakdown</h3>
          <div className={styles.courseList}>
            {wrapped.courseBreakdown.map((c, i) => {
              const maxHours = wrapped.courseBreakdown[0].hours || 1;
              const pct = Math.max(5, (c.hours / maxHours) * 100);
              return (
                <div key={c.name} className={styles.courseRow}>
                  <span className={styles.courseRank}>#{i + 1}</span>
                  <span className={styles.courseName}>{c.name}</span>
                  <div className={styles.courseBar}>
                    <div className={styles.courseFill} style={{ width: `${pct}%`, background: i === 0 ? `linear-gradient(90deg, ${colors.accent}, ${colors.accent}88)` : undefined }} />
                  </div>
                  <span className={styles.courseHours}>{c.hours}h</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {wrapped.semesterHistory.length > 1 && (
        <div className={styles.historySection}>
          <h3 className={styles.sectionTitle}>CGPA Across Semesters</h3>
          <div className={styles.historyChart}>
            {wrapped.semesterHistory.map((h, i) => {
              const pct = Math.max(5, (h.cgpa / 5) * 100);
              return (
                <div key={h.semester} className={styles.chartBarWrap}>
                  <div className={styles.chartBar} style={{ height: `${pct}%` }} />
                  <span className={styles.chartValue}>{h.cgpa.toFixed(2)}</span>
                  <span className={styles.chartLabel}>S{h.semester}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatShort(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₦0';
  if (n >= 1000000) return `₦${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₦${(n / 1000).toFixed(1)}k`;
  return `₦${Math.round(n)}`;
}
