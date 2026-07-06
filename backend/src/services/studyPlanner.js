const WEEK_SECONDS = 7 * 24 * 3600;

function getRecommendedWeeklySeconds(creditUnits) {
  return Number(creditUnits) * 3 * 3600;
}

function getTotalSecondsThisWeek(sessions, courseTag) {
  const now = Date.now();
  const oneWeekAgo = now - WEEK_SECONDS * 1000;
  return sessions
    .filter((s) => {
      const t = new Date(s.startTime || s.createdAt || now).getTime();
      return String(s.courseTag || "").trim().toUpperCase() === courseTag && t >= oneWeekAgo;
    })
    .reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
}

function getUpcomingTaskDate(tasks, courseTag) {
  const now = new Date();
  let nearest = null;
  for (const t of tasks) {
    if (t.completed) continue;
    if (String(t.courseTag || "").trim().toUpperCase() !== courseTag) continue;
    if (!t.dueAt && !t.dueAtTime) continue;
    const d = new Date(t.dueAt || t.dueAtTime);
    if (d < now) continue;
    if (!nearest || d < nearest) nearest = d;
  }
  return nearest;
}

function computePriorityScore(courseTag, tasks, sessions, creditUnits) {
  const recommended = getRecommendedWeeklySeconds(creditUnits);
  const actual = getTotalSecondsThisWeek(sessions, courseTag.toUpperCase());
  const deficit = Math.max(0, recommended - actual);
  const nextDue = getUpcomingTaskDate(tasks, courseTag.toUpperCase());
  let daysUntilDue = 14;
  if (nextDue) {
    daysUntilDue = Math.max(0.5, (nextDue.getTime() - Date.now()) / (86400000));
  }
  const proximityWeight = Math.max(0.1, 14 - daysUntilDue) / 14;
  const deficitHours = deficit / 3600;
  const deficitWeight = Math.min(1, deficitHours / 6);
  const score = proximityWeight * 0.6 + deficitWeight * 0.4;
  return { score: Math.round(score * 100) / 100, deficitHours: Math.round(deficitHours * 10) / 10, daysUntilDue: Math.round(daysUntilDue * 10) / 10, recommended: Math.round(recommended / 3600 * 10) / 10, actual: Math.round(actual / 3600 * 10) / 10 };
}

function generateFreeBlocks(daysAhead = 7) {
  const blocks = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const weekdaySlots = [
    { start: 8, end: 9.5 },
    { start: 10, end: 11.5 },
    { start: 13, end: 14.5 },
    { start: 16, end: 17.5 },
    { start: 19, end: 20.5 },
  ];
  const weekendSlots = [
    { start: 10, end: 11.5 },
    { start: 13, end: 14.5 },
    { start: 15, end: 16.5 },
    { start: 18, end: 19.5 },
  ];

  for (let day = 0; day < daysAhead; day++) {
    const d = new Date(today);
    d.setDate(d.getDate() + day);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const slots = isWeekend ? weekendSlots : weekdaySlots;
    const dateStr = d.toISOString().slice(0, 10);

    for (const slot of slots) {
      const blockStart = new Date(d);
      blockStart.setHours(Math.floor(slot.start), (slot.start % 1) * 60, 0, 0);
      if (blockStart <= now) continue;
      const durationMinutes = Math.round((slot.end - slot.start) * 60);
      blocks.push({
        date: dateStr,
        startHour: slot.start,
        endHour: slot.end,
        startTime: `${String(Math.floor(slot.start)).padStart(2, "0")}:${String((slot.start % 1) * 60).padStart(2, "0")}`,
        endTime: `${String(Math.floor(slot.end)).padStart(2, "0")}:${String((slot.end % 1) * 60).padStart(2, "0")}`,
        durationMinutes,
      });
    }
  }
  return blocks;
}

