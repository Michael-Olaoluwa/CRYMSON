/**
 * Shared Academic Engine Fixtures
 *
 * Both frontend (Jest) and backend (node:test) import this file.
 * CRA's ModuleScopePlugin blocks shared executable code,
 * but test files can import from outside src/.
 *
 * If any engine diverges, parity tests fail.
 *
 * IMPORTANT: Number('') === 0 and Number(null) === 0 in JavaScript.
 * Empty strings and null are treated as 0 (score of zero), not "not entered".
 * This is existing behavior — the engine uses Number coercion.
 */

'use strict';

/* ── getGradePoint ──────────────────────────────────────── */

const getGradePointCases = [
  { name: 'score 0 → GP 0 (F)', input: 0, expected: 0 },
  { name: 'score 39 → GP 0 (F)', input: 39, expected: 0 },
  { name: 'score 40 → GP 1 (E)', input: 40, expected: 1 },
  { name: 'score 44 → GP 1 (E)', input: 44, expected: 1 },
  { name: 'score 45 → GP 2 (D)', input: 45, expected: 2 },
  { name: 'score 49 → GP 2 (D)', input: 49, expected: 2 },
  { name: 'score 50 → GP 3 (C)', input: 50, expected: 3 },
  { name: 'score 59 → GP 3 (C)', input: 59, expected: 3 },
  { name: 'score 60 → GP 4 (B)', input: 60, expected: 4 },
  { name: 'score 69 → GP 4 (B)', input: 69, expected: 4 },
  { name: 'score 70 → GP 5 (A)', input: 70, expected: 5 },
  { name: 'score 100 → GP 5 (A)', input: 100, expected: 5 },
  { name: 'null → 0 (Number(null) === 0)', input: null, expected: 0 },
  { name: "undefined → null", input: undefined, expected: null },
  { name: "string 'abc' → null", input: 'abc', expected: null },
  { name: "empty string → 0 (Number(\"\") === 0)", input: '', expected: 0 },
  { name: 'NaN → null', input: NaN, expected: null },
];

/* ── getGradeLabel ─────────────────────────────────────── */

const getGradeLabelCases = [
  { name: 'score 0 → F', input: 0, expected: 'F' },
  { name: 'score 39 → F', input: 39, expected: 'F' },
  { name: 'score 40 → E', input: 40, expected: 'E' },
  { name: 'score 45 → D', input: 45, expected: 'D' },
  { name: 'score 50 → C', input: 50, expected: 'C' },
  { name: 'score 60 → B', input: 60, expected: 'B' },
  { name: 'score 70 → A', input: 70, expected: 'A' },
  { name: 'score 100 → A', input: 100, expected: 'A' },
  { name: 'null → F (Number(null) === 0 → score 0 → F)', input: null, expected: 'F' },
  { name: "undefined → null", input: undefined, expected: null },
];

/* ── resolveClassification ─────────────────────────────── */

const resolveClassificationCases = [
  { name: 'CGPA 0 → null', input: 0, expected: null },
  { name: 'CGPA 0.001 → Pass', input: 0.001, expected: 'Pass' },
  { name: 'CGPA 1.0 → Pass', input: 1.0, expected: 'Pass' },
  { name: 'CGPA 1.49 → Pass', input: 1.49, expected: 'Pass' },
  { name: 'CGPA 1.5 → Third Class', input: 1.5, expected: 'Third Class' },
  { name: 'CGPA 2.0 → Third Class', input: 2.0, expected: 'Third Class' },
  { name: 'CGPA 2.39 → Third Class', input: 2.39, expected: 'Third Class' },
  { name: 'CGPA 2.4 → Second Class Lower', input: 2.4, expected: 'Second Class Lower' },
  { name: 'CGPA 3.0 → Second Class Lower', input: 3.0, expected: 'Second Class Lower' },
  { name: 'CGPA 3.49 → Second Class Lower', input: 3.49, expected: 'Second Class Lower' },
  { name: 'CGPA 3.5 → Second Class Upper', input: 3.5, expected: 'Second Class Upper' },
  { name: 'CGPA 4.0 → Second Class Upper', input: 4.0, expected: 'Second Class Upper' },
  { name: 'CGPA 4.49 → Second Class Upper', input: 4.49, expected: 'Second Class Upper' },
  { name: 'CGPA 4.5 → First Class', input: 4.5, expected: 'First Class' },
  { name: 'CGPA 5.0 → First Class', input: 5.0, expected: 'First Class' },
  { name: 'null → null', input: null, expected: null },
  { name: '-1 → null', input: -1, expected: null },
];

