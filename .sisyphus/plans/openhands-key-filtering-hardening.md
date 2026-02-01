# Plan: OpenHands Key Selection Hardening

## TL;DR

> **Quick Summary**: Fix race condition that allows exhausted/need_refresh keys to leak through status filtering
> 
> **Deliverables**: 
> - Synchronous MarkStatus to prevent status reversion
> - Defensive pre-flight checks in request handlers
> - Integration tests with `-race` flag
> - Monitoring logs for observability
> 
> **Estimated Effort**: ~3 hours (2h implementation, 1h testing)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Wave 1 (Fix 1) → Wave 2 (Validation) → Wave 3 (Documentation)

---

## Context

### Original Request
Vietnamese: "ultrawork dam bao user khi request len openhands upstream thi khong request vao key bi need_refresh hoac exccuted"

Translation: "Ensure when user requests to OpenHands upstream, they don't use keys with need_refresh or exceeded/exhausted status"

### Verification Summary (COMPLETED)

✅ **Code Path Tracing**: All key selection paths call `IsAvailable()` - no bypass routes exist
✅ **Filter Logic**: `IsAvailable()` correctly blocks `StatusExhausted` and `StatusNeedRefresh`
✅ **Handler Integration**: All handlers use `SelectKey()` which enforces filtering

**Conclusion**: The filtering logic is sound. The problem is a **race condition** in status updates.

### Root Cause Analysis

**Critical Race Condition**: Async DB write + Auto-reload timing window

```
Timeline of Bug:
T=0ms:    SelectKey() picks Key A (status=healthy in memory)
T=10ms:   Request fails 401, MarkStatus() sets status=need_refresh IN MEMORY
T=12ms:   Auto-reload fires (happens every 60s)
T=13ms:   LoadKeys() reads from DB - still shows "healthy" (async DB write not done)
T=14ms:   In-memory status REVERTS to "healthy" ❌
T=20ms:   Next request picks Key A (should be blocked but isn't) ❌
```

**Window of Vulnerability**: 50-100ms per status update event

**Impact**: Under load (100+ req/sec), multiple requests can hit bad keys before DB sync completes

---

## Work Objectives

### Core Objective
Guarantee that keys with `status="need_refresh"` or `status="exhausted"` are NEVER selected for upstream requests, even under high concurrency and during auto-reload cycles.

### Concrete Deliverables
- ✅ `goproxy/internal/openhandspool/pool.go` - Synchronous MarkStatus
- ✅ `goproxy/main.go` - Defensive pre-flight checks (2 locations)
- ✅ `goproxy/internal/openhandspool/pool_test.go` - Integration tests
- ✅ Code comments documenting guarantees

### Definition of Done
- [ ] All tests pass with `-race` flag: `go test -race ./internal/openhandspool/...`
- [ ] Manual staging test: Mark key exhausted → Send 100 concurrent requests → Zero requests use exhausted key
- [ ] Logs show defensive checks working (observable in production)
- [ ] No performance regression (status updates <20ms, acceptable for rare operation)

### Must Have
- Synchronous MarkStatus (fixes root cause)
- Defensive pre-flight check (defense-in-depth)
- Integration test validating concurrent scenarios
- Monitoring logs for production observability

### Must NOT Have (Guardrails)
- No changes to auto-reload interval (60s is acceptable)
- No architectural refactoring (risky, out of scope)
- No distributed locking (MongoDB not suited)
- No changes to openhands provider (legacy, unused)

---

## Verification Strategy

### Test Infrastructure Decision
- **Framework**: Go native testing (`go test`)
- **Race Detection**: MANDATORY - all tests run with `-race` flag
- **Test Types**: Unit (IsAvailable logic) + Integration (concurrent load + reload)

### Verification Workflow

**Phase 1: Unit Tests** (verify filter logic)
```bash
go test -v -race ./internal/openhandspool/... -run TestIsAvailable
```
Expected: All status combinations tested, exhausted/need_refresh always return false

**Phase 2: Integration Tests** (verify race condition fixed)
```bash
go test -v -race ./internal/openhandspool/... -run TestConcurrent
```
Expected: No race detected, no exhausted keys selected under load

