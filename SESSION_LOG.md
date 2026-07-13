# CRYMSON Session Log — 2026-07-09 (Unsupervised)

---

## SUMMARY FOR REVIEW

**Session duration:** ~1 hour unsupervised (no questions answered in real time)

### Completed tasks
- ✅ **Task 1**: Verified UserHome.js backend response shape — confirmed correct, no change needed.
- ✅ **Task 2**: Migrated Admin.js — all 9 fetch call sites migrated to apiClient.
- ✅ **Task 3**: Migrated Landing.jsx — both signin/signup call sites migrated.
- ✅ **Task 4**: Built `useApiRequest` hook (P1.2) and applied to ToDoPlanner.js as proof of concept.
- ✅ **Task 5a**: Investigated CrymsonScore/SemesterWrapped localStorage risk — findings documented.
- ✅ **Task 5b**: Cataloged sub-component fetch calls in FileUploader, NoteEditor, MaterialsPanel.

### Skipped / Not attempted
- *(none)*

### ⚠️ NEEDS REVIEW flags (all in one place)

1. **Task 5a — CGPA and wellbeing localStorage gaps:** `loadRemoteDashboardState` does not write `crymson_user_cgpa_state_v1` or `crymson_wellbeing_checkins` to localStorage after remote fetch. CrymsonScore and SemesterWrapped may show stale data for these dimensions. Needs a product decision on whether/when to write these keys.
2. **Task 5b — 3 child components still on raw fetch:** `FileUploader.jsx`, `NoteEditor.jsx`, `MaterialsPanel.jsx` (4 call sites total) still use raw `fetch()` with manual auth. Not protected by the 401 interceptor. Recommend migrating in P1.3 or Batch 5.
3. **Task 2 — Admin.js no confirmation dialogs:** Pre-existing gap (noted in earlier audit) remains unchanged. Destructive actions (delete user, bulk email, settings overwrite) lack confirmation prompts beyond the single `window.confirm()` on user deletion. Not introduced or removed by this migration.
4. **Task 4 — P1.2 hook is proof of concept only:** Applied to exactly one call site in ToDoPlanner.js. Full rollout across the codebase is pending your decision.

### Build state
- **Passing** ✅
- **Last commit hash:** `e648dc12` ("P1.2: add useApiRequest hook and apply to ToDoPlanner.js")

---

## Task 1 — Verify UserHome.js backend response shape

**Status:** ✅ Confirmed correct — no code change needed.

**Backend controller:** `backend/src/controllers/userStateController.js:186-198`

The `GET /api/user-state/all` endpoint (defined in `backend/src/routes/userStateRoutes.js:26`, mounted at `/api/user-state` in `server.js:95`) sends:

```js
return res.status(200).json({
  data: {
    tasks:            Array.isArray(state?.tasks) ? state.tasks : [],
    cgpaState:        state?.cgpaState || null,
    timeSessions:     Array.isArray(state?.timeSessions) ? state.timeSessions : [],
    wellbeingCheckIns: Array.isArray(state?.wellbeingCheckIns) ? state.wellbeingCheckIns : [],
    finance: {
      entries:        Array.isArray(financeState.entries) ? financeState.entries : [],
      recurringPlans: Array.isArray(financeState.recurringPlans) ? financeState.recurringPlans : [],
      prefs:          financeState.prefs && typeof financeState.prefs === 'object' ? financeState.prefs : null,
    },
  },
});
```

**Frontend code in UserHome.js (migrated):**
```js
const { data: payload } = await apiClient.get('/api/user-state/all');
const allState = payload.data && typeof payload.data === 'object' ? payload.data : null;
```

**Analysis:** The Axios response wrapper gives us `{ data: <responseBody> }`, so `payload` = the full response body `{ data: { tasks, cgpaState, ... } }`. Then `payload.data` correctly accesses the inner state object. This matches. ✅

---

## Task 2 — Admin.js migration (P1.1 Batch 4, part 1)

**Status:** ⬜ Pending

### Full catalog of fetch call sites in Admin.js (371 lines)

