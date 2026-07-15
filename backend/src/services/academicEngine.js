/**
 * Academic Calculation Engine — Backend Copy
 *
 * Frontend has an independent ESM copy at src/utils/academicEngine.js.
 * CRA's ModuleScopePlugin prevents sharing executable code directly.
 * Parity is enforced by shared fixtures: shared/academic-fixtures.js
 * Run parity tests to verify both engines return identical results.
 *
 * Grading Scale (Nigerian 5.0):
 *   >= 70 → A (5)
 *   >= 60 → B (4)
 *   >= 50 → C (3)
 *   >= 45 → D (2)
 *   >= 40 → E (1)
 *   <  40 → F (0)
 *
 * Classification:
 *   >= 4.5 → First Class
 *   >= 3.5 → Second Class Upper
 *   >= 2.4 → Second Class Lower
 *   >= 1.5 → Third Class
 *   >  0   → Pass
 *   0/null → null
 */

/* ── Constants ──────────────────────────────────────────── */

const GRADE_SCALE = [
  { min: 70, grade: 'A', point: 5 },
  { min: 60, grade: 'B', point: 4 },
  { min: 50, grade: 'C', point: 3 },
  { min: 45, grade: 'D', point: 2 },
  { min: 40, grade: 'E', point: 1 },
  { min: 0,  grade: 'F', point: 0 },
];

const CLASSIFICATION_SCALE = [
  { min: 4.5, label: 'First Class' },
  { min: 3.5, label: 'Second Class Upper' },
  { min: 2.4, label: 'Second Class Lower' },
  { min: 1.5, label: 'Third Class' },
  { min: 0,   label: 'Pass' },
];

const MAX_GRADE_POINT = 5;
const TYPICAL_SEMESTER_UNITS = 18;

/* ── Helpers ────────────────────────────────────────────── */

function toNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/* ── Core Conversions ───────────────────────────────────── */

/**
 * Convert a total score (0-100) to a grade point (0-5).
 * Returns null for non-numeric input.
 */
function getGradePoint(score) {
  const n = toNum(score, NaN);
  if (!Number.isFinite(n)) return null;
  for (const entry of GRADE_SCALE) {
    if (n >= entry.min) return entry.point;
  }
  return 0;
}

/**
 * Convert a total score (0-100) to a letter grade ('A'-'F').
 * Returns null for non-numeric input.
 */
function getGradeLabel(score) {
  const n = toNum(score, NaN);
  if (!Number.isFinite(n)) return null;
  for (const entry of GRADE_SCALE) {
    if (n >= entry.min) return entry.grade;
  }
  return 'F';
}

/**
 * Convert a grade point (0-5) to a classification string.
 * Returns null for non-numeric, zero, or out-of-range values.
 */
function resolveClassification(cgpa) {
  const n = toNum(cgpa, NaN);
  if (!Number.isFinite(n) || n <= 0) return null;
  for (const entry of CLASSIFICATION_SCALE) {
    if (n >= entry.min) return entry.label;
  }
  return null;
}

/**
 * Get the full grade scale for UI display.
 */
function getGradeScale() {
  return GRADE_SCALE.map((e, i) => ({
    min: e.min,
    max: i === 0 ? 100 : GRADE_SCALE[i - 1].min - 1,
    grade: e.grade,
    point: e.point,
  }));
}

/* ── Course Score Computation ───────────────────────────── */

/**
 * Compute the final total score for a course.
 *
 * Handles two data models:
 *   - Legacy: course.score (single combined score)
 *   - Current: course.test1Score + course.test2Score + course.examScore
 *
 * Returns null if insufficient data to compute.
 * A score of 0 is valid (student scored zero).
 * An empty string or missing field means "not entered" (returns null).
 */
function calcFinalScore(course) {
  if (!course || typeof course !== 'object') return null;

  const direct = toNum(course.score, NaN);
  if (Number.isFinite(direct)) return direct;

  const t1 = toNum(course.test1Score, NaN);
  const t2 = toNum(course.test2Score, NaN);
  const exam = toNum(course.examScore, NaN);

  if (!Number.isFinite(t1) || !Number.isFinite(t2) || !Number.isFinite(exam)) {
    return null;
  }

  return t1 + t2 + exam;
}

