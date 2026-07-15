# CGPA Refactor — Dependency Audit

## 1. Current Academic Data Shape

### Backend: `UserState.cgpaState` (Mongoose `Mixed` — no schema enforcement)

**File:** `backend/src/models/UserState.js:22-25`

```js
cgpaState: {
  type: mongoose.Schema.Types.Mixed,   // untyped blob
  default: null,
}
```

Backend validation (`userStateController.js:11-12`) only checks `typeof === 'object' && !Array.isArray`.

### Actual `cgpaState` shape (written by MyTrackerWidget.jsx:737-751)

```js
cgpaState {
  courses: [{
    id: number,                // auto-increment integer
    courseName: string,        // "" default
    creditUnits: string,       // "" default, clamped 0-10
    test1Score: string,        // "" default, clamped 0-15
    test2Score: string,        // "" default, clamped 0-15
    examScore: string,         // "" default, clamped 0-70
    score?: string,            // legacy single-score field (still carried for migration)
  }],
  nextId: number,              // auto-increment for next course ID
  goalCgpa: string,            // target CGPA (string, parsed as number)
  remainingUnits: string,      // remaining credit units
  cgpa: number | null,         // calculated CGPA (persisted for dashboard)
  classification: string | null, // "First Class", etc.
  showDashboardCard: boolean,
  showDashboardClassification: boolean,
  onboardingCompleted: boolean,
  currentSemester: number,
  totalSemesters: number,
  previousSemesters: [{ semester: number, cgpa: number }]
}
```

**CRITICAL:** All numeric course fields are **strings**. Parsed with `Number()` at use sites.

### Legacy course shape (CGPATracker.js — `crymson_cgpa_tracker_state_v1`)

```js
Course {
  id: number,
  courseName: string,
  creditUnits: string,
  score: string              // single combined score (not split)
}
```

### localStorage keys

| Key | Component | Contents |
|-----|-----------|----------|
| `crymson_user_cgpa_state_v1:{userId}` | MyTrackerWidget, UserHome, CrymsonScore, todayEngine, semesterWrapped | Full cgpaState |
| `crymson_cgpa_tracker_state_v1` | CGPATracker | Legacy simple state |

### Grading Scale (identical in all 10 implementations)

| Score Range | Grade | Grade Point |
|-------------|-------|-------------|
| >= 70 | A | 5 |
| >= 60 | B | 4 |
| >= 50 | C | 3 |
| >= 45 | D | 2 |
| >= 40 | E | 1 |
| < 40 | F | 0 |

### Classification Scale (identical in all 5 implementations)

| CGPA Range | Classification |
|------------|---------------|
| >= 4.5 | First Class |
| >= 3.5 | Second Class Upper |
| >= 2.4 | Second Class Lower |
| >= 1.5 | Third Class |
| > 0 | Pass |
| 0 / non-numeric | null |

---

## 2. Academic Data Consumers