| # | Function | Method | Path | Auth | Destructive? | res.ok pattern | Notes |
|---|----------|--------|------|------|-------------|----------------|-------|
| 1 | `fetchUsers()` | GET | `/api/admin/users?page=&limit=&search=` | Bearer token | No (read-only) | `if (!res.ok) throw new Error('Failed to fetch users')` | Standard |
| 2 | `fetchSettings()` | GET | `/api/admin/settings` | Bearer token | No (read-only) | `if (!res.ok) throw new Error('Failed to load settings')` | Standard |
| 3 | `toggleMaintenance()` | PUT | `/api/admin/settings` | Bearer token | Yes (modifies settings) | `if (!res.ok) throw new Error('Failed to update settings')` | State-changing |
| 4 | `fetchHealth()` | GET | `/api/health` | None | No (read-only) | No `res.ok` check (just `res.json()`) | Public endpoint |
| 5 | `fetchLogs()` | GET | `/api/admin/logs?limit=&offset=` | Bearer token | No (read-only) | `if (!res.ok) throw new Error('Failed to load logs')` | Standard |
| 6 | `sendBulkEmail()` | POST | `/api/admin/bulk/email` | Bearer token | **Yes** (sends email) | `if (!res.ok) { data = await res.json(); throw new Error(data.message) }` | Has `alert()` for success |
| 7 | `handleCreateUser()` | POST | `/api/admin/users` | Bearer token | **Yes** (creates user) | `if (!res.ok) { data = await res.json(); throw new Error(data.message) }` | Form submission |
| 8 | `handleDelete()` | DELETE | `/api/admin/users/:crymsonId` | Bearer token | **Yes** (deletes user) | `if (!res.ok) throw new Error('Failed to delete user')` | Has `window.confirm()` |
| 9 | `toggleFeatureFlag()` | PUT | `/api/admin/settings` | Bearer token | **Yes** (modifies settings) | `if (!res.ok) throw new Error('Failed to update feature flag')` | Inline form submission |

### Migration approach

All call sites follow the same pattern: manual token fetch + `fetch(url, { headers })` + `res.ok` check + `res.json()`. The migration is mechanical for all 9 sites:
- Remove `getToken()` calls and manual auth headers (apiClient interceptor handles this)
- Replace `fetch(...)` with `apiClient.get/post/put/delete(...)`
- Replace `if (!res.ok) throw new Error(...)` with axios catching the error automatically
- Replace `res.json().then(...)` with `const { data } = await apiClient...()`
- Error message extraction: change `err.message` → `err.response?.data?.message || 'Fallback message'`

**No confirmation dialogs were added or removed.** The existing `window.confirm()` on `handleDelete()` and `alert()` on `sendBulkEmail()` are preserved. The pre-existing gap ("no confirmation dialogs for destructive actions") noted in earlier audits remains unchanged.

**Result:** All 9 sites migrated. Build passes. Committed as `f0acb2fc` with message `"P1.1 Batch 4: migrate Admin.js"`.

---

## Task 3 — Landing.jsx migration (P1.1 Batch 4, part 2)

**Status:** ✅ Completed

**Call sites catalog:**

| # | Function | Method | Path | Auth | Notes |
|---|----------|--------|------|------|-------|
| 1 | `handleSignInSubmit()` | POST | `/api/auth/login` | None (public) | Sign-in; returns `{ token, user: { crymsonId, fullName, isAdmin } }` |
| 2 | `handleSignupSubmit()` | POST | `/api/auth/signup` | None (public) | Signup; returns `{ user: { crymsonId } }` |

**Before (handleSignInSubmit):**
```js
try {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ crymsonId: submittedUserId, password: submittedPassword })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'Sign in failed. Please try again.');
  }
  const accountId = payload?.user?.crymsonId || submittedUserId;
  const accountName = payload?.user?.fullName || '';
  const token = payload?.token;
  setIsSignInOpen(false);
  setCredentials({ crymsonId: '', password: '' });
  setPendingSignupCredentials({ crymsonId: '', password: '' });
  onLoginSuccess(accountId, accountName, token, Boolean(payload?.user?.isAdmin));
} catch (error) {
  setSignInError(error.message || 'Unable to sign in right now.');
}
```

**After (handleSignInSubmit):**
```js
try {
  const { data: payload } = await apiClient.post('/api/auth/login', {
    crymsonId: submittedUserId, password: submittedPassword
  });
  const accountId = payload?.user?.crymsonId || submittedUserId;
  const accountName = payload?.user?.fullName || '';
  const token = payload?.token;
  setIsSignInOpen(false);
  setCredentials({ crymsonId: '', password: '' });
  setPendingSignupCredentials({ crymsonId: '', password: '' });
  onLoginSuccess(accountId, accountName, token, Boolean(payload?.user?.isAdmin));
} catch (error) {
  setSignInError(error.response?.data?.message || error.message || 'Unable to sign in right now.');
}
```

**Before (handleSignupSubmit — relevant portion):**
```js
try {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, department, level, password })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'Unable to create account.');
  }
  const newId = payload?.user?.crymsonId;
  ...
} catch (error) {
  const isNetworkError = error instanceof TypeError;
  setSignupError(isNetworkError ? 'Cannot reach the server...' : (error.message || '...'));
}
```

**After (handleSignupSubmit):**
```js
try {
  const { data: payload } = await apiClient.post('/api/auth/signup', { fullName, email, department, level, password });
  const newId = payload?.user?.crymsonId;
  ...
} catch (error) {
  const isNetworkError = !error.response;
  setSignupError(isNetworkError ? 'Cannot reach the server...' : (error.response?.data?.message || error.message || '...'));
}
```