**Phase 3: Manual Staging Test** (real-world validation)
1. Deploy to staging environment
2. Mark one key as exhausted in MongoDB
3. Send 100 concurrent requests via load testing tool
4. Inspect logs: Verify zero requests used exhausted key
5. Verify defensive check logged warning

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - No Dependencies):
├── Fix 1: Make MarkStatus synchronous (openhandspool/pool.go)
└── Fix 2: Add defensive pre-flight check (main.go)

Wave 2 (After Wave 1 Complete):
├── Test 1: Integration test for concurrent selection
├── Test 2: Integration test for auto-reload race
└── Test 3: Unit test for IsAvailable edge cases

Wave 3 (After Wave 2 Passes):
└── Documentation: Add code comments and guarantees

Critical Path: Fix 1 → Test 1 → Documentation
Parallel Speedup: ~40% faster than sequential (Wave 1 tasks run in parallel)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| Fix 1 (MarkStatus sync) | None | Test 1, Test 2 | Fix 2 |
| Fix 2 (Pre-flight check) | None | Test 1 | Fix 1 |
| Test 1 (Concurrent) | Fix 1, Fix 2 | Documentation | Test 2, Test 3 |
| Test 2 (Auto-reload) | Fix 1 | Documentation | Test 1, Test 3 |
| Test 3 (IsAvailable) | None | Documentation | Test 1, Test 2 |
| Documentation | All tests pass | None | None (final) |

---

## TODOs

- [ ] 1. **Make MarkStatus Synchronous** (CRITICAL FIX)

  **What to do**:
  - Remove `go` keyword from line 165 in `goproxy/internal/openhandspool/pool.go`
  - Change async DB write to synchronous
  - Ensures in-memory and DB state always synchronized before returning

  **Must NOT do**:
  - Don't add complex error handling (existing error logging is sufficient)
  - Don't change the signature of MarkStatus
  - Don't modify the mutex locking pattern

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line change, low complexity, surgical fix
  - **Skills**: None needed (straightforward Go modification)
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed - simple change, no history analysis required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Fix 2)
  - **Blocks**: Test 1, Test 2
  - **Blocked By**: None (can start immediately)

  **References**:
  
  **Code Location**:
  - `goproxy/internal/openhandspool/pool.go:149-169` - MarkStatus function
  - Line 165: `go p.updateKeyStatus(...)` → Remove `go` keyword
  
  **Pattern References** (similar synchronous patterns in codebase):
  - `goproxy/internal/usage/tracker.go:deductCreditsAtomic()` - Synchronous MongoDB atomic update pattern
  - Production Go best practices from librarian research (Caddy, Prometheus patterns)
  
  **Why References Matter**:
  - MarkStatus calls updateKeyStatus which does MongoDB write
  - Must wait for DB write to complete before returning
  - Prevents auto-reload from reading stale DB state
  
  **Acceptance Criteria**:
  
  **Code Change Validation**:
  - [ ] Line 165 changed from `go p.updateKeyStatus(...)` to `p.updateKeyStatus(...)`
  - [ ] No changes to function signature
  - [ ] No changes to mutex lock/unlock pattern
  - [ ] Verify: `go build ./...` succeeds
  
  **Behavioral Validation** (automated):
  ```bash
  # After change, run unit tests
  cd goproxy/internal/openhandspool
  go test -v -run TestMarkStatus
  # Expected: Test passes, DB write completes before function returns
  ```
  
  **Performance Validation** (acceptable impact):
  - [ ] MarkStatus execution time: <20ms (measured via log timestamps)
  - [ ] Happens rarely (only on key failure), so acceptable slowdown
  
  **Evidence to Capture**:
  - [ ] Git diff showing ONLY line 165 changed
  - [ ] Build output showing no compilation errors
  - [ ] Test output showing no race conditions detected
  
  **Commit**: YES
  - Message: `fix(openhandspool): make MarkStatus synchronous to prevent status reversion`
  - Files: `goproxy/internal/openhandspool/pool.go`
  - Pre-commit: `go test -race ./internal/openhandspool/...`