function generateSchedule(courses, tasks, sessions, cgpaState) {
  const courseMap = {};
  const cgpaCourses = cgpaState?.courses || [];
  const cgpaByCourse = {};
  for (const c of cgpaCourses) {
    const name = String(c.courseName || "").trim().toUpperCase();
    if (name) cgpaByCourse[name] = c;
  }

  const allCourseTags = new Set();
  tasks.forEach((t) => {
    const tag = String(t.courseTag || "").trim().toUpperCase();
    if (tag) allCourseTags.add(tag);
  });
  sessions.forEach((s) => {
    const tag = String(s.courseTag || "").trim().toUpperCase();
    if (tag && tag !== "GENERAL STUDY") allCourseTags.add(tag);
  });

  const priorities = [];
  for (const courseTag of allCourseTags) {
    const cgpa = cgpaByCourse[courseTag];
    const creditUnits = cgpa ? Number(cgpa.creditUnits) || 3 : 3;
    const score = cgpa ? Number(cgpa.score) : null;
    const isBehind = score !== null && score < 50;
    const p = computePriorityScore(courseTag, tasks, sessions, creditUnits);
    priorities.push({
      courseTag,
      creditUnits,
      cgpaScore: score,
      isBehind,
      priorityScore: p.score,
      deficitHours: p.deficitHours,
      daysUntilDue: p.daysUntilDue,
      recommendedHours: p.recommended,
      actualHours: p.actual,
    });
  }

  priorities.sort((a, b) => {
    if (a.isBehind && !b.isBehind) return -1;
    if (!a.isBehind && b.isBehind) return 1;
    return b.priorityScore - a.priorityScore;
  });

  const freeBlocks = generateFreeBlocks(7);
  const recommendations = [];
  const blocksPerCourse = Math.ceil(freeBlocks.length / Math.max(1, priorities.length));
  let blockIndex = 0;

  for (const p of priorities) {
    if (blockIndex >= freeBlocks.length) break;
    if (p.deficitHours <= 0 && p.daysUntilDue > 7) continue;
    const numBlocks = Math.min(blocksPerCourse, freeBlocks.length - blockIndex);
    for (let i = 0; i < numBlocks && blockIndex < freeBlocks.length; i++) {
      const block = freeBlocks[blockIndex];
      blockIndex++;

      let reason;
      if (p.daysUntilDue <= 3) {
        reason = `${p.courseTag} has a deadline in ${p.daysUntilDue} day${p.daysUntilDue === 1 ? "" : "s"}.`;
      } else if (p.deficitHours > 2) {
        reason = `You've only studied ${p.actualHours}h of ${p.recommendedHours}h recommended for ${p.courseTag} this week.`;
      } else if (p.isBehind) {
        reason = `${p.courseTag} score (${p.cgpaScore}) is below 50%. Needs attention.`;
      } else {
        reason = `Keep up with ${p.courseTag} — ${p.actualHours}h studied of ${p.recommendedHours}h goal.`;
      }

      recommendations.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        courseTag: p.courseTag,
        creditUnits: p.creditUnits,
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
        durationMinutes: block.durationMinutes,
        reason,
        priority: p.priorityScore >= 0.7 ? "high" : p.priorityScore >= 0.4 ? "medium" : "low",
        approved: false,
        declined: false,
        completed: false,
        checkIn: null,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    generatedForDay: new Date().toISOString().slice(0, 10),
    weekStart: new Date().toISOString().slice(0, 10),
    coursePriorities: priorities.map((p) => ({
      courseTag: p.courseTag,
      creditUnits: p.creditUnits,
      cgpaScore: p.cgpaScore,
      priorityScore: p.priorityScore,
      deficitHours: p.deficitHours,
      daysUntilDue: p.daysUntilDue,
      recommendedHours: p.recommendedHours,
      actualHours: p.actualHours,
      isBehind: p.isBehind,
    })),
    recommendations,
  };
}

function computeCheckInStats(checkIns) {
  const total = checkIns.length;
  const studied = checkIns.filter((c) => c.studied).length;
  const totalMinutes = checkIns.reduce((s, c) => s + (Number(c.minutesStudied) || 0), 0);
  return { total, studied, skipped: total - studied, totalMinutes };
}

module.exports = { generateSchedule, computePriorityScore, computeCheckInStats };