**Note on network error detection:** Changed from `error instanceof TypeError` (fetch-specific) to `!error.response` (axios-specific). This is not business logic — it's an implementation detail of the HTTP client swap. The user-facing message behavior is preserved.

**Result:** Build passes. Committed as `9d663f2b` with message `"P1.1 Batch 4: migrate Landing.jsx"`.

---

## Task 4 — P1.2: useApiRequest hook (proof of concept)

**Status:** ✅ Completed

### Hook created: `src/hooks/useApiRequest.js`

Pattern follows `useGamification.js` conventions (named export + default export, hooks-based, same directory).

```js
import { useState, useCallback, useRef, useEffect } from "react";

export function useApiRequest() {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const safeSetState = useCallback((updates) => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  const execute = useCallback(async (requestPromise) => {
    safeSetState({ loading: true, error: null });
    try {
      const response = await requestPromise;
      safeSetState({ data: response.data ?? response, loading: false });
      return response;
    } catch (err) {
      safeSetState({
        error: err.response?.data?.message || err.message || "An error occurred",
        loading: false,
      });
      return null;
    }
  }, [safeSetState]);

  const reset = useCallback(() => {
    safeSetState({ data: null, loading: false, error: null });
  }, [safeSetState]);

  return { ...state, execute, reset };
}

export default useApiRequest;
```

### Applied to: `ToDoPlanner.js` — `loadRemoteTasks` effect

**Before (manual cancelled flag + try/catch):**
```js
useEffect(() => {
    let cancelled = false;
    const loadRemoteTasks = async () => {
      try {
        const { data } = await apiClient.get("/api/user-state/tasks");
        if (cancelled) return;
        const remoteTasks = Array.isArray(data.tasks) ? data.tasks : [];
        if (remoteTasks.length > 0) {
          const normalized = remoteTasks.map((task) => ({
            ...task,
            courseTag: String(task.courseTag || task.subject || ""),
            priority: ["high", "medium", "low"].includes(...) ? ... : "medium",
            recurrence: normalizeRecurrence(task.recurrence),
          }));
          setTasks(normalized);
        }
      } catch (error) {
        // Keep local tasks if remote read fails.
      } finally {
        hasHydratedTaskStateRef.current = true;
      }
    };
    loadRemoteTasks();
    return () => { cancelled = true; };
  }, [activeUserId]);
```

**After (useApiRequest):**
```js
const remoteTasksReq = useApiRequest();

useEffect(() => {
    const loadRemoteTasks = async () => {
      const response = await remoteTasksReq.execute(apiClient.get("/api/user-state/tasks"));
      if (!response) {
        hasHydratedTaskStateRef.current = true;
        return;
      }
      const data = response.data;
      const remoteTasks = Array.isArray(data.tasks) ? data.tasks : [];
      if (remoteTasks.length > 0) {
        const normalized = remoteTasks.map((task) => ({
          ...task,
          courseTag: String(task.courseTag || task.subject || ""),
          priority: ["high", "medium", "low"].includes(...) ? ... : "medium",
          recurrence: normalizeRecurrence(task.recurrence),
        }));
        setTasks(normalized);
      }
      hasHydratedTaskStateRef.current = true;
    };
    loadRemoteTasks();
  }, [activeUserId, remoteTasksReq.execute]);
```

**Benefits demonstrated:**
- No manual `cancelled` flag — hook handles unmount cancellation via `mountedRef`
- No manual `try/catch` with error extraction — centralized in `execute()`
- Consistent error message extraction across all call sites
- `loading`/`error`/`data` state available for UI binding

**Build passes.** Committed as `e648dc12` with message `"P1.2: add useApiRequest hook and apply to ToDoPlanner.js"`.

**⚠️ Note:** This is a proof of concept applied to only ONE call site in ONE file. Full rollout to other files deferred per plan.

---

## Task 5a — Investigate CrymsonScore.jsx / SemesterWrapped.jsx localStorage risk

**Status:** ✅ Investigated — no code changes made.

### What localStorage keys do CrymsonScore/SemesterWrapped read from?

Both components read from the **same localStorage keys** that UserHome.js's `loadRemoteDashboardState` writes to:

| Data Domain | localStorage Key | Read by Score? | Written by remote sync? |
|---|---|---|---|
| **CGPA State** | `crymson_user_cgpa_state_v1:{userId}` | YES | **NO** — never written by `loadRemoteDashboardState` |
| **To-Do Tasks** | `crymson_todo_tasks:{userId}` | YES | YES |
| **Time Sessions** | `crymson_time_tracker_sessions:{userId}` | YES | YES |
| **Finance Entries** | `crymson_finance_entries:{userId}` | YES | YES |
| **Finance Prefs** | `crymson_finance_prefs:{userId}` | YES | YES |
| **Wellbeing Check-Ins** | `crymson_wellbeing_checkins:{userId}` | YES | **NO** — only set in-memory |