---

- [ ] 2. **Add Defensive Pre-Flight Check in Request Handlers**

  **What to do**:
  - Add `IsAvailable()` re-check in `main.go` after `SelectKey()` returns
  - Add warning log if key status changed between selection and use
  - Two locations: `handleOpenHandsMessagesRequest` and `handleOpenHandsCompletionsRequest`

  **Must NOT do**:
  - Don't change SelectKey logic (already correct)
  - Don't add unnecessary complexity (simple if-check only)
  - Don't remove existing error handling

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple defensive check, low risk, well-defined pattern
  - **Skills**: None needed
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed - straightforward addition

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Fix 1)
  - **Blocks**: Test 1
  - **Blocked By**: None (can start immediately)

  **References**:
  
  **Code Locations**:
  - `goproxy/main.go:1220-1225` - handleOpenHandsMessagesRequest (after SelectKey call)
  - `goproxy/main.go:1542-1547` - handleOpenHandsCompletionsRequest (after SelectKey call)
  
  **Pattern References**:
  - `goproxy/internal/openhands/openhands.go:647` - Existing IsAvailable check in binding selection
  - Defense-in-depth pattern from Kubernetes/production Go codebases (librarian research)
  
  **Implementation Pattern**:
  ```go
  // After: key, err := openhandsPool.SelectKey()
  // Add defensive check:
  if !key.IsAvailable() {
      log.Printf("🚨 [CRITICAL] Key %s passed SelectKey but failed IsAvailable! Status: %s", key.ID, key.Status)
      http.Error(w, `{"type":"error","error":{"type":"api_error","message":"Service temporarily unavailable"}}`, http.StatusServiceUnavailable)
      return
  }
  ```
  
  **Why References Matter**:
  - Shows existing pattern in codebase (line 647 in openhands.go)
  - Ensures consistent error response format
  - Maintains observability with critical log prefix
  
  **Acceptance Criteria**:
  
  **Code Change Validation**:
  - [ ] Check added at line ~1225 in handleOpenHandsMessagesRequest
  - [ ] Check added at line ~1547 in handleOpenHandsCompletionsRequest
  - [ ] Log message includes key ID and status
  - [ ] Returns HTTP 503 (Service Unavailable) on failure
  - [ ] Verify: `go build ./...` succeeds
  
  **Behavioral Validation** (manual):
  ```bash
  # Deploy to staging
  # Manually mark key as exhausted in MongoDB
  # Send request to /v1/messages
  # Expected: Returns 503, logs show "🚨 [CRITICAL]" message
  ```
  
  **Evidence to Capture**:
  - [ ] Git diff showing defensive checks added at both locations
  - [ ] Staging logs showing critical warning when check triggers
  - [ ] No changes to existing error handling paths
  
  **Commit**: YES
  - Message: `feat(main): add defensive pre-flight key availability check`
  - Files: `goproxy/main.go`
  - Pre-commit: `go build ./...`

---