/**
 * Compute grade point for a course.
 * Returns null if course lacks sufficient data.
 */
function calcCourseGradePoint(course) {
  const score = calcFinalScore(course);
  return getGradePoint(score);
}

/**
 * Compute weighted quality points for a course (creditUnits * gradePoint).
 * Returns null if course lacks sufficient data.
 */
function calcCourseWeightedPoints(course) {
  const units = toNum(course?.creditUnits, NaN);
  const gp = calcCourseGradePoint(course);
  if (!Number.isFinite(units) || units <= 0 || gp === null) return null;
  return units * gp;
}

/* ── Semester GPA ───────────────────────────────────────── */

/**
 * Calculate semester GPA from an array of courses.
 *
 * Only includes courses with:
 *   - Valid positive credit units
 *   - Sufficient data to compute a final score
 *   - A resulting grade point (which is always 0-5 for valid scores)
 *
 * Courses with empty/missing scores are EXCLUDED (not treated as zero).
 * A score of 0 IS included (student actually scored zero).
 *
 * Returns { gpa, totalUnits, totalWeighted, courseCount, validCourseCount }
 */
function calcSemesterGpa(courses) {
  const courseList = Array.isArray(courses) ? courses : [];
  let totalUnits = 0;
  let totalWeighted = 0;
  let validCourseCount = 0;

  for (const course of courseList) {
    const units = toNum(course?.creditUnits, NaN);
    const gp = calcCourseGradePoint(course);

    if (Number.isFinite(units) && units > 0 && gp !== null) {
      totalUnits += units;
      totalWeighted += units * gp;
      validCourseCount++;
    }
  }

  const gpa = totalUnits > 0 ? totalWeighted / totalUnits : null;

  return {
    gpa,
    totalUnits,
    totalWeighted,
    courseCount: courseList.length,
    validCourseCount,
  };
}

/* ── Cumulative CGPA ────────────────────────────────────── */

/**
 * Calculate cumulative CGPA from cgpaState.
 *
 * Combines:
 *   - Previous semesters (from previousSemesters array)
 *   - Current semester courses (from courses array)
 *
 * IMPORTANT: Previous semesters only store { semester, cgpa } — not credit units.
 * For accurate cumulative CGPA, we approximate past semester credit units as
 * TYPICAL_SEMESTER_UNITS (18) each. This is documented as an approximation.
 *
 * If the user has only one semester, CGPA = semester GPA (exact).
 *
 * Returns { cgpa, totalUnits, totalWeighted, semesterCount, isApproximate }
 */
function calcCumulativeCgpa(cgpaState) {
  if (!cgpaState || typeof cgpaState !== 'object') {
    return { cgpa: null, totalUnits: 0, totalWeighted: 0, semesterCount: 0, isApproximate: false };
  }

  const courses = Array.isArray(cgpaState.courses) ? cgpaState.courses : [];
  const previousSemesters = Array.isArray(cgpaState.previousSemesters) ? cgpaState.previousSemesters : [];

  const currentSemesterResult = calcSemesterGpa(courses);
  const currentUnits = currentSemesterResult.totalUnits;
  const currentWeighted = currentSemesterResult.totalWeighted;

  if (previousSemesters.length === 0) {
    return {
      cgpa: currentSemesterResult.gpa,
      totalUnits: currentUnits,
      totalWeighted: currentWeighted,
      semesterCount: currentUnits > 0 ? 1 : 0,
      isApproximate: false,
    };
  }

  let totalUnits = currentUnits;
  let totalWeighted = currentWeighted;
  let isApproximate = false;

  for (const sem of previousSemesters) {
    const semCgpa = toNum(sem?.cgpa, NaN);
    if (!Number.isFinite(semCgpa) || semCgpa < 0) continue;

    const semUnits = toNum(sem?.totalUnits, NaN);
    if (Number.isFinite(semUnits) && semUnits > 0) {
      totalUnits += semUnits;
      totalWeighted += semUnits * semCgpa;
    } else {
      totalUnits += TYPICAL_SEMESTER_UNITS;
      totalWeighted += TYPICAL_SEMESTER_UNITS * semCgpa;
      isApproximate = true;
    }
  }

  const cgpa = totalUnits > 0 ? totalWeighted / totalUnits : null;

  return {
    cgpa,
    totalUnits,
    totalWeighted,
    semesterCount: previousSemesters.length + (currentUnits > 0 ? 1 : 0),
    isApproximate,
  };
}