/* ── calcFinalScore ────────────────────────────────────── */

const calcFinalScoreCases = [
  {
    name: 'legacy score field',
    input: { id: 1, score: 75 },
    expected: 75,
  },
  {
    name: 'three-score model',
    input: { id: 2, test1Score: '10', test2Score: '15', examScore: '50' },
    expected: 75,
  },
  {
    name: 'three-score with numeric strings',
    input: { id: 3, test1Score: '10', test2Score: '10', examScore: '55' },
    expected: 75,
  },
  {
    name: 'missing exam → null',
    input: { id: 4, test1Score: '10', test2Score: '15' },
    expected: null,
  },
  {
    name: "empty strings → 0 (Number(\"\") === 0)",
    input: { id: 5, test1Score: '', test2Score: '', examScore: '' },
    expected: 0,
  },
  {
    name: 'null course → null',
    input: null,
    expected: null,
  },
  {
    name: 'all zeros → 0',
    input: { id: 6, test1Score: '0', test2Score: '0', examScore: '0' },
    expected: 0,
  },
];

/* ── calcSemesterGpa ───────────────────────────────────── */

const calcSemesterGpaCases = [
  {
    name: 'empty courses → null gpa',
    input: [],
    expected: { gpa: null, totalUnits: 0, totalWeighted: 0, courseCount: 0, validCourseCount: 0 },
  },
  {
    name: 'single A course (3 units, score 75)',
    input: [
      { id: 1, courseName: 'MATH 101', creditUnits: '3', test1Score: '10', test2Score: '15', examScore: '50' },
    ],
    expected: { gpa: 5.0, totalUnits: 3, totalWeighted: 15, courseCount: 1, validCourseCount: 1 },
  },
  {
    name: 'two A courses (3+4 units)',
    input: [
      { id: 1, courseName: 'MATH 101', creditUnits: '3', test1Score: '10', test2Score: '15', examScore: '50' },
      { id: 2, courseName: 'PHY 101', creditUnits: '4', test1Score: '15', test2Score: '15', examScore: '45' },
    ],
    expected: { gpa: 5.0, totalUnits: 7, totalWeighted: 35, courseCount: 2, validCourseCount: 2 },
  },
  {
    name: 'mixed grades (B + A)',
    input: [
      { id: 1, courseName: 'MATH 101', creditUnits: '3', test1Score: '10', test2Score: '10', examScore: '40' },
      { id: 2, courseName: 'PHY 101', creditUnits: '4', test1Score: '15', test2Score: '15', examScore: '40' },
    ],
    expected: { gpa: 32 / 7, totalUnits: 7, totalWeighted: 32, courseCount: 2, validCourseCount: 2 },
  },
  {
    name: 'course without units → skipped in validCourseCount',
    input: [
      { id: 1, courseName: 'MATH 101', creditUnits: '3', test1Score: '10', test2Score: '15', examScore: '50' },
      { id: 2, courseName: 'PHY 101', creditUnits: '', test1Score: '15', test2Score: '15', examScore: '45' },
    ],
    expected: { gpa: 5.0, totalUnits: 3, totalWeighted: 15, courseCount: 2, validCourseCount: 1 },
  },
];

/* ── calcCumulativeCgpa ────────────────────────────────── */

