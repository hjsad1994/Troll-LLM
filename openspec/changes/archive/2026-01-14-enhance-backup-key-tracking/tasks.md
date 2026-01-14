# Tasks: Enhance Backup Key Tracking

## Overview
Implement 24-hour usage statistics and reduce automatic deletion time from 12 hours to 6 hours for OpenHands backup keys.

## Ordered Task List

### Phase 1: Backend - 24-Hour Statistics
- [x] 1.1 Update `getBackupKeyStats()` in `backend/src/services/openhands.service.ts`
  - Add calculation for keys used in past 24 hours: `countDocuments({ isUsed: true, usedAt: { $gte: new Date(Date.now() - 24*60*60*1000) } })`
  - Return `usedIn24h` field in stats object
  - Verify: Run backend, call API, check response includes `usedIn24h`

- [x] 1.2 Update API response type in backend
  - Update any TypeScript interfaces/types that define the stats response to include `usedIn24h: number`
  - Verify: TypeScript compilation succeeds

### Phase 2: Backend - Deletion Time Calculation (if applicable)
- [x] 2.1 Check if backend calculates `deletesAt` for frontend
  - Search `backend/src/services/openhands.service.ts` for `deletesAt` calculation
  - If found, update from `usedAt + 12h` to `usedAt + 6h`
  - If not found, skip this task (Go proxy handles deletion)

### Phase 3: Go Proxy - Deletion Time Reduction
- [x] 3.1 Update cleanup cutoff time in `goproxy/internal/openhands/backup.go`
  - Line 145: Change `cutoffTime := time.Now().Add(-12 * time.Hour)` to `-6 * time.Hour`
  - Verify: Code compiles successfully

- [x] 3.2 Update cleanup log message in `goproxy/internal/openhands/backup.go`
  - Line 177: Change `"(used > 12h)"` to `"(used > 6h)"` in log message
  - Verify: Log message reflects new 6-hour policy

- [ ] 3.3 Test cleanup job behavior
  - Create test backup key with `usedAt` = 7 hours ago
  - Run cleanup job manually or wait for periodic run
  - Verify: Key is deleted and log shows "Deleted N expired backup keys (used > 6h)"

### Phase 4: Frontend - 24-Hour Stats Display
- [x] 4.1 Update stats interface in `frontend/src/app/(dashboard)/openhands-backup-keys/page.tsx`
  - Add `usedIn24h: number` to the `Stats` interface (around line 25)
  - Update `useState` initial value to include `usedIn24h: 0`
  - Verify: TypeScript compilation succeeds

- [x] 4.2 Add 4th stats card for 24-hour usage
  - Insert new card after the "Used Keys Card" (after line 285)
  - Card should display `stats.usedIn24h` value
  - Use icon: clock or trending icon
  - Color scheme: Use blue/purple theme (e.g., `bg-blue-500/10 border border-blue-500/20`)
  - Label: Use translation key `t.openhandsBackupKeys?.stats?.usedIn24h` or default "Used in 24h"
  - Verify: Card displays correctly in light and dark mode

- [x] 4.3 Update `setStats` call in `loadKeys()` function
  - Around line 84-88, add `usedIn24h: data.usedIn24h || 0`
  - Verify: Stats update correctly when page loads

### Phase 5: Translations
- [x] 5.1 Add English translation for 24h stats
  - Update `frontend/src/lib/i18n.ts`
  - Add `usedIn24h: 'Used in 24h'` to `openhandsBackupKeys.stats` object
  - Verify: Translation appears in UI

- [x] 5.2 Add Vietnamese translation (optional)
  - Add `usedIn24h: 'Đã dùng trong 24h'` to Vietnamese translations
  - Verify: Translation appears when language is set to Vietnamese

### Phase 6: Testing & Validation
- [ ] 6.1 Backend integration test
  - Create 5 backup keys: 2 used today, 2 used yesterday, 1 available
  - Call `GET /admin/openhands/backup-keys`
  - Verify: `usedIn24h` returns `2`
  - Verify: `total: 5, available: 1, used: 4, usedIn24h: 2`

- [ ] 6.2 Frontend UI test
  - Load OpenHands Backup Keys page
  - Verify: 4 stats cards displayed (Total, Available, Used, Used in 24h)
  - Verify: All values match backend data
  - Verify: Cards are responsive on mobile

- [ ] 6.3 Deletion time test
  - Create backup key and mark as used with `usedAt` = 5 hours ago
  - Verify: Countdown shows ~1h remaining
  - Verify: Key not deleted by cleanup job
  - Wait or manually set `usedAt` = 7 hours ago
  - Run cleanup job
  - Verify: Key is deleted

- [ ] 6.4 End-to-end test
  - Simulate key rotation (trigger a key failure)
  - Verify: Backup key is used, `usedAt` is set
  - Verify: `usedIn24h` count increases by 1
  - Verify: Countdown starts at 6h
  - Wait 6+ hours (or mock time)
  - Verify: Key is auto-deleted

### Phase 7: Documentation
- [x] 7.1 Update inline comments if needed
  - Review `backup.go` comments mentioning "12 hours"
  - Update to "6 hours" where applicable
  - Verify: All comments are accurate

## Dependencies
- Phase 2 can run in parallel with Phase 1
- Phase 3 requires Phase 2 completion (or skip if backend doesn't calculate deletesAt)
- Phase 4 requires Phase 1 completion (backend must return `usedIn24h`)
- Phase 5 can run in parallel with Phase 4
- Phase 6 requires all previous phases completed

## Validation Checklist
- [x] API response includes `usedIn24h` field
- [x] Frontend displays 4th stats card with correct value
- [ ] Cleanup job deletes keys older than 6 hours
- [ ] Cleanup job preserves keys younger than 6 hours
- [ ] Cleanup job never deletes available keys
- [x] Log messages show "(used > 6h)"
- [x] Frontend countdown reflects 6-hour window
- [x] Translations are present in English (Vietnamese optional)
- [x] No TypeScript compilation errors
- [x] No Go compilation errors
- [ ] Manual testing confirms all scenarios work

## Rollback Plan
If issues arise:
1. Revert Go proxy changes: Change `cutoffTime` back to `-12 * time.Hour`
2. Revert backend: Remove `usedIn24h` calculation
3. Revert frontend: Remove 4th stats card
4. Redeploy previous version

## Notes
- The frontend countdown calculation (`getDeleteCountdown`) already works dynamically, no changes needed
- Ensure cleanup job is running (started in `main.go` via `StartBackupKeyCleanupJob`)
- Consider adding monitoring/alerts if `usedIn24h` is unusually high (indicates high key failure rate)
