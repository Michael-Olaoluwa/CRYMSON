const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../src/services/academicEngine');
const fixtures = require('../../shared/academic-fixtures');

describe('Academic Engine Parity', () => {
  describe('getGradePoint', () => {
    for (const tc of fixtures.getGradePoint) {
      it(tc.name, () => {
        const result = engine.getGradePoint(tc.input);
        if (tc.expected === null) {
          assert.equal(result, null);
        } else {
          assert.equal(result, tc.expected);
        }
      });
    }
  });

  describe('getGradeLabel', () => {
    for (const tc of fixtures.getGradeLabel) {
      it(tc.name, () => {
        const result = engine.getGradeLabel(tc.input);
        if (tc.expected === null) {
          assert.equal(result, null);
        } else {
          assert.equal(result, tc.expected);
        }
      });
    }
  });

  describe('resolveClassification', () => {
    for (const tc of fixtures.resolveClassification) {
      it(tc.name, () => {
        const result = engine.resolveClassification(tc.input);
        if (tc.expected === null) {
          assert.equal(result, null);
        } else {
          assert.equal(result, tc.expected);
        }
      });
    }
  });

  describe('calcFinalScore', () => {
    for (const tc of fixtures.calcFinalScore) {
      it(tc.name, () => {
        const result = engine.calcFinalScore(tc.input);
        if (tc.expected === null) {
          assert.equal(result, null);
        } else {
          assert.equal(result, tc.expected);
        }
      });
    }
  });

  describe('calcSemesterGpa', () => {
    for (const tc of fixtures.calcSemesterGpa) {
      it(tc.name, () => {
        const result = engine.calcSemesterGpa(tc.input);
        assert.equal(result.courseCount, tc.expected.courseCount);
        assert.equal(result.validCourseCount, tc.expected.validCourseCount);
        assert.equal(result.totalUnits, tc.expected.totalUnits);
        assert.equal(result.totalWeighted, tc.expected.totalWeighted);
        if (tc.expected.gpa === null) {
          assert.equal(result.gpa, null);
        } else {
          assert.ok(Math.abs(result.gpa - tc.expected.gpa) < 1e-10, `gpa: ${result.gpa} vs ${tc.expected.gpa}`);
        }
      });
    }
  });

  describe('calcCumulativeCgpa', () => {
    for (const tc of fixtures.calcCumulativeCgpa) {
      it(tc.name, () => {
        const result = engine.calcCumulativeCgpa(tc.input);
        assert.equal(result.totalUnits, tc.expected.totalUnits);
        assert.equal(result.totalWeighted, tc.expected.totalWeighted);
        assert.equal(result.semesterCount, tc.expected.semesterCount);
        assert.equal(result.isApproximate, tc.expected.isApproximate);
        if (tc.expected.cgpa === null) {
          assert.equal(result.cgpa, null);
        } else {
          assert.ok(Math.abs(result.cgpa - tc.expected.cgpa) < 1e-10, `cgpa: ${result.cgpa} vs ${tc.expected.cgpa}`);
        }
      });
    }
  });

  describe('calcRequiredExamScore', () => {
    for (const tc of fixtures.calcRequiredExamScore) {
      it(tc.name, () => {
        const result = engine.calcRequiredExamScore(tc.input);
        assert.equal(result.achievable, tc.expected.achievable);
        if (tc.expected.requiredScore !== undefined) {
          assert.equal(result.requiredScore, tc.expected.requiredScore);
        }
      });
    }
  });

  describe('calcRequiredSemesterGpa', () => {
    for (const tc of fixtures.calcRequiredSemesterGpa) {
      it(tc.name, () => {
        const result = engine.calcRequiredSemesterGpa(tc.input);
        assert.equal(result.achievable, tc.expected.achievable);
        if (tc.expected.requiredSemesterGpa !== undefined) {
          assert.ok(
            Math.abs(result.requiredSemesterGpa - tc.expected.requiredSemesterGpa) < 1e-10,
            `requiredSemesterGpa: ${result.requiredSemesterGpa} vs ${tc.expected.requiredSemesterGpa}`
          );
        }
      });
    }
  });

  describe('calcCourseImpact', () => {
    for (const tc of fixtures.calcCourseImpact) {
      it(tc.name, () => {
        const result = engine.calcCourseImpact(tc.input.course, tc.input.totalSemesterUnits);
        assert.equal(result.label, tc.expected.label);
      });
    }
  });

  describe('simulateCgpa', () => {
    for (const tc of fixtures.simulateCgpa) {
      it(tc.name, () => {
        const result = engine.simulateCgpa(tc.input.cgpaState, tc.input.hypotheticalGrades);
        if (tc.expected.semesterGpa === null) {
          assert.equal(result.semesterGpa, null);
        } else {
          assert.ok(Math.abs(result.semesterGpa - tc.expected.semesterGpa) < 1e-10);
        }
        if (tc.expected.cgpa === null) {
          assert.equal(result.cgpa, null);
        } else {
          assert.ok(Math.abs(result.cgpa - tc.expected.cgpa) < 1e-10);
        }
        if (tc.expected.semesterChange !== undefined) {
          if (tc.expected.semesterChange === null) {
            assert.equal(result.semesterChange, null);
          } else {
            assert.ok(Math.abs(result.semesterChange - tc.expected.semesterChange) < 1e-10);
          }
        }
        if (tc.expected.cgpaChange !== undefined) {
          if (tc.expected.cgpaChange === null) {
            assert.equal(result.cgpaChange, null);
          } else {
            assert.ok(Math.abs(result.cgpaChange - tc.expected.cgpaChange) < 1e-10);
          }
        }
        if (tc.expected.targetStatus !== undefined) {
          assert.equal(result.targetStatus, tc.expected.targetStatus);
        }
      });
    }
  });

  describe('calcBestPossibleCgpa', () => {
    for (const tc of fixtures.calcBestPossibleCgpa) {
      it(tc.name, () => {
        const result = engine.calcBestPossibleCgpa(tc.input);
        if (tc.expected === null) {
          assert.equal(result, null);
        } else {
          assert.ok(Math.abs(result - tc.expected) < 1e-10);
        }
      });
    }
  });

  describe('calcWorstPossibleCgpa', () => {
    for (const tc of fixtures.calcWorstPossibleCgpa) {
      it(tc.name, () => {
        const result = engine.calcWorstPossibleCgpa(tc.input);
        if (tc.expected === null) {
          assert.equal(result, null);
        } else {
          assert.ok(Math.abs(result - tc.expected) < 1e-10);
        }
      });
    }
  });

  describe('calcGoalProjection', () => {
    for (const tc of fixtures.calcGoalProjection) {
      it(tc.name, () => {
        const result = engine.calcGoalProjection(tc.input);
        if (tc.expected === null) {
          assert.equal(result, null);
        } else {
          assert.equal(result.target, tc.expected.target);
          assert.equal(result.remainingUnits, tc.expected.remainingUnits);
          assert.equal(result.status, tc.expected.status);
          assert.ok(Math.abs(result.requiredGpa - tc.expected.requiredGpa) < 1e-10);
        }
      });
    }
  });

  describe('getExamRequirements', () => {
    for (const tc of fixtures.getExamRequirements) {
      it(tc.name, () => {
        const result = engine.getExamRequirements(tc.input.courses);
        assert.ok(tc.verify(result), 'Verification function failed');
      });
    }
  });
});
