import React from 'react';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const FireIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M12 23a8 8 0 0 0 8-8c0-3.5-2-6.5-4-8 0 2-1 4-3 4s-3-2-3-4c-2 1.5-4 4.5-4 8a8 8 0 0 0 8 8z" />
    <path d="M12 19a3 3 0 0 0 3-3c0-1.3-.8-2.4-1.5-3-.4.8-1 1.5-1.5 1.5s-1.1-.7-1.5-1.5C9.8 13.6 9 14.7 9 16a3 3 0 0 0 3 3z" />
  </svg>
);

export const SparklesIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />
    <path d="M18 14l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5z" />
    <path d="M7 5l.5 1.5L9 7l-1.5.5L7 9l-.5-1.5L5 7l1.5-.5z" />
  </svg>
);

export const TargetIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const CheckIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const BookIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

export const ClipboardIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);

export const TrophyIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M6 5h12v6a6 6 0 0 1-12 0z" />
    <path d="M12 15v4" />
    <path d="M8 21h8" />
  </svg>
);

export const MoneyIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <ellipse cx="12" cy="6" rx="10" ry="4" />
    <path d="M2 6v12c0 2.2 4.5 4 10 4s10-1.8 10-4V6" />
    <path d="M2 12c0 2.2 4.5 4 10 4s10-1.8 10-4" />
    <line x1="12" y1="1" x2="12" y2="23" />
  </svg>
);

export const RocketIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <circle cx="17" cy="7" r="1" />
  </svg>
);

export const PartyIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
    <line x1="8" y1="12" x2="12" y2="12" />
  </svg>
);

export const CrownIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M2 4l3 12h14l3-12-6 5-5-7-5 7z" />
    <path d="M5 20h14" />
  </svg>
);

export const LightningIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
  </svg>
);

export const SunriseIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <circle cx="12" cy="10" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="19.07" y1="4.93" x2="17.66" y2="6.34" />
    <line x1="12" y1="18" x2="12" y2="20" />
    <polyline points="8 22 12 18 16 22" />
  </svg>
);

export const MoonIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const ChartIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

export const StarIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const GraduationIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 1.66 2.7 3 6 3s6-1.34 6-3v-5" />
  </svg>
);

export const CheckCircleIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export const StopwatchIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5" />
    <line x1="12" y1="1" x2="12" y2="5" />
    <line x1="5" y1="5" x2="7" y2="7" />
    <line x1="19" y1="5" x2="17" y2="7" />
  </svg>
);

export const CreditCardIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
    <line x1="5" y1="14" x2="8" y2="14" />
    <line x1="12" y1="14" x2="15" y2="14" />
  </svg>
);

export const UsersIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const WaveIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M7 10v4c0 2.76 2.24 5 5 5s5-2.24 5-5v-4" />
    <path d="M5 10a3 3 0 0 1 6 0" />
    <path d="M13 10a3 3 0 0 1 6 0" />
    <path d="M12 19v3" />
    <line x1="9" y1="22" x2="15" y2="22" />
  </svg>
);

export const CalmIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="8" y1="15" x2="16" y2="15" />
    <line x1="8" y1="9" x2="10" y2="9" />
    <line x1="14" y1="9" x2="16" y2="9" />
  </svg>
);

export const ExhaleIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="8" cy="15" r="2" fill="currentColor" />
    <circle cx="16" cy="15" r="2" fill="currentColor" />
    <path d="M12 10v-1" />
    <path d="M8 12l-2-1" />
    <path d="M16 12l2-1" />
  </svg>
);

export const BarChartIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

export const NoteIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const RefreshIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const GearIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const PlusIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const DownloadIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const TrashIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export const LightbulbIcon = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...s} {...props}>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

export const iconMap = {
  fire: FireIcon,
  sparkles: SparklesIcon,
  target: TargetIcon,
  check: CheckIcon,
  book: BookIcon,
  clipboard: ClipboardIcon,
  trophy: TrophyIcon,
  money: MoneyIcon,
  rocket: RocketIcon,
  party: PartyIcon,
  crown: CrownIcon,
  lightning: LightningIcon,
  sunrise: SunriseIcon,
  moon: MoonIcon,
  chart: ChartIcon,
  star: StarIcon,
  graduation: GraduationIcon,
  checkCircle: CheckCircleIcon,
  stopwatch: StopwatchIcon,
  creditCard: CreditCardIcon,
  users: UsersIcon,
  wave: WaveIcon,
  calm: CalmIcon,
  exhale: ExhaleIcon,
  barChart: BarChartIcon,
  note: NoteIcon,
  refresh: RefreshIcon,
  gear: GearIcon,
  plus: PlusIcon,
  download: DownloadIcon,
  trash: TrashIcon,
  lightbulb: LightbulbIcon,
};
