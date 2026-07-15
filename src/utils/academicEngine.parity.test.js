import * as engine from './academicEngine';
const fixtures = require('../../shared/academic-fixtures');

function approxEqual(a, b, epsilon = 1e-10) {
  if (a === null && b === null) return true;
  if (a === undefined && b === undefined) return true;
  return Math.abs(a - b) < epsilon;
}

describe('Academic Engine Parity (shared fixtures)', () => {
  describe('getGradePoint', () => {
    fixtures.getGradePoint.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.getGradePoint(tc.input);
        expect(result).toBe(tc.expected);
      });
    });
  });

  describe('getGradeLabel', () => {
    fixtures.getGradeLabel.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.getGradeLabel(tc.input);
        expect(result).toBe(tc.expected);
      });
    });
  });

  describe('resolveClassification', () => {
    fixtures.resolveClassification.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.resolveClassification(tc.input);
        expect(result).toBe(tc.expected);
      });
    });
  });

  describe('calcFinalScore', () => {
    fixtures.calcFinalScore.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.calcFinalScore(tc.input);
        expect(result).toBe(tc.expected);
      });
    });
  });

  describe('calcSemesterGpa', () => {
    fixtures.calcSemesterGpa.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.calcSemesterGpa(tc.input);
        expect(result.courseCount).toBe(tc.expected.courseCount);
        expect(result.validCourseCount).toBe(tc.expected.validCourseCount);
        expect(result.totalUnits).toBe(tc.expected.totalUnits);
        expect(result.totalWeighted).toBe(tc.expected.totalWeighted);
        if (tc.expected.gpa === null) {
          expect(result.gpa).toBeNull();
        } else {
          expect(approxEqual(result.gpa, tc.expected.gpa)).toBe(true);
        }
      });
    });
  });

  describe('calcCumulativeCgpa', () => {
    fixtures.calcCumulativeCgpa.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.calcCumulativeCgpa(tc.input);
        expect(result.totalUnits).toBe(tc.expected.totalUnits);
        expect(result.totalWeighted).toBe(tc.expected.totalWeighted);
        expect(result.semesterCount).toBe(tc.expected.semesterCount);
        expect(result.isApproximate).toBe(tc.expected.isApproximate);
        if (tc.expected.cgpa === null) {
          expect(result.cgpa).toBeNull();
        } else {
          expect(approxEqual(result.cgpa, tc.expected.cgpa)).toBe(true);
        }
      });
    });
  });

  describe('calcRequiredExamScore', () => {
    fixtures.calcRequiredExamScore.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.calcRequiredExamScore(tc.input);
        expect(result.achievable).toBe(tc.expected.achievable);
        if (tc.expected.requiredScore !== undefined) {
          expect(result.requiredScore).toBe(tc.expected.requiredScore);
        }
      });
    });
  });

  describe('calcRequiredSemesterGpa', () => {
    fixtures.calcRequiredSemesterGpa.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.calcRequiredSemesterGpa(tc.input);
        expect(result.achievable).toBe(tc.expected.achievable);
        if (tc.expected.requiredSemesterGpa !== undefined) {
          expect(approxEqual(result.requiredSemesterGpa, tc.expected.requiredSemesterGpa)).toBe(true);
        }
      });
    });
  });

  describe('calcCourseImpact', () => {
    fixtures.calcCourseImpact.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.calcCourseImpact(tc.input.course, tc.input.totalSemesterUnits);
        expect(result.label).toBe(tc.expected.label);
      });
    });
  });

  describe('simulateCgpa', () => {
    fixtures.simulateCgpa.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.simulateCgpa(tc.input.cgpaState, tc.input.hypotheticalGrades);
        if (tc.expected.semesterGpa === null) {
          expect(result.semesterGpa).toBeNull();
        } else {
          expect(approxEqual(result.semesterGpa, tc.expected.semesterGpa)).toBe(true);
        }
        if (tc.expected.cgpa === null) {
          expect(result.cgpa).toBeNull();
        } else {
          expect(approxEqual(result.cgpa, tc.expected.cgpa)).toBe(true);
        }
        if (tc.expected.semesterChange !== undefined) {
          if (tc.expected.semesterChange === null) {
            expect(result.semesterChange).toBeNull();
          } else {
            expect(approxEqual(result.semesterChange, tc.expected.semesterChange)).toBe(true);
          }
        }
        if (tc.expected.cgpaChange !== undefined) {
          if (tc.expected.cgpaChange === null) {
            expect(result.cgpaChange).toBeNull();
          } else {
            expect(approxEqual(result.cgpaChange, tc.expected.cgpaChange)).toBe(true);
          }
        }
        if (tc.expected.targetStatus !== undefined) {
          expect(result.targetStatus).toBe(tc.expected.targetStatus);
        }
      });
    });
  });

  describe('calcBestPossibleCgpa', () => {
    fixtures.calcBestPossibleCgpa.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.calcBestPossibleCgpa(tc.input);
        if (tc.expected === null) {
          expect(result).toBeNull();
        } else {
          expect(approxEqual(result, tc.expected)).toBe(true);
        }
      });
    });
  });

  describe('calcWorstPossibleCgpa', () => {
    fixtures.calcWorstPossibleCgpa.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.calcWorstPossibleCgpa(tc.input);
        if (tc.expected === null) {
          expect(result).toBeNull();
        } else {
          expect(approxEqual(result, tc.expected)).toBe(true);
        }
      });
    });
  });

  describe('calcGoalProjection', () => {
    fixtures.calcGoalProjection.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.calcGoalProjection(tc.input);
        if (tc.expected === null) {
          expect(result).toBeNull();
        } else {
          expect(result.target).toBe(tc.expected.target);
          expect(result.remainingUnits).toBe(tc.expected.remainingUnits);
          expect(result.status).toBe(tc.expected.status);
          expect(approxEqual(result.requiredGpa, tc.expected.requiredGpa)).toBe(true);
        }
      });
    });
  });

  describe('getExamRequirements', () => {
    fixtures.getExamRequirements.forEach((tc) => {
      it(tc.name, () => {
        const result = engine.getExamRequirements(tc.input.courses);
        expect(tc.verify(result)).toBe(true);
      });
    });
  });
});