/**
 * Simple CGPA calculation from a flat array of courses (no semester history).
 * Used by legacy consumers that only have courses[].
 */
function calcCgpaFromCourses(courses) {
  return calcSemesterGpa(courses);
}

/* ── Exam Score Intelligence ────────────────────────────── */

/**
 * Calculate the exam score required to achieve a desired grade.
 *
 * @param {Object} params
 * @param {number} params.caScore - Continuous assessment total (test1 + test2)
 * @param {number} params.caMax - Maximum CA score (typically 30)
 * @param {number} params.examMax - Maximum exam score (typically 70)
 * @param {number} params.desiredGradePoint - Target grade point (1-5)
 *
 * @returns {Object} { requiredScore, achievable, grade, gradePoint, maximumPossibleScore, reason }
 */
function calcRequiredExamScore({ caScore, caMax, examMax, desiredGradePoint }) {
  const ca = toNum(caScore, NaN);
  const caM = toNum(caMax, 30);
  const examM = toNum(examMax, 70);
  const targetGp = toNum(desiredGradePoint, NaN);

  if (!Number.isFinite(targetGp) || targetGp < 0 || targetGp > MAX_GRADE_POINT) {
    return { requiredScore: null, achievable: false, grade: null, gradePoint: null, maximumPossibleScore: examM, reason: 'Invalid target grade.' };
  }

  const targetGradeEntry = GRADE_SCALE.find((e) => e.point === targetGp);
  const targetMinScore = targetGradeEntry ? targetGradeEntry.min : 0;

  if (!Number.isFinite(ca)) {
    return {
      requiredScore: null,
      achievable: false,
      grade: null,
      gradePoint: null,
      maximumPossibleScore: examM,
      reason: 'Enter your CA score to calculate exam requirements.',
    };
  }

  const requiredTotal = targetMinScore;
  const requiredExam = requiredTotal - ca;

  if (requiredExam <= 0) {
    const achievedGp = getGradePoint(ca);
    const achievedGrade = getGradeLabel(ca);
    return {
      requiredScore: 0,
      achievable: true,
      grade: achievedGrade,
      gradePoint: achievedGp,
      maximumPossibleScore: examM,
      reason: `You have already secured at least a ${achievedGrade} (${achievedGp} GP) based on your CA score alone.`,
    };
  }

  if (requiredExam > examM) {
    const highestPossibleTotal = ca + examM;
    const highestPossibleGp = getGradePoint(highestPossibleTotal);
    const highestPossibleGrade = getGradeLabel(highestPossibleTotal);
    return {
      requiredScore: Math.ceil(requiredExam),
      achievable: false,
      grade: highestPossibleGrade,
      gradePoint: highestPossibleGp,
      maximumPossibleScore: examM,
      reason: `An ${targetGradeEntry?.grade || targetGp + ' GP'} is no longer mathematically possible. Your highest possible grade is ${highestPossibleGrade} (${highestPossibleGp} GP) with a perfect exam score.`,
    };
  }

  return {
    requiredScore: Math.ceil(requiredExam),
    achievable: true,
    grade: targetGradeEntry?.grade || null,
    gradePoint: targetGp,
    maximumPossibleScore: examM,
    reason: `You need ${Math.ceil(requiredExam)}/${examM} in your exam.`,
  };
}

/**
 * Calculate exam requirements for all courses for every achievable grade.
 *
 * @param {Array} courses - Array of course objects
 * @param {Object} options - { examMax: 70, caMax: 30 }
 *
 * @returns {Array} Per-course exam requirements
 */