const calcCumulativeCgpaCases = [
  {
    name: 'no previous semesters, single course',
    input: {
      courses: [{ id: 1, creditUnits: '3', test1Score: '10', test2Score: '15', examScore: '50' }],
      previousSemesters: [],
    },
    expected: { cgpa: 5.0, totalUnits: 3, totalWeighted: 15, semesterCount: 1, isApproximate: false },
  },
  {
    name: 'no courses, no previous → null cgpa',
    input: { courses: [], previousSemesters: [] },
    expected: { cgpa: null, totalUnits: 0, totalWeighted: 0, semesterCount: 0, isApproximate: false },
  },
  {
    name: 'with previous semester (explicit units)',
    input: {
      courses: [{ id: 1, creditUnits: '3', test1Score: '10', test2Score: '15', examScore: '50' }],
      previousSemesters: [{ semester: 1, cgpa: 4.0, totalUnits: 18 }],
    },
    expected: { cgpa: 87 / 21, totalUnits: 21, totalWeighted: 87, semesterCount: 2, isApproximate: false },
  },
  {
    name: 'with previous semester (no units → approximate)',
    input: {
      courses: [{ id: 1, creditUnits: '3', test1Score: '10', test2Score: '15', examScore: '50' }],
      previousSemesters: [{ semester: 1, cgpa: 4.0 }],
    },
    expected: { cgpa: 87 / 21, totalUnits: 21, totalWeighted: 87, semesterCount: 2, isApproximate: true },
  },
];

/* ── calcRequiredExamScore ─────────────────────────────── */

const calcRequiredExamScoreCases = [
  {
    name: 'achievable: need 40/70 for B',
    input: { caScore: 20, caMax: 30, examMax: 70, desiredGradePoint: 4 },
    expected: { requiredScore: 40, achievable: true },
  },
  {
    name: 'already secured: CA alone gives B',
    input: { caScore: 65, caMax: 30, examMax: 70, desiredGradePoint: 4 },
    expected: { requiredScore: 0, achievable: true },
  },
  {
    name: 'achievable: need 70/70 for A (perfect exam)',
    input: { caScore: 0, caMax: 30, examMax: 70, desiredGradePoint: 5 },
    expected: { requiredScore: 70, achievable: true },
  },
  {
    name: 'not achievable: need 75/70 for A',
    input: { caScore: 0, caMax: 30, examMax: 50, desiredGradePoint: 5 },
    expected: { achievable: false },
  },
  {
    name: "null caScore → treated as 0 (Number(null) === 0)",
    input: { caScore: null, caMax: 30, examMax: 70, desiredGradePoint: 4 },
    expected: { requiredScore: 60, achievable: true },
  },
  {
    name: 'invalid target GP > 5',
    input: { caScore: 20, caMax: 30, examMax: 70, desiredGradePoint: 6 },
    expected: { requiredScore: null, achievable: false },
  },
  {
    name: 'target GP 0 → already secured (need score 0)',
    input: { caScore: 20, caMax: 30, examMax: 70, desiredGradePoint: 0 },
    expected: { requiredScore: 0, achievable: true },
  },
];

/* ── calcRequiredSemesterGpa (Rescue Mode) ─────────────── */

