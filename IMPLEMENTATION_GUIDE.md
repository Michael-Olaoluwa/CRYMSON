IMPLEMENTATION GUIDE - CRYMSON ENHANCEMENTS
============================================

COMPLETED IMPLEMENTATIONS
==========================

1. ✅ IndexedDB Integration (src/utils/indexedDB.js)
   - Stores large datasets (tasks, sessions, finance entries, academic events)
   - Falls back gracefully to localStorage for small/critical data
   - Async operations with Promise-based API
   - Pre-indexed fields for efficient queries

   Usage:
   ```javascript
   import { initIndexedDB, putBatch, getAllByUserId, STORES } from '@/utils/indexedDB';

   // Initialize once on app load
   await initIndexedDB();

   // Batch store records
   await putBatch(STORES.TASKS, tasksArray);

   // Query by userId
   const userTasks = await getAllByUserId(STORES.TASKS, userId);
   ```

2. ✅ Data Versioning & Merge System (src/utils/dataVersioning.js)
   - VersionedData wrapper adds timestamps and version numbers
   - Intelligent merge logic: three-way merge with conflict detection
   - ConflictLog tracks sync conflicts for debugging
   - Device ID tracking for cross-device sync awareness

   Usage:
   ```javascript
   import { VersionedData, intelligentMerge, ConflictLog } from '@/utils/dataVersioning';

   // Wrap data with versioning
   const versionedTasks = new VersionedData(tasks, userId);
   versionedTasks.update(newTasks); // Version auto-increments

   // Merge on sync
   const result = intelligentMerge(localVersion, remoteVersion, baseVersion);
   const conflictLog = ConflictLog.fromPersistentStorage();
   ```

3. ✅ Batch Sync System (src/utils/batchSync.js)
   - Combines multiple PUT requests into single /api/user-state/batch-sync call
   - Debounced queuing (500ms default) prevents network spam
   - Auto-deduplicates same dataType in queue
   - Flushes on manual request or queue size exceeded

   Usage:
   ```javascript
   import { batchSync } from '@/utils/batchSync';

   // Queue multiple updates
   batchSync.queueSync('tasks', tasksArray, {version: 1});
   batchSync.queueSync('timeSessions', sessionsArray, {version: 2});

   // Auto-flushes after 500ms OR manually
   await batchSync.forceFlush();
   ```

4. ✅ Rate Limiting (backend/src/middleware/rateLimit.js)
   - Protects login/signup endpoints from brute force
   - Config: 5 attempts per 15 minutes for login, 3 per hour for signup
   - In-memory store (use Redis in production)
   - Auto-cleanup of old entries

   Usage in server.js:
   ```javascript
   const { rateLimitMiddleware } = require('./middleware/rateLimit');

   app.post('/api/auth/login',
     rateLimitMiddleware('login'),
     authController.login
   );
   ```

5. ✅ Audit Logging (backend/src/middleware/auditLog.js)
   - Logs all state changes: action, resource, userId, timestamp, changes
   - Writes to backend/logs/audit.log (JSON lines format)
   - Queryable for compliance/debugging
   - Can replay history of changes

   Usage:
   ```javascript
   const { logStateChange } = require('./middleware/auditLog');

   logStateChange(userId, 'update', 'tasks', {count: 5});
   // Logs to audit.log with full metadata
   ```

6. ✅ Refresh Token System (backend/src/utils/tokenManager.js)
   - Generates access token (15m) + refresh token (7d)
   - Separate JWT signing for each type
   - Verifies token type to prevent mix-ups
   - REFRESH_TOKEN_SECRET from env (fallback to JWT_SECRET)

   Usage:
   ```javascript
   const { generateTokenPair, verifyAccessToken, verifyRefreshToken } = require('./utils/tokenManager');

   const {accessToken, refreshToken} = generateTokenPair(crymsonId);
   const decoded = verifyAccessToken(token);
   ```