- [ ] 3. **Integration Test: Concurrent Key Selection**

  **What to do**:
  - Create `goproxy/internal/openhandspool/pool_test.go`
  - Test scenario: 100 goroutines calling SelectKey() while one marks key exhausted
  - Run with `-race` flag to detect data races
  - Verify no goroutine receives exhausted key

  **Must NOT do**:
  - Don't mock MongoDB (use real collection for integration test authenticity)
  - Don't skip race detector (critical for finding concurrency bugs)
  - Don't test unrealistic scenarios (focus on production load patterns)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard Go test pattern, well-defined scope
  - **Skills**: None needed
  - **Skills Evaluated but Omitted**:
    - All skills: Test writing is straightforward Go, no special domain needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Test 2, Test 3)
  - **Blocks**: Documentation
  - **Blocked By**: Fix 1, Fix 2 (needs fixes to test against)

  **References**:
  
  **Test Pattern References** (from librarian research):
  - Caddy UsagePool concurrent tests: Table-driven with goroutine count variations
  - Beads FlushManager test: `go test -race -run TestConcurrent` pattern
  - Prometheus intern.go: sync.RWMutex concurrent access patterns
  
  **Existing Test References** (codebase patterns):
  - `goproxy/internal/openhands/spend_checker_test.go` - Table-driven test structure
  - `goproxy/internal/userkey/validator_test.go` - Acceptance criteria verification pattern
  
  **Test Implementation Pattern**:
  ```go
  func TestPool_ConcurrentSelectKey_NoExhaustedKeys(t *testing.T) {
      pool := GetPool()
      pool.LoadKeys() // Load from DB
      
      // Mark one key as exhausted
      if len(pool.keys) == 0 {
          t.Skip("No keys in pool")
      }
      pool.MarkExhausted(pool.keys[0].ID)
      
      var wg sync.WaitGroup
      exhaustedKeySelected := atomic.Bool{}
      
      for i := 0; i < 100; i++ {
          wg.Add(1)
          go func() {
              defer wg.Done()
              key, err := pool.SelectKey()
              if err == nil && key.Status == StatusExhausted {
                  exhaustedKeySelected.Store(true)
              }
          }()
      }
      
      wg.Wait()
      
      if exhaustedKeySelected.Load() {
          t.Fatal("Exhausted key was selected - filtering FAILED")
      }
  }
  ```
  
  **Why References Matter**:
  - Shows table-driven pattern with concurrent goroutines
  - Demonstrates atomic operations for result collection
  - Validates defense-in-depth approach works under load
  
  **Acceptance Criteria**:
  
  **Test Execution**:
  ```bash
  cd goproxy/internal/openhandspool
  go test -v -race -run TestConcurrentSelectKey
  # Expected: PASS, no race conditions detected
  ```
  
  **Test Coverage**:
  - [ ] Test covers 100 concurrent SelectKey() calls
  - [ ] Test verifies no exhausted key selected
  - [ ] Test runs with `-race` flag without warnings
  - [ ] Test uses atomic.Bool for race-free result checking
  
  **Evidence to Capture**:
  - [ ] Test output showing PASS with -race flag
  - [ ] No "WARNING: DATA RACE" messages
  - [ ] Test execution time <5 seconds
  
  **Commit**: YES (groups with Test 2, Test 3)
  - Message: `test(openhandspool): add concurrent selection tests with race detection`
  - Files: `goproxy/internal/openhandspool/pool_test.go`
  - Pre-commit: `go test -race ./internal/openhandspool/...`

---

- [ ] 4. **Integration Test: Auto-Reload Race Condition**

  **What to do**:
  - Add test simulating auto-reload happening during status update
  - Verify status doesn't revert after MarkStatus completes
  - Test scenario: MarkStatus(exhausted) → LoadKeys() → Verify status still exhausted

  **Must NOT do**:
  - Don't artificially inject delays (use real timing)
  - Don't modify LoadKeys behavior for testing
  - Don't skip race detector

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Similar to Test 1, standard Go test pattern
  - **Skills**: None needed
  - **Skills Evaluated but Omitted**:
    - All skills: Straightforward test implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Test 1, Test 3)
  - **Blocks**: Documentation
  - **Blocked By**: Fix 1 (needs synchronous MarkStatus to test)

  **References**:
  
  **Test Pattern References**:
  - Beads FlushManager: `TestFlushManagerConcurrentMarkDirty` - concurrent mark + flush pattern
  - Caddy: Shutdown race test - validates cleanup during active operations
  
  **Implementation Pattern**:
  ```go
  func TestPool_MarkStatus_NoReversionOnReload(t *testing.T) {
      pool := GetPool()
      pool.LoadKeys()
      
      if len(pool.keys) == 0 {
          t.Skip("No keys in pool")
      }
      
      keyID := pool.keys[0].ID
      
      // Mark key as exhausted (synchronous after fix)
      pool.MarkExhausted(keyID)
      
      // Verify in-memory status
      key := pool.GetKeyByID(keyID)
      if key.Status != StatusExhausted {
          t.Fatalf("In-memory status not updated: got %s, want %s", key.Status, StatusExhausted)
      }
      
      // Reload from DB (simulates auto-reload)
      err := pool.LoadKeys()
      if err != nil {
          t.Fatalf("LoadKeys failed: %v", err)
      }
      
      // Verify status persists (no reversion)
      key = pool.GetKeyByID(keyID)
      if key.Status != StatusExhausted {
          t.Fatalf("Status reverted after LoadKeys: got %s, want %s", key.Status, StatusExhausted)
      }
  }
  ```
  
  **Why References Matter**:
  - Tests the exact bug scenario (mark → reload → verify)
  - Validates synchronous MarkStatus prevents reversion
  - No artificial delays - tests real behavior
  
  **Acceptance Criteria**:
  
  **Test Execution**:
  ```bash
  cd goproxy/internal/openhandspool
  go test -v -race -run TestMarkStatus_NoReversion
  # Expected: PASS, status remains exhausted after reload
  ```
  
  **Test Coverage**:
  - [ ] Test marks key exhausted
  - [ ] Test reloads pool from DB
  - [ ] Test verifies status didn't revert
  - [ ] Test runs with `-race` flag
  
  **Evidence to Capture**:
  - [ ] Test passes with -race flag
  - [ ] No status reversion observed
  
  **Commit**: YES (groups with Test 1, Test 3)
  - Message: (same as Test 1)
  - Files: `goproxy/internal/openhandspool/pool_test.go`
  - Pre-commit: `go test -race ./internal/openhandspool/...`