| # | File | Component/Function | Data Used | Read/Write | Risk |
|---|------|--------------------|-----------|------------|------|
| 1 | `backend/src/models/UserState.js:22-25` | Schema definition | `cgpaState: Mixed` | WRITE (schema) | HIGH |
| 2 | `backend/src/controllers/userStateController.js:69-97` | `getCgpaState`, `putCgpaState` | Full cgpaState | READ+WRITE | HIGH |
| 3 | `backend/src/controllers/userStateController.js:201-256` | `putAllUserState` | cgpaState field | WRITE | HIGH |
| 4 | `backend/src/controllers/batchSyncController.js:26` | `batchSync` | cgpaState | WRITE | HIGH |
| 5 | `backend/src/services/ecosystemEngine.js:48-72` | `computeCgpa()` | courses, creditUnits, score, test1Score/test2Score/examScore, goalCgpa | READ (compute) | HIGH |
| 6 | `backend/src/services/ecosystemEngine.js:255-327` | `computeScore()` | cgpa.currentCgpa, cgpa.goalCgpa | READ (compute) | HIGH |
| 7 | `backend/src/services/ecosystemEngine.js:331-459` | `generateInsights()` | courses, creditUnits, scores | READ (compute) | MEDIUM |
| 8 | `backend/src/services/studyPlanner.js:123-245` | `generateSchedule()` | courses, creditUnits, score, courseName | READ (compute) | HIGH |
| 9 | `backend/src/controllers/studyPlannerController.js` | `getSchedule`, `generateNewSchedule` | userState.cgpaState | READ | MEDIUM |
| 10 | `backend/src/controllers/dashboardController.js` | `getFullDashboard`, `getDailyBriefing` | cgpaState via ecosystemEngine | READ | MEDIUM |
| 11 | `src/parts/grade-tools/MyTrackerWidget.jsx:172-1454` | `MyTrackerWidget` (main CGPA tracker) | Full cgpaState — all fields | READ+WRITE | CRITICAL |
| 12 | `src/parts/grade-tools/LegacyCgpaMigrationBanner.jsx` | Migration banner | Legacy + synced cgpaState | READ+WRITE | HIGH |
| 13 | `src/parts/grade-tools/OnboardingWizard.jsx` | Onboarding wizard | currentSemester, totalSemesters, previousSemesters, goalCgpa | WRITE | MEDIUM |
| 14 | `src/parts/grade-tools/CourseTable.jsx` | Course table UI | courses[], getGradePoint prop | READ | MEDIUM |
| 15 | `src/parts/grade-tools/ResultCards.jsx` | CGPA display | cgpa, classification props | READ | LOW |
| 16 | `src/pages/CGPATracker.js` | Legacy CGPA calculator | courses[].score (single) | READ+WRITE | HIGH |
| 17 | `src/pages/UserCGPATracker.js` | Wrapper page | activeUserId | READ | LOW |
| 18 | `src/pages/UserHome.js:99-169` | `getCgpaSummary()` | Full cgpaState from localStorage | READ (compute) | HIGH |
| 19 | `src/pages/DashboardNew.jsx:40-59` | `CgpaWidget` | API response cgpa data | READ | MEDIUM |
| 20 | `src/pages/CrymsonScore.jsx:29-64` | `getCgpaSummary()` | Full cgpaState from localStorage | READ (compute) | HIGH |
| 21 | `src/pages/SemesterWrapped.jsx` | Semester summary | Calls `computeSemesterWrapped()` | READ | MEDIUM |
| 22 | `src/utils/todayEngine.js:101-248` | `normalizeCgpaState`, `getCurrentCgpa`, etc. | Full cgpaState from localStorage | READ (compute) | HIGH |
| 23 | `src/utils/crymsonScore.js:26-81` | `computeCgpaScore()` | cgpaSummary.currentCgpa, goalCgpa | READ (compute) | MEDIUM |
| 24 | `src/utils/semesterWrapped.js:32-50` | `calcCgpa()` | courses[] | READ (compute) | MEDIUM |
| 25 | `src/utils/gamification.js:264-269` | `checkCgpaGoal()` | currentCgpa, goalCgpa params | READ | LOW |
| 26 | `src/hooks/useGamification.js:97-109` | Hook wrapper | Passes cgpa params | READ | LOW |
| 27 | `src/components/ProgressOverviewCard.jsx` | Dashboard CGPA card | currentCgpa, goalCgpa props | READ | LOW |

**TOTAL: 27 consumers across frontend + backend.**

---

## 3. Existing Calculation Logic

### 3a. `getGradePoint(score)` — Score to Grade Point

**10 duplicate implementations (ALL CONSISTENT):**

| # | File | Lines |
|---|------|-------|
| 1 | `backend/src/services/ecosystemEngine.js` | 3-12 |
| 2 | `src/pages/CGPATracker.js` | 73-82 |
| 3 | `src/pages/UserHome.js` | 60-69 |
| 4 | `src/pages/DashboardNew.jsx` | 40-49 |
| 5 | `src/pages/CrymsonScore.jsx` | 48-49 (inline ternary) |
| 6 | `src/parts/grade-tools/MyTrackerWidget.jsx` | 325-334 |
| 7 | `src/parts/grade-tools/LegacyCgpaMigrationBanner.jsx` | 6-15 |
| 8 | `src/parts/grade-tools/CourseTable.jsx` | 35 (via prop) |
| 9 | `src/utils/todayEngine.js` | 197-206 |
| 10 | `src/utils/semesterWrapped.js` | 21-30 |

### 3b. `resolveClassification(cgpa)` — CGPA to Degree Class

**5 duplicate implementations (ALL CONSISTENT):**

| # | File | Lines |
|---|------|-------|
| 1 | `backend/src/services/ecosystemEngine.js` | 24-32 |
| 2 | `src/pages/CGPATracker.js` | 91-98 |
| 3 | `src/pages/UserHome.js` | 87-95 |
| 4 | `src/parts/grade-tools/MyTrackerWidget.jsx` | 362-369 |
| 5 | `src/parts/grade-tools/LegacyCgpaMigrationBanner.jsx` | 17-24 |

### 3c. `calcFinalScore(course)` — Final Score Computation

**Two data model patterns (by design):**

**Pattern A — Single `score` field (legacy):**
- `CGPATracker.js` — uses `course.score` directly

**Pattern B — Three components (new tracker + all readers):**
- All readers check `course.score` first, fall back to `test1Score + test2Score + examScore`
- 7 implementations, ALL CONSISTENT:

| # | File | Lines |
|---|------|-------|
| 1 | `backend/src/services/ecosystemEngine.js` | 14-22 |
| 2 | `src/pages/UserHome.js` | 71-85 |
| 3 | `src/pages/DashboardNew.jsx` | 51-59 |
| 4 | `src/pages/CrymsonScore.jsx` | 38-46 (inline) |
| 5 | `src/utils/todayEngine.js` | 182-195 |
| 6 | `src/utils/semesterWrapped.js` | 36-42 (inline) |
| 7 | `src/parts/grade-tools/LegacyCgpaMigrationBanner.jsx` | 78-80 (inline) |

### 3d. CGPA Calculation — Weighted Average

**Formula:** `CGPA = sum(gradePoint * creditUnits) / sum(creditUnits)`

**8 duplicate implementations (ALL CONSISTENT):**

| # | File | Lines |
|---|------|-------|
| 1 | `backend/src/services/ecosystemEngine.js` | 48-72 |
| 2 | `src/pages/CGPATracker.js` | 100-114 |
| 3 | `src/pages/UserHome.js` | 99-169 |
| 4 | `src/pages/CrymsonScore.jsx` | 29-63 |
| 5 | `src/pages/DashboardNew.jsx` | via ecosystemEngine |
| 6 | `src/parts/grade-tools/MyTrackerWidget.jsx` | 371-398 |
| 7 | `src/parts/grade-tools/LegacyCgpaMigrationBanner.jsx` | 69-89 |
| 8 | `src/utils/todayEngine.js` | 208-227 |
| 9 | `src/utils/semesterWrapped.js` | 32-50 |

### 3e. Required Exam Score Calculation

**1 implementation only:** `MyTrackerWidget.jsx:524-575`

Uses `goalProjection.requiredFutureGpa` → maps to target final score → subtracts CA total.

### 3f. Goal CGPA Projection

**1 implementation only:** `MyTrackerWidget.jsx:489-522`

Formula: `requiredFutureGpa = (target * (completedUnits + remainingUnits) - completedWeighted) / remainingUnits`

### 3g. Semester Projection

**1 implementation only:** `MyTrackerWidget.jsx:577-606`

Linear interpolation assuming 18 units/semester.

---

## 4. Calculation Conflicts

**NO CALCULATION CONFLICTS FOUND.**

All 10 `getGradePoint` implementations use identical boundaries.
All 5 `resolveClassification` implementations use identical ranges.
All 8 CGPA calculations use the identical weighted-average formula.
All 7 `calcFinalScore` implementations handle both data models identically.

**The only issue is massive duplication — not inconsistency.**

---

## 5. Integration Risk Map

```
CGPA Tracker (MyTrackerWidget.jsx)
├── UserState (backend model — Mixed type, no validation)
│   └── Risk: Schema shape change breaks MongoDB persistence
├── userStateController (backend — shallow validation)
│   └── Risk: Any field name change must be updated here
├── batchSyncController (backend — writes cgpaState)
│   └── Risk: Dead code path, but still mounted on server
├── ecosystemEngine (backend — computeCgpa, computeScore)
│   └── Risk: CGPA calculation used for dashboard + insights
├── Study Planner (backend — reads courses, creditUnits, score)
│   └── Risk: Course shape change breaks priority scoring
├── Today Engine (frontend — reads full cgpaState)
│   └── Risk: normalizeCgpaState must match actual shape
├── Crymson Score (frontend + backend — reads CGPA values)
│   └── Risk: Frontend reads localStorage, backend reads MongoDB
├── Dashboard (UserHome.js — getCgpaSummary from localStorage)
│   └── Risk: Independent CGPA computation must stay in sync
├── DashboardNew.jsx (reads from ecosystemEngine API)
│   └── Risk: Server-computed CGPA, different source than UserHome
├── SemesterWrapped (reads cgpaState from localStorage)
│   └── Risk: calcCgpa must match other implementations
├── localStorage (primary frontend persistence)
│   └── Risk: Key name change breaks hydration
├── CGPATracker.js (legacy — separate localStorage key)
│   └── Risk: Legacy data migration must be preserved
└── LegacyCgpaMigrationBanner (bridges old → new)
    └── Risk: Migration logic must handle both shapes
```

### Key Architectural Risks

1. **Dual CGPA computation paths**: `UserHome.js` reads from localStorage and computes CGPA client-side. `DashboardNew.jsx` calls `/api/dashboard` which computes CGPA server-side via `ecosystemEngine.computeCgpa()`. These can diverge.

2. **No backend validation**: `validateCgpaState()` only checks it's an object. No field-level, type-level, or range validation.

3. **batchSync.js is dead code**: Exported but never imported anywhere. Has hardcoded `localhost:5000`.