function getExamRequirements(courses, options = {}) {
  const examMax = toNum(options.examMax, 70);
  const caMax = toNum(options.caMax, 30);

  return courses.map((course) => {
    const t1 = toNum(course?.test1Score, NaN);
    const t2 = toNum(course?.test2Score, NaN);
    const caScore = Number.isFinite(t1) && Number.isFinite(t2) ? t1 + t2 : null;

    const courseName = String(course?.courseName || '').trim() || 'Unnamed course';
    const hasExam = Number.isFinite(toNum(course?.examScore, NaN));
    const finalScore = calcFinalScore(course);
    const currentGp = getGradePoint(finalScore);
    const currentGrade = getGradeLabel(finalScore);

    const gradeRequirements = [5, 4, 3, 2, 1].map((gp) => {
      const result = calcRequiredExamScore({
        caScore: caScore !== null ? caScore : 0,
        caMax,
        examMax,
        desiredGradePoint: gp,
      });
      return {
        gradePoint: gp,
        grade: getGradeLabel((GRADE_SCALE.find((e) => e.point === gp)?.min || 0)),
        requiredScore: result.requiredScore,
        achievable: result.achievable,
        reason: result.reason,
      };
    });

    return {
      courseId: course?.id,
      courseName,
      caScore,
      hasExam,
      finalScore,
      currentGrade,
      currentGradePoint: currentGp,
      gradeRequirements,
      missingCa: caScore === null,
    };
  });
}

/* ── Academic Rescue Mode ───────────────────────────────── */

/**
 * Calculate the semester GPA required to reach a target cumulative CGPA.
 *
 * @param {Object} params
 * @param {number} params.currentCgpa - Current cumulative CGPA
 * @param {number} params.completedUnits - Total credit units completed so far
 * @param {number} params.targetCgpa - Target cumulative CGPA
 * @param {number} params.currentSemesterUnits - Credit units in current semester
 *
 * @returns {Object} { requiredSemesterGpa, achievable, reason, bestPossibleGpa }
 */
function calcRequiredSemesterGpa({ currentCgpa, completedUnits, targetCgpa, currentSemesterUnits }) {
  const current = toNum(currentCgpa, NaN);
  const completed = toNum(completedUnits, NaN);
  const target = toNum(targetCgpa, NaN);
  const currentUnits = toNum(currentSemesterUnits, NaN);

  if (!Number.isFinite(target) || target <= 0) {
    return { requiredSemesterGpa: null, achievable: false, reason: 'No valid target CGPA set.', bestPossibleGpa: MAX_GRADE_POINT };
  }

  if (!Number.isFinite(currentUnits) || currentUnits <= 0) {
    return { requiredSemesterGpa: null, achievable: false, reason: 'No credit units in current semester.', bestPossibleGpa: MAX_GRADE_POINT };
  }

  if (!Number.isFinite(current) || !Number.isFinite(completed) || completed <= 0) {
    return {
      requiredSemesterGpa: target,
      achievable: target <= MAX_GRADE_POINT,
      reason: target <= MAX_GRADE_POINT
        ? `You need approximately a ${target.toFixed(2)} GPA this semester.`
        : 'This target exceeds the maximum possible GPA.',
      bestPossibleGpa: MAX_GRADE_POINT,
    };
  }

  const totalUnits = completed + currentUnits;
  const requiredTotalWeighted = target * totalUnits;
  const completedWeighted = current * completed;
  const requiredCurrentWeighted = requiredTotalWeighted - completedWeighted;
  const requiredSemesterGpa = requiredCurrentWeighted / currentUnits;

  const bestPossibleSemesterGpa = MAX_GRADE_POINT;
  const bestPossibleCgpa = (completedWeighted + bestPossibleSemesterGpa * currentUnits) / totalUnits;

  if (requiredSemesterGpa <= 0) {
    return {
      requiredSemesterGpa: 0,
      achievable: true,
      reason: 'You have already met or exceeded your target CGPA.',
      bestPossibleGpa: bestPossibleSemesterGpa,
    };
  }

  if (requiredSemesterGpa > MAX_GRADE_POINT) {
    return {
      requiredSemesterGpa,
      achievable: false,
      reason: `This target cannot be reached in the current semester alone. You would need a ${requiredSemesterGpa.toFixed(2)} GPA, but the maximum is ${MAX_GRADE_POINT.toFixed(2)}. Best possible projected CGPA: ${bestPossibleCgpa.toFixed(2)}.`,
      bestPossibleGpa: bestPossibleSemesterGpa,
    };
  }

  return {
    requiredSemesterGpa: Math.round(requiredSemesterGpa * 100) / 100,
    achievable: true,
    reason: `You need approximately a ${requiredSemesterGpa.toFixed(2)} GPA this semester to reach your target.`,
    bestPossibleGpa: bestPossibleSemesterGpa,
  };
}