7. ✅ Adaptive Notifications (src/utils/adaptiveNotifications.js)
   - Smart delivery based on: quiet hours, priority, user activity, dedup
   - Activity monitoring (click/keydown detection)
   - Quiet hours config (default 10 PM - 8 AM)
   - Priority levels: LOW, MEDIUM, HIGH, CRITICAL
   - Specialized methods for tasks, study, achievements

   Usage:
   ```javascript
   import { adaptiveNotifications, NOTIFICATION_PRIORITY } from '@/utils/adaptiveNotifications';

   // Smart task reminder
   adaptiveNotifications.notifyTaskDue(task, minutesRemaining);

   // Achievement notification (always shows, respects priority)
   adaptiveNotifications.notifyAchievement(badge);
   ```

8. ✅ Gamification System (src/utils/gamification.js)
   - 10 badge types with rarity levels
   - Streak tracking (current, best)
   - Milestone tracking (tasks, finance entries)
   - Time-based badges (early bird, night owl)
   - Progress calculator for next badge

   Usage:
   ```javascript
   import { GamificationEngine, BADGE_TYPES } from '@/utils/gamification';

   const gamEngine = new GamificationEngine(userId);
   gamEngine.updateStreak(sessionDate); // Returns earned badges
   gamEngine.trackTaskCompletion();
   gamEngine.getCompletionStats(); // {streakProgress, tasksProgress, ...}
   ```

9. ✅ Progress Overview Component (src/components/ProgressOverviewCard.jsx/.module.css)
   - Unified dashboard showing CGPA, streak, task completion, week study hours
   - Mini sparkline chart for CGPA trend
   - Color-coded progress indicators (success/warning/alert)
   - Contextual insights based on current performance
   - Responsive 4-column grid → 2-column → 1-column

   Usage in UserHome:
   ```jsx
   <ProgressOverviewCard
     cgpaHistory={cgpaSemesters}
     currentCgpa={cgpa}
     goalCgpa={goalCgpa}
     currentStreak={streak}
     bestStreak={bestStreak}
     taskCompletion={completionRate}
     weekStudyHours={weekHours}
   />
   ```

10. ✅ Gamification Hook (src/hooks/useGamification.js)
    - Custom React hook wrapping GamificationEngine
    - Auto-initializes engine on userId change
    - Exposes tracking methods with badge notifications
    - Auto-updates all related state (badges, progress, stats)

    Usage:
    ```jsx
    const {badges, progress, nextBadge, trackTaskCompletion, updateStreak} = useGamification(userId);
    ```

11. ✅ Badges Panel Component (src/components/BadgesPanel.jsx/.module.css)
    - Displays earned badges in grid
    - Shows next badge with progress hint
    - Rarity indicators
    - Glowing gradient background

    Usage:
    ```jsx
    <BadgesPanel
      badges={badges}
      nextBadge={nextBadge}
      completionStats={completionStats}
    />
    ```

12. ✅ Accessibility Utilities (src/utils/accessibility.js)
    - ARIA label generators for all components
    - Screen reader only CSS helpers
    - Semantic heading level calculator
    - Accessible form field creator
    - Keyboard navigation handlers
    - Number/time formatters for accessibility

    Usage:
    ```javascript
    import {getAriaProgressLabel, handleAccessibleKeydown} from '@/utils/accessibility';

    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={getAriaProgressLabel(current, max, 'Study Progress')}
    />
    ```

13. ✅ Batch Sync Controller (backend/src/controllers/batchSyncController.js)
    - PUT /api/user-state/batch-sync endpoint
    - Accepts: {data: {tasks?, cgpaState?, timeSessions?, finance?}, metadata}
    - Atomic upsert of multiple fields
    - Returns fields updated + MongoDB write results
    - Audit logs the operation


INTEGRATION CHECKLIST
======================

Frontend:
□ Import IndexedDB in App.js and call initIndexedDB() on mount
□ Replace individual PUT requests with batchSync.queueSync() calls
□ Update Timer, ToDoPlanner, TimeTracker, FinanceTracker, MyTrackerWidget
□ Add ProgressOverviewCard to UserHome.js
□ Add BadgesPanel to UserHome.js or dedicated achievements tab
□ Wrap tracking logic with useGamification hook
□ Apply accessibility attributes from accessibility.js
□ Initialize adaptiveNotifications preferences on first load
□ Test IndexedDB quota and implement cleanup for large datasets