4. **No conflict resolution**: No ETags, timestamps compared, or version vectors. Last writer wins.

5. **`cgpa` field is persisted but also computed**: MyTrackerWidget stores `cgpa` and `classification` in the state blob, but ecosystemEngine recomputes them server-side. The persisted values could drift from computed values.

6. **String-typed numerics**: All course score fields are strings. Every consumer must `Number()` parse them. Missing fields become `NaN`, not `0`.

7. **Missing vs zero ambiguity**: A course with `test1Score: ""` means "not entered" (excluded from CGPA). A course with `test1Score: "0"` means "scored zero" (included with GP 0). Both are handled correctly by the `Number()` + `isFinite()` pattern, but this is fragile.

---

## 6. Files Summary

### High/Critical Risk Files (must be carefully modified)

| File | Lines | Role |
|------|-------|------|
| `src/parts/grade-tools/MyTrackerWidget.jsx` | 1454 | Primary CGPA tracker — CRITICAL |
| `src/pages/UserHome.js` | 1300 | Dashboard with CGPA computation |
| `src/pages/CrymsonScore.jsx` | 334 | Crymson Score with CGPA computation |
| `src/pages/CGPATracker.js` | 244 | Legacy CGPA calculator |
| `src/utils/todayEngine.js` | 655 | Today engine with CGPA logic |
| `src/utils/semesterWrapped.js` | 235 | Semester wrapped with CGPA logic |
| `backend/src/services/ecosystemEngine.js` | 557 | Backend scoring engine |
| `backend/src/services/studyPlanner.js` | 254 | Study planner using CGPA data |
| `backend/src/controllers/userStateController.js` | 269 | Backend state persistence |
| `backend/src/controllers/batchSyncController.js` | 79 | Batch sync (dead code) |
| `src/parts/grade-tools/LegacyCgpaMigrationBanner.jsx` | 195 | Legacy migration |

### Low Risk Files (read-only consumers)

| File | Lines | Role |
|------|-------|------|
| `src/parts/grade-tools/ResultCards.jsx` | 19 | Display only |
| `src/parts/grade-tools/CourseTable.jsx` | 125 | UI table |
| `src/parts/grade-tools/OnboardingWizard.jsx` | 300 | Setup wizard |
| `src/components/ProgressOverviewCard.jsx` | 162 | Dashboard card |
| `src/utils/crymsonScore.js` | 188 | Score computation |
| `src/utils/gamification.js` | 330 | Badge checking |
| `src/hooks/useGamification.js` | 124 | Hook wrapper |

---

## 7. Architectural Decision: Frontend vs Backend Calculations

### Current State
- **Backend** computes CGPA in `ecosystemEngine.computeCgpa()` for dashboard/API
- **Frontend** computes CGPA independently in MyTrackerWidget, UserHome, CrymsonScore, todayEngine, semesterWrapped
- **Backend trusts client-supplied `cgpaState` blob** — no server-side validation of derived values
- The persisted `cgpa` and `classification` fields in cgpaState are **client-computed and trusted**

### Recommended Architecture for Refactor

**Keep the current architecture** but centralize calculations:

1. Create `src/utils/academicEngine.js` (frontend) — canonical pure functions
2. Create `backend/src/services/academicEngine.js` (backend) — identical pure functions
3. Both export identical functions with identical behavior
4. All frontend consumers import from `src/utils/academicEngine.js`
5. Backend `ecosystemEngine.js` imports from `backend/src/services/academicEngine.js`
6. The backend continues to trust client cgpaState (no architecture change needed here — the Mixed type blob is the persistence contract)

**Rationale**: The project has no shared code between frontend (CRA/React) and backend (Node/Express). Creating a shared module would require restructuring the build system. Duplicating pure functions in two locations is the safest path that matches existing conventions.

---

## 8. Dead Code Analysis

### `src/utils/batchSync.js`
- **Exported** as `batchSync` singleton (line 140)
- **Never imported** by any other file in the codebase (verified via grep)
- Contains hardcoded `localhost:5000` URL
- **Verdict**: DEAD CODE — safe to remove

### `src/pages/CGPATracker.js`
- **Imported** by `App.js` (verified via project structure)
- **Still accessible** as a page route
- Contains its own independent CGPA computation
- **Verdict**: ACTIVE LEGACY CODE — keep, but consider migrating users to MyTrackerWidget via the migration banner

### `src/parts/grade-tools/CourseTable.jsx`
- **Imported** by `CGPATracker.js` only
- Receives `getGradePoint` as a prop
- **Verdict**: ACTIVE — used by legacy tracker

### `src/parts/grade-tools/ResultCards.jsx`
- **Imported** by `CGPATracker.js` only
- **Verdict**: ACTIVE — used by legacy tracker