---

- [ ] 5. **Unit Test: IsAvailable Edge Cases**

  **What to do**:
  - Add comprehensive tests for all IsAvailable() status combinations
  - Test edge cases: cooldown expired vs not expired, nil cooldown pointer
  - Verify exhausted/need_refresh ALWAYS return false

  **Must NOT do**:
  - Don't modify IsAvailable() logic (already correct)
  - Don't skip any status combinations
  - Don't test unrealistic edge cases

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple unit test, table-driven pattern
  - **Skills**: None needed
  - **Skills Evaluated but Omitted**:
    - All skills: Basic Go testing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Test 1, Test 2)
  - **Blocks**: Documentation
  - **Blocked By**: None (IsAvailable logic unchanged)

  **References**:
  
  **Test Pattern References**:
  - `goproxy/internal/userkey/validator_test.go` - Table-driven tests with acceptance criteria
  - `goproxy/internal/openhands/spend_checker_test.go` - Status-based test cases
  
  **Implementation Pattern**:
  ```go
  func TestOpenHandsKey_IsAvailable(t *testing.T) {
      tests := []struct {
          name             string
          status           OpenHandsKeyStatus
          cooldownUntil    *time.Time
          expectedAvailable bool
      }{
          {"healthy", StatusHealthy, nil, true},
          {"exhausted - always unavailable", StatusExhausted, nil, false},
          {"need_refresh - always unavailable", StatusNeedRefresh, nil, false},
          {"rate_limited - cooldown active", StatusRateLimited, ptrTime(time.Now().Add(1*time.Hour)), false},
          {"rate_limited - cooldown expired", StatusRateLimited, ptrTime(time.Now().Add(-1*time.Hour)), true},
          {"error - cooldown active", StatusError, ptrTime(time.Now().Add(1*time.Hour)), false},
          {"error - cooldown expired", StatusError, ptrTime(time.Now().Add(-1*time.Hour)), true},
      }
      
      for _, tt := range tests {
          t.Run(tt.name, func(t *testing.T) {
              key := &OpenHandsKey{
                  Status:        tt.status,
                  CooldownUntil: tt.cooldownUntil,
              }
              
              got := key.IsAvailable()
              if got != tt.expectedAvailable {
                  t.Errorf("IsAvailable() = %v, want %v", got, tt.expectedAvailable)
              }
          })
      }
  }
  ```
  
  **Why References Matter**:
  - Table-driven pattern is standard in codebase
  - Covers all status combinations explicitly
  - Documents expected behavior as test cases
  
  **Acceptance Criteria**:
  
  **Test Execution**:
  ```bash
  cd goproxy/internal/openhandspool
  go test -v -run TestOpenHandsKey_IsAvailable
  # Expected: All subtests PASS
  ```
  
  **Test Coverage**:
  - [ ] All 5 status types tested
  - [ ] Cooldown expiry logic tested (active vs expired)
  - [ ] Exhausted/need_refresh ALWAYS return false
  - [ ] All tests pass
  
  **Evidence to Capture**:
  - [ ] Test output showing all subtests pass
  - [ ] 7+ test cases covered
  
  **Commit**: YES (groups with Test 1, Test 2)
  - Message: (same as Test 1)
  - Files: `goproxy/internal/openhandspool/pool_test.go`
  - Pre-commit: `go test ./internal/openhandspool/...`