Backend:
□ Update server.js to import and mount rate limiting middleware
□ Update server.js to mount batchSyncController.batchSync route
□ Update authController.js to use tokenManager.generateTokenPair()
□ Add refreshToken endpoint for token renewal
□ Import and initialize auditLog middleware
□ Add REFRESH_TOKEN_SECRET to .env.example
□ Verify MongoDB UserState model supports batch updates
□ Add logs/ directory to .gitignore


ENVIRONMENT VARIABLES TO ADD
=============================
Backend .env:
- REFRESH_TOKEN_SECRET (or reuse JWT_SECRET)
- DEBUG_AUDIT (optional, logs audit entries to console)
- BATCH_SYNC_ENABLED (true/false, default true)

Frontend .env (if needed):
- REACT_APP_BATCH_SYNC_DEBOUNCE (ms, default 500)
- REACT_APP_NOTIFICATION_QUIET_START (hour, default 22)
- REACT_APP_NOTIFICATION_QUIET_END (hour, default 8)


TESTING RECOMMENDATIONS
========================

1. Test IndexedDB quota:
   - Create 10,000 fake tasks and verify storage
   - Test graceful degradation on quota exceeded

2. Test batch sync:
   - Queue 50 updates rapidly
   - Verify only 1 network request sent
   - Verify atomicity (all or nothing)

3. Test version merge:
   - Simulate two devices editing same task
   - Verify merge produces sensible result
   - Check conflict log records the event

4. Test rate limiting:
   - Make 10 login attempts rapidly
   - Verify 429 response after 5 attempts
   - Verify automatic cleanup after window

5. Test gamification:
   - Create 7-day study streak
   - Verify badge earned and notification shown
   - Test multi-device sync doesn't duplicate badges

6. Test adaptive notifications:
   - Set quiet hours to now+1 hour
   - Queue reminder
   - Verify NOT shown during quiet period

7. Accessibility testing:
   - Run with screen reader (NVDA, JAWS)
   - Test keyboard-only navigation
   - Verify ARIA labels are descriptive


PERFORMANCE CONSIDERATIONS
===========================

IndexedDB:
- Quota per site: ~50MB typical, varies by browser
- Backup large datasets monthly
- Implement cleanup for entries >1 year old

Batch Sync:
- 500ms debounce balances UX responsiveness vs network efficiency
- Max payload ~5MB (Express limit)
- Implement exponential backoff on failure

Rate Limiting:
- In-memory store fine for <1000 concurrent users
- Migrate to Redis cluster for production
- Monitor cleanup interval for memory leaks

Audit Logging:
- Daily rotation recommended (audit.log.20260505)
- Compress old logs (gzip)
- Consider S3 archival for compliance


MIGRATION PATH FOR EXISTING DATA
===================================

1. On first load after update:
   - Check if UserState documents exist in MongoDB
   - If yes, fetch via GET /api/user-state/all
   - Wrap with VersionedData wrapper
   - Store in IndexedDB using putBatch
   - Mark migration complete in localStorage

2. Gradual localStorage → IndexedDB:
   - Keep reading localStorage if available
   - Prefer IndexedDB on subsequent reads
   - Deprecate localStorage after 30-day transition

3. Refresh token migration:
   - New logins use token pair
   - Old single tokens still valid (7-day window)
   - After expiry, user must re-login for refresh tokens


KNOWN LIMITATIONS
=================

1. Batch sync endpoint must be added to server.js routes manually
   (Not included in default server.js - see Integration Checklist)

2. Rate limiting uses in-memory store
   - State lost on server restart
   - Use Redis for persistent rate limiting in production

3. Audit logs stored as JSON lines text files
   - Not queryable without parsing
   - Recommend ELK/CloudWatch in production

4. Gamification engine stores badges in localStorage
   - At scale (1000s of badges), migrate to IndexedDB
   - Consider server-side badge verification for cheating prevention

5. Adaptive notifications require browser Notification API
   - Not available in some browsers/private modes
   - Gracefully degrades to console warnings

6. IndexedDB not available in private browsing (some browsers)
   - Falls back to localStorage automatically
   - May hit quota limits faster