/* ── Course Impact Analysis ─────────────────────────────── */

/**
 * Calculate the academic impact score for a course.
 *
 * Impact is based on:
 *   - Credit unit weight (higher units = more impact)
 *   - Remaining grade opportunity (room to improve)
 *   - Current performance (lower = more urgent)
 *
 * @param {Object} course - Course object
 * @param {number} totalSemesterUnits - Total credit units in the semester
 *
 * @returns {Object} { impact, label, reason }
 */
function calcCourseImpact(course, totalSemesterUnits) {
  const units = toNum(course?.creditUnits, NaN);
  const score = calcFinalScore(course);
  const gp = getGradePoint(score);

  if (!Number.isFinite(units) || units <= 0) {
    return { impact: 0, label: 'No data', reason: 'Enter credit units to assess impact.' };
  }

  const totalUnits = toNum(totalSemesterUnits, 1);
  const unitWeight = units / Math.max(1, totalUnits);

  let performanceFactor = 0.5;
  let remainingOpportunity = 0.5;
  let reasonSuffix = '';

  if (gp !== null) {
    performanceFactor = 1 - (gp / MAX_GRADE_POINT);
    remainingOpportunity = gp < MAX_GRADE_POINT ? (MAX_GRADE_POINT - gp) / MAX_GRADE_POINT : 0;

    if (gp >= 4) {
      reasonSuffix = `${units} credit units; strong performance, limited CGPA impact.`;
    } else if (gp >= 3) {
      reasonSuffix = `${units} credit units; moderate improvement possible.`;
    } else if (gp >= 1) {
      reasonSuffix = `${units} credit units with grade bands still recoverable.`;
    } else {
      reasonSuffix = `${units} credit units; critical — significant CGPA drag.`;
    }
  } else {
    const hasAnyScore = Number.isFinite(toNum(course?.test1Score, NaN)) ||
      Number.isFinite(toNum(course?.test2Score, NaN)) ||
      Number.isFinite(toNum(course?.examScore, NaN));
    if (hasAnyScore) {
      reasonSuffix = `${units} credit units; partial data — complete scoring to assess.`;
    } else {
      reasonSuffix = `${units} credit units; no scores entered yet.`;
    }
  }

  const impact = Math.round((unitWeight * 0.5 + performanceFactor * 0.25 + remainingOpportunity * 0.25) * 100) / 100;

  let label;
  if (impact >= 0.08) label = 'High Impact';
  else if (impact >= 0.04) label = 'Medium Impact';
  else label = 'Lower Impact';

  return { impact, label, reason: reasonSuffix };
}

/**
 * Rank courses by academic impact.
 * Returns courses sorted by impact (highest first) with impact metadata.
 */
function rankCourseImpact(courses) {
  const courseList = Array.isArray(courses) ? courses : [];
  const totalUnits = courseList.reduce((sum, c) => sum + toNum(c?.creditUnits, 0), 0);

  return courseList
    .map((course) => ({
      ...course,
      ...calcCourseImpact(course, totalUnits),
    }))
    .sort((a, b) => (b.impact || 0) - (a.impact || 0));
}

/* ── What-If Simulation ─────────────────────────────────── */

/**
 * Simulate CGPA with hypothetical grades applied to courses.
 *
 * IMPORTANT: This does NOT mutate any real academic data.
 * The caller must manage simulation state separately.
 *
 * @param {Object} cgpaState - Current cgpaState
 * @param {Object} hypotheticalGrades - { [courseId]: gradePoint } or { [courseId]: { gradePoint, score } }
 *
 * @returns {Object} { semesterGpa, cgpa, semesterChange, cgpaChange, targetStatus, courseResults }
 */