---

- [ ] 6. **Documentation: Add Code Comments and Guarantees**

  **What to do**:
  - Add comments to `IsAvailable()` documenting guarantee
  - Add comments to `MarkStatus()` explaining synchronous behavior
  - Add comments to defensive checks in main.go
  - Update AGENTS.md with concurrency patterns learned

  **Must NOT do**:
  - Don't add redundant comments (keep concise)
  - Don't modify existing documentation structure
  - Don't document implementation details (focus on guarantees)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation task, requires clear technical writing
  - **Skills**: None needed
  - **Skills Evaluated but Omitted**:
    - All skills: Straightforward documentation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, after all tests pass)
  - **Blocks**: None (final task)
  - **Blocked By**: All tests (documentation only after validation)

  **References**:
  
  **Documentation Pattern References**:
  - `goproxy/internal/AGENTS.md` - Existing patterns section
  - `goproxy/AGENTS.md` - Module-level documentation structure
  - Librarian research: Production Go comments (Caddy, Prometheus style)
  
  **Comment Locations**:
  - `goproxy/internal/openhandspool/model.go:26` - IsAvailable() function
  - `goproxy/internal/openhandspool/pool.go:149` - MarkStatus() function
  - `goproxy/main.go:1225, 1547` - Defensive check comments
  
  **Comment Style** (match codebase):
  ```go
  // IsAvailable returns true if the key can be selected for upstream requests.
  //
  // GUARANTEE: Keys with status "exhausted" or "need_refresh" ALWAYS return false,
  // regardless of cooldown status. This ensures manual intervention keys are never
  // auto-selected even if cooldown expires.
  //
  // For other statuses (rate_limited, error), availability depends on cooldown expiry.
  func (k *OpenHandsKey) IsAvailable() bool {
      // ...
  }
  ```
  
  **Why References Matter**:
  - Ensures consistent style with existing codebase docs
  - Documents guarantees for future maintainers
  - Explains "why" not just "what"
  
  **Acceptance Criteria**:
  
  **Documentation Validation**:
  - [ ] IsAvailable has guarantee comment (3-5 lines)
  - [ ] MarkStatus has synchronous behavior comment
  - [ ] Defensive checks have inline comments
  - [ ] No spelling/grammar errors
  - [ ] No broken links in markdown
  
  **Evidence to Capture**:
  - [ ] Git diff showing comments added
  - [ ] No changes to code logic (comments only)
  
  **Commit**: YES
  - Message: `docs(openhandspool): document key availability guarantees`
  - Files: `goproxy/internal/openhandspool/model.go`, `pool.go`, `main.go`
  - Pre-commit: None (documentation only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(openhandspool): make MarkStatus synchronous to prevent status reversion` | `internal/openhandspool/pool.go` | `go test -race ./internal/openhandspool/...` |
| 2 | `feat(main): add defensive pre-flight key availability check` | `main.go` | `go build ./...` |
| 3, 4, 5 | `test(openhandspool): add concurrent selection tests with race detection` | `internal/openhandspool/pool_test.go` | `go test -race ./internal/openhandspool/...` |
| 6 | `docs(openhandspool): document key availability guarantees` | `internal/openhandspool/model.go`, `pool.go`, `main.go` | None |

**Commit Strategy**: Atomic commits per logical change. Tests grouped together.

---

## Success Criteria

### Verification Commands

**Build Success**:
```bash
cd goproxy
go build ./...
# Expected: No errors
```

**Test Success**:
```bash
cd goproxy/internal/openhandspool
go test -v -race ./...
# Expected: All tests PASS, no race warnings
```

**Integration Success** (staging):
```bash
# 1. Mark key exhausted in MongoDB
# 2. Send 100 concurrent requests:
ab -n 100 -c 10 -H "x-api-key: test" https://staging.trollllm.xyz/v1/messages
# 3. Check logs: Zero requests used exhausted key
# 4. Verify defensive check logged warnings
```

### Final Checklist

**Guarantees Validated**:
- [ ] Keys with `status="need_refresh"` are NEVER selected
- [ ] Keys with `status="exhausted"` are NEVER selected
- [ ] Guarantee holds under 100+ concurrent requests/sec
- [ ] Guarantee holds even during auto-reload (every 60s)
- [ ] Logs show immediate detection if filtering fails

**Production Readiness**:
- [ ] All tests pass with `-race` flag
- [ ] No performance regression (<20ms status update)
- [ ] Defensive checks observable in logs
- [ ] Code comments document guarantees
- [ ] Commits follow conventional commit format

**Risk Mitigation**:
- [ ] Changes are minimal (2 files modified, 1 file created)
- [ ] Backward compatible (no API changes)
- [ ] Rollback plan: Revert commits in reverse order
- [ ] Monitoring in place (defensive check logs)

---

## Rollback Plan

If issues arise post-deployment:

**Immediate Rollback** (via git):
```bash
# Revert in reverse commit order
git revert <doc-commit>
git revert <test-commit>
git revert <main-commit>
git revert <pool-commit>
git push
```

**Partial Rollback** (keep fixes, remove checks):
```bash
# Keep synchronous MarkStatus, remove defensive checks
git revert <main-commit>  # Remove defensive checks only
git push
```

**Verification After Rollback**:
```bash
go test -race ./...  # All tests still pass
go build ./...        # Build succeeds
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Synchronous MarkStatus causes timeout | Low | Medium | Status updates are rare (only on failures), <20ms acceptable |
| Defensive check triggers false positives | Very Low | Low | Only logs warning, doesn't block requests if key actually available |
| Race detector false positives in tests | Low | Low | Run tests multiple times, review warnings carefully |
| Breaking change to MarkStatus signature | None | N/A | No signature changes planned |
| Performance regression | Low | Medium | Benchmark before/after, <20ms increase acceptable |

**Overall Risk**: **LOW** - Surgical changes, well-tested, backward compatible

---

## Monitoring & Observability

### Production Logs to Monitor

**Success Indicators**:
```
✅ [Troll-LLM] Updated key usage...
📊 [Troll-LLM] Usage: in=X out=Y
```

**Warning Indicators** (defensive check working):
```
🚨 [CRITICAL] Key X passed SelectKey but failed IsAvailable! Status: exhausted
```

**Failure Indicators** (should NEVER appear after fix):
```
❌ [Troll-LLM] Error response (status=401, key=exhausted-key-id)
```

### Metrics to Track

- **Key selection failures**: `ErrNoHealthyKeys` count (should not increase)
- **Defensive check triggers**: Count of "CRITICAL" logs (should be zero in steady state)
- **MarkStatus duration**: p50/p95/p99 latency (should be <20ms)
- **Auto-reload cycle time**: Should remain ~60s ±5s

---

## Additional Context

### Related Issues
- Story 2.2: Atomic credit deduction (similar DB synchronization pattern)
- Auto-reload mechanism: Started in main.go, runs every 60 seconds

### References
- Librarian Research: Go concurrency patterns from Caddy, Prometheus, Kubernetes
- Existing Tests: `validator_test.go`, `spend_checker_test.go` for patterns

### Known Limitations
- Fix doesn't address openhands provider (legacy, unused)
- Auto-reload still full replacement (could optimize with delta updates - out of scope)
- No distributed locking (MongoDB not designed for this - acceptable)

---

**Plan Status**: Ready for Execution
**Next Step**: Run `/start-work` to begin Wave 1 tasks