const calcRequiredSemesterGpaCases = [
  {
    name: 'achievable: need 5.0 GPA for 4.0 target',
    input: { currentCgpa: 3.5, completedUnits: 36, targetCgpa: 4.0, currentSemesterUnits: 18 },
    expected: { requiredSemesterGpa: 5.0, achievable: true },
  },
  {
    name: 'maintaining: need 4.0 GPA to maintain 4.0 CGPA',
    input: { currentCgpa: 4.0, completedUnits: 36, targetCgpa: 4.0, currentSemesterUnits: 18 },
    // totalUnits=54, required=4.0*54=216, have=4.0*36=144, need=72, gpa=72/18=4.0
    expected: { requiredSemesterGpa: 4.0, achievable: true },
  },
  {
    name: 'diluted: need 3.0 GPA when CGPA already 4.5',
    input: { currentCgpa: 4.5, completedUnits: 36, targetCgpa: 4.0, currentSemesterUnits: 18 },
    // totalUnits=54, required=4.0*54=216, have=4.5*36=162, need=54, gpa=54/18=3.0
    expected: { requiredSemesterGpa: 3.0, achievable: true },
  },
  {
    name: 'not achievable: need 7.5 GPA for 4.5 target',
    input: { currentCgpa: 3.0, completedUnits: 36, targetCgpa: 4.5, currentSemesterUnits: 18 },
    expected: { requiredSemesterGpa: 7.5, achievable: false },
  },
  {
    name: 'no previous data → need target as GPA',
    input: { currentCgpa: null, completedUnits: 0, targetCgpa: 4.0, currentSemesterUnits: 18 },
    expected: { requiredSemesterGpa: 4.0, achievable: true },
  },
  {
    name: 'no target set',
    input: { currentCgpa: 3.5, completedUnits: 36, targetCgpa: 0, currentSemesterUnits: 18 },
    expected: { requiredSemesterGpa: null, achievable: false },
  },
  {
    name: 'already exceeded: CGPA 4.5, target 3.5, many units completed',
    input: { currentCgpa: 4.5, completedUnits: 126, targetCgpa: 3.5, currentSemesterUnits: 18 },
    // totalUnits=144, required=3.5*144=504, have=4.5*126=567, need=-63, gpa<=0 → already met
    expected: { requiredSemesterGpa: 0, achievable: true },
  },
];

/* ── calcCourseImpact ──────────────────────────────────── */

const calcCourseImpactCases = [
  {
    name: 'high units, low score → high impact',
    input: {
      course: { id: 1, creditUnits: '4', test1Score: '5', test2Score: '5', examScore: '20' },
      totalSemesterUnits: 15,
    },
    expected: { label: 'High Impact' },
  },
  {
    name: 'low units, high score → lower impact',
    input: {
      course: { id: 2, creditUnits: '1', test1Score: '10', test2Score: '10', examScore: '50' },
      totalSemesterUnits: 15,
    },
    expected: { label: 'Lower Impact' },
  },
  {
    name: 'no units → No data',
    input: {
      course: { id: 3, creditUnits: '', test1Score: '10', test2Score: '10', examScore: '50' },
      totalSemesterUnits: 15,
    },
    expected: { label: 'No data' },
  },
];

/* ── simulateCgpa ──────────────────────────────────────── */
// NOTE: simulateCgpa updates semesterGpa via courseResults but
// cumulative CGPA is computed from the (unchanged) course score fields.
// _simulatedGradePoint is only used for display in courseResults.

const simulateCgpaCases = [
  {
    name: 'null cgpaState → empty result',
    input: { cgpaState: null, hypotheticalGrades: {} },
    expected: { semesterGpa: null, cgpa: null, semesterChange: null, cgpaChange: null, targetStatus: null, courseResults: [] },
  },
  {
    name: 'simulate upgrade from B to A on 3-unit course',
    input: {
      cgpaState: {
        courses: [
          { id: 1, courseName: 'MATH', creditUnits: '3', test1Score: '10', test2Score: '10', examScore: '40' },
        ],
        previousSemesters: [],
        goalCgpa: 4.5,
      },
      hypotheticalGrades: { 1: 5 },
    },
    // Original: score=60, GP=4; Simulated: GP=5
    // semesterGpa uses simulated grades → 5.0
    // cgpa uses original scores → 4.0
    // semesterChange: 5.0 - 4.0 = 1.0
    // cgpaChange: 4.0 - 4.0 = 0
    expected: {
      semesterGpa: 5.0,
      cgpa: 4.0,
      semesterChange: 1.0,
      cgpaChange: 0,
      targetStatus: 'not-met',
    },
  },
];

/* ── calcBestPossibleCgpa ──────────────────────────────── */

const calcBestPossibleCgpaCases = [
  {
    name: 'single course with partial score → best is A',
    input: {
      courses: [{ id: 1, creditUnits: '3', test1Score: '10', test2Score: '10', examScore: '40' }],
      previousSemesters: [],
    },
    expected: 5.0,
  },
  {
    name: 'null state → null',
    input: null,
    expected: null,
  },
];