function simulateCgpa(cgpaState, hypotheticalGrades = {}) {
  if (!cgpaState || typeof cgpaState !== 'object') {
    return { semesterGpa: null, cgpa: null, semesterChange: null, cgpaChange: null, targetStatus: null, courseResults: [] };
  }

  const courses = Array.isArray(cgpaState.courses) ? cgpaState.courses : [];

  const originalSemester = calcSemesterGpa(courses);
  const originalCumulative = calcCumulativeCgpa(cgpaState);

  const simulatedCourses = courses.map((course) => {
    const hyp = hypotheticalGrades[course.id];
    if (!hyp) return course;

    const hypGp = toNum(typeof hyp === 'object' ? hyp.gradePoint : hyp, NaN);
    if (!Number.isFinite(hypGp)) return course;

    const units = toNum(course.creditUnits, NaN);
    if (!Number.isFinite(units) || units <= 0) return course;

    return {
      ...course,
      _simulated: true,
      _simulatedGradePoint: Math.min(5, Math.max(0, Math.round(hypGp))),
    };
  });

  let simTotalUnits = 0;
  let simTotalWeighted = 0;
  const courseResults = simulatedCourses.map((course) => {
    const units = toNum(course.creditUnits, NaN);
    let gp;
    if (course._simulated) {
      gp = course._simulatedGradePoint;
    } else {
      gp = calcCourseGradePoint(course);
    }

    const originalGp = calcCourseGradePoint(course);
    const changed = course._simulated && gp !== originalGp;

    if (Number.isFinite(units) && units > 0 && gp !== null) {
      simTotalUnits += units;
      simTotalWeighted += units * gp;
    }

    return {
      courseId: course.id,
      courseName: course.courseName,
      creditUnits: units,
      originalGradePoint: originalGp,
      simulatedGradePoint: gp,
      changed,
    };
  });

  const simSemesterGpa = simTotalUnits > 0 ? simTotalWeighted / simTotalUnits : null;

  const simCgpaState = {
    ...cgpaState,
    courses: simulatedCourses,
  };
  const simCumulative = calcCumulativeCgpa(simCgpaState);

  const goalCgpa = toNum(cgpaState.goalCgpa, NaN);
  let targetStatus = null;
  if (Number.isFinite(goalCgpa) && goalCgpa > 0 && simCumulative.cgpa !== null) {
    if (simCumulative.cgpa >= goalCgpa) targetStatus = 'met';
    else targetStatus = 'not-met';
  }

  return {
    semesterGpa: simSemesterGpa,
    cgpa: simCumulative.cgpa,
    semesterChange: simSemesterGpa !== null && originalSemester.gpa !== null
      ? Math.round((simSemesterGpa - originalSemester.gpa) * 100) / 100
      : null,
    cgpaChange: simCumulative.cgpa !== null && originalCumulative.cgpa !== null
      ? Math.round((simCumulative.cgpa - originalCumulative.cgpa) * 100) / 100
      : null,
    targetStatus,
    courseResults,
  };
}

/* ── CGPA Boundary Analysis ─────────────────────────────── */

/**
 * Calculate the best possible CGPA assuming all unresolved courses get perfect scores.
 */
function calcBestPossibleCgpa(cgpaState) {
  if (!cgpaState || typeof cgpaState !== 'object') return null;

  const courses = Array.isArray(cgpaState.courses) ? cgpaState.courses : [];
  const previousSemesters = Array.isArray(cgpaState.previousSemesters) ? cgpaState.previousSemesters : [];

  let totalUnits = 0;
  let totalWeighted = 0;

  for (const sem of previousSemesters) {
    const semCgpa = toNum(sem?.cgpa, NaN);
    const semUnits = toNum(sem?.totalUnits, NaN);
    const units = Number.isFinite(semUnits) && semUnits > 0 ? semUnits : TYPICAL_SEMESTER_UNITS;
    if (Number.isFinite(semCgpa)) {
      totalUnits += units;
      totalWeighted += units * semCgpa;
    }
  }

  for (const course of courses) {
    const units = toNum(course?.creditUnits, NaN);
    if (!Number.isFinite(units) || units <= 0) continue;

    const currentGp = calcCourseGradePoint(course);
    const bestGp = MAX_GRADE_POINT;

    totalUnits += units;
    totalWeighted += units * (currentGp !== null ? Math.max(currentGp, bestGp) : bestGp);
  }

  return totalUnits > 0 ? totalWeighted / totalUnits : null;
}