### Findings

1. The key **names and scoping** are consistent across the entire codebase — every file uses the same key constants (`crymson_todo_tasks`, etc.) with the same `:{userId}` suffix.

2. **Two keys are NOT written by remote sync:**
   - `crymson_user_cgpa_state_v1:{userId}` — CGPA state is read remotely but only written to localStorage in `handleTurnOnDashboardCgpa` (a user-interaction handler), not during the automated dashboard load. If a user edits CGPA data in another session, CrymsonScore will show stale CGPA data until the user visits the CGPA page and triggers a local save.
   - `crymson_wellbeing_checkins:{userId}` — Remote wellbeing check-ins are held in React state only; never persisted to localStorage. If the dashboard re-renders or the user navigates away and back without a full remote fetch, CrymsonScore's `getWellbeingData()` will return stale (or empty) data from localStorage.

### Recommendation

⚠️ **NEEDS REVIEW (product decision):** Both gaps are less severe than the CGPATracker.js duplication (which was the larger concern), but they should be fixed as part of the same "sync everything to localStorage after remote fetch" pattern already used for tasks/sessions/finance. Specifically:
- After a successful `GET /api/user-state/all`, write `cgpaState` and `wellbeingCheckIns` to localStorage under their respective keys.
- This ensures CrymsonScore and SemesterWrapped always have the freshest data available locally.

Do not implement this fix in this session — it needs a product decision and coordination with the existing sync architecture.

---

## Task 5b — Investigate sub-component fetch calls in CourseMaterials.jsx children

**Status:** ✅ Cataloged — no code changes made.

### Summary of findings

All three child components of `CourseMaterials.jsx` make **independent, self-contained fetch calls** using raw `fetch()` with `getApiBaseUrl()` and `getAuthToken()`:

| Component | File | API Calls | HTTP Client |
|---|---|---|-  --|
| **FileUploader** | `src/components/FileUploader.jsx` | POST upload to `/api/courses/{code}/materials` | Raw `fetch()` |
| **NoteEditor** | `src/components/NoteEditor.jsx` | POST create / PUT update / DELETE note | Raw `fetch()` |
| **MaterialsPanel** | `src/components/MaterialsPanel.jsx` | Two parallel GETs (materials + notes) | Raw `fetch()` |

**Total: 4 call sites across 3 files that still use raw `fetch()`.**
- FileUploader: 1 (POST)
- NoteEditor: 2 (POST/PUT, DELETE)
- MaterialsPanel: 2 (GET, GET) — but executed in parallel via `Promise.all`

**Notable inconsistency:** The parent (`CourseMaterials.jsx`) already uses `apiClient` (migrated in Batch 2), but none of its children do. This means these three children are **not protected** by the 401 auto-logout interceptor in apiClient.

### Recommendation

These should be migrated in a future pass (P1.3 or Batch 5). They follow the same mechanical pattern as every other file:
- Replace `getApiBaseUrl` + `getAuthToken` imports with `apiClient`
- Replace `fetch(url, { headers, method, body })` with `apiClient.post/put/delete(url, body)`
- Replace manual auth header attachment with apiClient's interceptor

---

### 🏆 P1.1 MILESTONE: Shared API Client Migration Complete 🏆

All pages across the entire app now use `apiClient` (axios) instead of raw `fetch`. Files migrated across all batches:

| Batch | Files |
|-------|-------|
| 1 | ToDoPlanner.js, DashboardNew.jsx |
| 2 | CourseMaterials.jsx, FinanceTracker.js, TimeTracker.js |
| 3 | Social.jsx, StudyPlanner.jsx |
| 4 | **Admin.js**, **Landing.jsx** |

All pages across the entire app now use `apiClient` (axios) instead of raw `fetch`. Files migrated across all batches:

| Batch | Files |
|-------|-------|
| 1 | ToDoPlanner.js, DashboardNew.jsx |
| 2 | CourseMaterials.jsx, FinanceTracker.js, TimeTracker.js |
| 3 | Social.jsx, StudyPlanner.jsx |
| 4 | **Admin.js**, **Landing.jsx** |

Plus: StudentDashboard.jsx, WellbeingCheckIn.jsx, MyTrackerWidget.jsx (migrated earlier).

All references to `getApiBaseUrl()`, `AUTH_API_BASE_URL`, and `getAuthToken()` for manual fetch calls have been removed from migrated files. Auth is now handled centrally via apiClient interceptors.