/* ── calcWorstPossibleCgpa ─────────────────────────────── */

const calcWorstPossibleCgpaCases = [
  {
    name: 'course with score → worst is current GP (not 0)',
    input: {
      courses: [{ id: 1, creditUnits: '3', test1Score: '10', test2Score: '10', examScore: '55' }],
      previousSemesters: [],
    },
    // score=75, GP=5; worst case uses current GP → 5.0
    expected: 5.0,
  },
  {
    name: 'course without score → worst is 0',
    input: {
      courses: [{ id: 1, creditUnits: '3' }],
      previousSemesters: [],
    },
    // no score → GP=null → worst case uses 0 → 0.0
    expected: 0,
  },
  {
    name: 'null state → null',
    input: null,
    expected: null,
  },
];

/* ── calcGoalProjection ────────────────────────────────── */

const calcGoalProjectionCases = [
  {
    name: 'achievable: need 5.0 GPA in remaining 18 units',
    input: { completedWeighted: 126, completedUnits: 36, targetCgpa: 4.0, remainingUnits: 18 },
    expected: { target: 4.0, remainingUnits: 18, requiredGpa: 5.0, status: 'achievable' },
  },
  {
    name: 'already met: weighted already enough',
    input: { completedWeighted: 216, completedUnits: 36, targetCgpa: 4.0, remainingUnits: 18 },
    expected: { target: 4.0, remainingUnits: 18, requiredGpa: 0, status: 'already-met' },
  },
  {
    name: 'unachievable: need 6.0 GPA',
    input: { completedWeighted: 100, completedUnits: 36, targetCgpa: 4.0, remainingUnits: 18 },
    expected: { target: 4.0, remainingUnits: 18, requiredGpa: 116 / 18, status: 'unachievable' },
  },
  {
    name: 'null result when no remaining units',
    input: { completedWeighted: 126, completedUnits: 36, targetCgpa: 4.0, remainingUnits: 0 },
    expected: null,
  },
  {
    name: 'target clamped to 5.0',
    input: { completedWeighted: 126, completedUnits: 36, targetCgpa: 6.0, remainingUnits: 18 },
    expected: { target: 5.0, remainingUnits: 18, requiredGpa: 8.0, status: 'unachievable' },
  },
];

/* ── getExamRequirements ───────────────────────────────── */

const getExamRequirementsCases = [
  {
    name: 'two courses, one with CA one without',
    input: {
      courses: [
        { id: 1, courseName: 'MATH 101', creditUnits: '3', test1Score: '10', test2Score: '15' },
        { id: 2, courseName: 'PHY 101', creditUnits: '4', test1Score: '15', test2Score: '15', examScore: '50' },
      ],
    },
    verify: function (result) {
      return (
        result.length === 2 &&
        result[0].courseName === 'MATH 101' &&
        result[0].caScore === 25 &&
        result[0].hasExam === false &&
        result[0].missingCa === false &&
        result[0].gradeRequirements.length === 5 &&
        result[1].courseName === 'PHY 101' &&
        result[1].caScore === 30 &&
        result[1].hasExam === true &&
        result[1].finalScore === 80
      );
    },
  },
];

/* ── Exports ───────────────────────────────────────────── */

module.exports = {
  getGradePoint: getGradePointCases,
  getGradeLabel: getGradeLabelCases,
  resolveClassification: resolveClassificationCases,
  calcFinalScore: calcFinalScoreCases,
  calcSemesterGpa: calcSemesterGpaCases,
  calcCumulativeCgpa: calcCumulativeCgpaCases,
  calcRequiredExamScore: calcRequiredExamScoreCases,
  calcRequiredSemesterGpa: calcRequiredSemesterGpaCases,
  calcCourseImpact: calcCourseImpactCases,
  simulateCgpa: simulateCgpaCases,
  calcBestPossibleCgpa: calcBestPossibleCgpaCases,
  calcWorstPossibleCgpa: calcWorstPossibleCgpaCases,
  calcGoalProjection: calcGoalProjectionCases,
  getExamRequirements: getExamRequirementsCases,
};