/**
 * Calculate the worst possible CGPA assuming all unresolved courses get 0.
 */
function calcWorstPossibleCgpa(cgpaState) {
  if (!cgpaState || typeof cgpaState !== 'object') return null;

  const courses = Array.isArray(cgpaState.courses) ? cgpaState.courses : [];
  const previousSemesters = Array.isArray(cgpaState.previousSemesters) ? cgpaState.previousSemesters : [];

  let totalUnits = 0;
  let totalWeighted = 0;

  for (const sem of previousSemesters) {
    const semCgpa = toNum(sem?.cgpa, NaN);
    const semUnits = toNum(sem?.totalUnits, NaN);
    const units = Number.isFinite(semUnits) && semUnits > 0 ? semUnits : TYPICAL_SEMESTER_UNITS;
    if (Number.isFinite(semCgpa)) {
      totalUnits += units;
      totalWeighted += units * semCgpa;
    }
  }

  for (const course of courses) {
    const units = toNum(course?.creditUnits, NaN);
    if (!Number.isFinite(units) || units <= 0) continue;

    const currentGp = calcCourseGradePoint(course);

    totalUnits += units;
    totalWeighted += units * (currentGp !== null ? currentGp : 0);
  }

  return totalUnits > 0 ? totalWeighted / totalUnits : null;
}

/* ── Goal Projection ────────────────────────────────────── */

/**
 * Calculate what GPA is needed in future courses to reach a target CGPA.
 *
 * @param {Object} params
 * @param {number} params.completedWeighted - Quality points earned so far
 * @param {number} params.completedUnits - Credit units completed so far
 * @param {number} params.targetCgpa - Target CGPA
 * @param {number} params.remainingUnits - Remaining credit units
 *
 * @returns {Object} { requiredGpa, achievable, status, reason }
 */
function calcGoalProjection({ completedWeighted, completedUnits, targetCgpa, remainingUnits }) {
  const weighted = toNum(completedWeighted, NaN);
  const units = toNum(completedUnits, NaN);
  const target = toNum(targetCgpa, NaN);
  const remaining = toNum(remainingUnits, NaN);

  if (!Number.isFinite(target) || !Number.isFinite(remaining) || remaining <= 0) {
    return null;
  }

  const boundedTarget = Math.min(MAX_GRADE_POINT, Math.max(0, target));
  const requiredTotalWeighted = boundedTarget * (units + remaining);
  const requiredFutureWeighted = requiredTotalWeighted - (Number.isFinite(weighted) ? weighted : 0);
  const requiredGpa = requiredFutureWeighted / remaining;

  let status;
  if (requiredGpa > MAX_GRADE_POINT) status = 'unachievable';
  else if (requiredGpa <= 0) status = 'already-met';
  else status = 'achievable';

  return {
    target: boundedTarget,
    remainingUnits: remaining,
    requiredGpa,
    status,
  };
}

/* ── Exports ────────────────────────────────────────────── */

module.exports = {
  // Constants
  GRADE_SCALE,
  CLASSIFICATION_SCALE,
  MAX_GRADE_POINT,

  // Core conversions
  getGradePoint,
  getGradeLabel,
  resolveClassification,
  getGradeScale,

  // Course score
  calcFinalScore,
  calcCourseGradePoint,
  calcCourseWeightedPoints,

  // GPA / CGPA
  calcSemesterGpa,
  calcCumulativeCgpa,
  calcCgpaFromCourses,

  // Exam intelligence
  calcRequiredExamScore,
  getExamRequirements,

  // Rescue mode
  calcRequiredSemesterGpa,

  // Course impact
  calcCourseImpact,
  rankCourseImpact,

  // Simulation
  simulateCgpa,

  // Boundaries
  calcBestPossibleCgpa,
  calcWorstPossibleCgpa,

  // Goal projection
  calcGoalProjection,
};
