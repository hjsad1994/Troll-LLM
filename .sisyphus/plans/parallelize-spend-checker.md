# Parallelize Spend Checker

## TL;DR

> **Quick Summary**: Replace sequential key checking loop in `checkAllKeys()` with parallel goroutines using `sync.WaitGroup`. All keys checked simultaneously instead of one-by-one (~1 second each).
> 
> **Deliverables**:
> - Modified `goproxy/internal/openhands/spend_checker.go` (checkAllKeys function)
> - All keys checked in parallel with simultaneous timestamps
> - All existing functionality preserved (rotation, logging, history)
> 
> **Estimated Effort**: Quick (single function refactor, well-defined pattern)
> **Parallel Execution**: NO - sequential (one file, one function)
> **Critical Path**: Read source → Apply pattern → Test

---

## Context

### Original Request
User wants to modify TrollLLM's Go proxy spend checker to check all API keys in PARALLEL instead of sequentially. Current logs show keys checked one-by-one with ~1 second delay per key. Goal: All keys checked simultaneously (same timestamp).

### Interview Summary
**Key Requirements**:
- Check multiple keys in parallel "as fast as possible"
- No concern about API spam (unlimited concurrency)
- Logs should show simultaneous timestamps (current timestamps show sequential behavior)
- Preserve ALL existing functionality (rotation, error handling, logging, history)

**Technical Context**:
- File: `goproxy/internal/openhands/spend_checker.go`
- Function: `checkAllKeys()` (lines 155-236)
- Pattern to follow: `healthcheck.go` lines 71-79 (WaitGroup pattern)
- All operations verified as thread-safe

### Gap Analysis
**Verified Safe**:
- All critical functions are thread-safe (checkKeySpend, updateKeySpendInfo, saveSpendHistory)
- Rotation has mutex protection + atomic MongoDB operations + idempotency checks
- MongoDB driver handles concurrent operations (100 connection pool)
- HTTP client is thread-safe per Go documentation

**Edge Cases Addressed**:
- Empty keys list → WaitGroup with 0 goroutines (safe)
- All keys filtered → No goroutines launched (safe)
- Concurrent rotation attempts → Idempotency check prevents double-rotation
- Key rotated during check → Graceful failure (non-critical)

---

## Work Objectives

### Core Objective
Replace the sequential `for` loop in `checkAllKeys()` with parallel goroutines using `sync.WaitGroup` to check all healthy keys simultaneously.

### Concrete Deliverables
- Modified `goproxy/internal/openhands/spend_checker.go` (checkAllKeys function only)
- Log output shows simultaneous timestamps for all key checks

### Definition of Done
- [ ] All healthy keys checked in parallel
- [ ] Log timestamps show simultaneity (within ±1 second)
- [ ] All existing functionality preserved (rotation, budget checks, error handling)
- [ ] No race conditions or data corruption
- [ ] Existing tests pass (if tests exist for spend_checker)
- [ ] Code follows healthcheck.go WaitGroup pattern

### Must Have
- Parallel execution using `sync.WaitGroup`
- Pass loop variable as goroutine parameter (avoid capture bug)
- Preserve exact log format: `💵 [SpendChecker] %s: $%.2f / $%.2f (%.1f%%)`
- All business logic unchanged (budget exceeded, proactive rotation, error handling)
- History saving in all cases

### Must NOT Have (Guardrails)
- ❌ NO changes to function signatures (checkAllKeys, checkKeySpend, etc.)
- ❌ NO changes to other files
- ❌ NO concurrency limits / worker pools (user wants unlimited)
- ❌ NO changes to error handling behavior (keep log and continue)
- ❌ NO changes to log format or emoji prefixes
- ❌ NO new dependencies (use stdlib sync.WaitGroup only)
- ❌ NO performance optimizations beyond parallelization
- ❌ NO error aggregation or summary logs (not requested)

---

## Verification Strategy

### Manual Verification (Automated Testing Not Configured)

**Each TODO includes executable verification procedures:**

**For Code Changes**:
- **Command**: `go build ./internal/openhands/...`
  - **Expected**: Build succeeds, no compilation errors
- **Command**: `go test ./internal/openhands/...`
  - **Expected**: All tests pass (or skip if no tests exist)

**For Runtime Behavior**:
- **Command**: `go run main.go` (with DEBUG=true)
  - **Action**: Trigger spend checker (wait for ticker interval ~0.5s)
  - **Expected Log Pattern**:
    ```
    2026/02/03 HH:MM:SS 💵 [SpendChecker] tai-p6-...: $X.XX / $9.95 (XX.X%)
    2026/02/03 HH:MM:SS 💵 [SpendChecker] tai-p5-...: $X.XX / $9.95 (XX.X%)
    2026/02/03 HH:MM:SS 💵 [SpendChecker] tai-p4-...: $X.XX / $9.95 (XX.X%)
    ```
  - **Verify**: All timestamps within same second (simultaneity)

**For Thread Safety**:
- **Command**: `go test -race ./internal/openhands/...`
  - **Expected**: No race conditions detected
- **Manual Check**: Run for 5-10 minutes, monitor logs for:
  - No duplicate rotations (same key rotated twice)
  - No missing spend updates
  - No DB errors or connection pool exhaustion

**Evidence Requirements**:
- Screenshot or log excerpt showing simultaneous timestamps
- Build output showing successful compilation
- Test output (if tests exist)
- Race detector output (clean)

---

## Execution Strategy

### Sequential Execution Only

This is a single-file, single-function refactor with no parallel opportunities:

```
Task 1: Backup and read current implementation
  ↓
Task 2: Apply WaitGroup pattern from healthcheck.go
  ↓
Task 3: Manual verification (build, test, run)
  ↓
Task 4: Final review and commit
```

**No parallel execution possible** - each step depends on the previous.

---

## TODOs

- [ ] 1. Read and backup current implementation

  **What to do**:
  - Read `goproxy/internal/openhands/spend_checker.go` lines 155-236 carefully
  - Understand the sequential loop structure
  - Identify filter conditions (Status != Healthy, shouldCheckKey)
  - Note the result handling logic (budget exceeded, threshold, errors)
  - Reference healthcheck.go lines 71-79 for the WaitGroup pattern

  **Must NOT do**:
  - Change any logic or business rules
  - Skip understanding rotation handling (lines 178-230)
  - Modify any other functions

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file read and pattern understanding, no complex reasoning needed
  - **Skills**: None needed
    - Reason: Standard Go code reading, no special domain knowledge required

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential Task 1
  - **Blocks**: Task 2 (need understanding before modification)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Current Implementation (sequential pattern)**:
  - `goproxy/internal/openhands/spend_checker.go:155-236` - checkAllKeys() function to modify
  - Lines 163-173: Filter logic (Status check, shouldCheckKey call)
  - Lines 176: Sequential call to checkKeySpend (BLOCKING - this is the problem)
  - Lines 178-197: Budget exceeded handling
  - Lines 200-203: Error handling
  - Lines 206-234: Normal spend logging and proactive rotation

  **Pattern to Follow**:
  - `goproxy/internal/proxy/healthcheck.go:71-79` - WaitGroup pattern for parallel operations
    ```go
    var wg sync.WaitGroup
    for _, proxy := range proxies {
        wg.Add(1)
        go func(p *Proxy) {
            defer wg.Done()
            h.checkProxy(p)
        }(proxy)
    }
    wg.Wait()
    ```
  - Note: Passes loop variable as parameter to avoid capture bug
  - Note: Uses defer wg.Done() for cleanup
  - Note: Blocks on wg.Wait() until all goroutines complete

  **Thread Safety References**:
  - `goproxy/internal/openhands/spend_checker.go:390-414` - updateKeySpendInfo() has mutex protection
  - `goproxy/internal/openhands/backup.go:199` - RotateKey() has mutex protection and atomic operations
  - Lines 116-132 in rotation.go: Mutex locks in-memory update

  **Acceptance Criteria**:
  - [ ] Read and understand current checkAllKeys() implementation
  - [ ] Identify all filter conditions that run before checkKeySpend
  - [ ] Understand result handling for all cases (budget, threshold, error)
  - [ ] Review healthcheck.go WaitGroup pattern
  - [ ] Confirm understanding of thread safety guarantees

  **Commit**: NO (read-only task)

---

- [ ] 2. Refactor checkAllKeys() to use parallel goroutines

  **What to do**:
  - Add `var wg sync.WaitGroup` at the start of checkAllKeys()
  - Keep the sequential filters (Status check, shouldCheckKey) BEFORE launching goroutines
  - For each key that passes filters, launch a goroutine:
    ```go
    wg.Add(1)
    go func(k *OpenHandsKey, active bool) {
        defer wg.Done()
        // Move checkKeySpend and result handling here
    }(key, isActive)
    ```
  - Pass `key` and `isActive` as parameters (avoid loop variable capture)
  - Move checkKeySpend call and ALL result handling inside goroutine
  - Add `wg.Wait()` at the end to block until all checks complete
  - Preserve exact log format and all business logic

  **Detailed Implementation**:
  ```go
  func (sc *SpendChecker) checkAllKeys() {
      // Copy keys from provider (existing code - lines 156-159)
      sc.provider.mu.Lock()
      keys := make([]*OpenHandsKey, len(sc.provider.keys))
      copy(keys, sc.provider.keys)
      sc.provider.mu.Unlock()

      now := time.Now()
      var wg sync.WaitGroup  // ADD THIS

      for _, key := range keys {
          // Keep sequential filters (existing code - lines 163-173)
          if key.Status != OpenHandsStatusHealthy {
              continue
          }
          isActive := sc.isKeyActive(key, now)
          if !sc.shouldCheckKey(key, isActive, now) {
              continue
          }

          // PARALLEL EXECUTION STARTS HERE
          wg.Add(1)
          go func(k *OpenHandsKey, wasActive bool) {
              defer wg.Done()

              // Check spend (line 176 moved here)
              result := sc.checkKeySpend(k, wasActive)

              // Handle budget_exceeded (lines 178-197 moved here)
              if result.BudgetExceeded {
                  // ... entire block unchanged ...
                  return
              }

              // Handle errors (lines 200-203 moved here)
              if result.Error != nil {
                  // ... log error, continue ...
                  return
              }

              // Log spend (lines 206-207 moved here)
              spendPercent := (result.Spend / sc.threshold) * 100
              log.Printf("💵 [SpendChecker] %s: $%.2f / $%.2f (%.1f%%)", 
                  k.ID, result.Spend, sc.threshold, spendPercent)

              // Update spend info (line 210 moved here)
              sc.updateKeySpendInfo(k.ID, result.Spend, result.CheckedAt)

              // Check proactive rotation (lines 212-230 moved here)
              if result.Spend >= sc.threshold {
                  // ... entire rotation block unchanged ...
              } else {
                  // Save history without rotation
                  sc.saveSpendHistory(result, nil, "", "")
              }
          }(key, isActive)  // Pass variables as parameters
      }

      wg.Wait()  // ADD THIS - block until all checks complete
  }
  ```

  **Must NOT do**:
  - Change any business logic or conditions
  - Modify log format or emoji prefixes
  - Add concurrency limits (user wants unlimited)
  - Change error handling behavior
  - Modify function signature

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward refactor following existing pattern, no complex design decisions
  - **Skills**: None needed
    - Reason: Pure Go refactoring, pattern already provided in healthcheck.go

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential Task 2
  - **Blocks**: Task 3 (need code before testing)
  - **Blocked By**: Task 1 (need understanding first)

  **References**:

  **File to Modify**:
  - `goproxy/internal/openhands/spend_checker.go:155-236` - Replace checkAllKeys() implementation

  **Pattern Source**:
  - `goproxy/internal/proxy/healthcheck.go:71-79` - Copy this WaitGroup pattern exactly
  - Key elements: var wg, wg.Add(1) before goroutine, defer wg.Done(), pass variable as param, wg.Wait() at end

  **Critical: Variable Capture**:
  - BAD: `go func() { use(key) }()` - captures loop variable reference
  - GOOD: `go func(k *OpenHandsKey) { use(k) }(key)` - passes value
  - See healthcheck.go line 73: `go func(p *Proxy)` - copies parameter

  **Functions Called Inside Goroutine** (all thread-safe):
  - `checkKeySpend()` line 282-387: Makes HTTP request, returns result struct
  - `updateKeySpendInfo()` line 390-414: Has mutex protection (provider.mu.Lock at line 405)
  - `saveSpendHistory()` line 417-440: MongoDB InsertOne (thread-safe)
  - `provider.RotateKey()` from backup.go:199: Atomic ops + mutex protection

  **Acceptance Criteria**:
  - [ ] Build succeeds: `go build ./internal/openhands/...` → no errors
  - [ ] Code inspection: WaitGroup pattern matches healthcheck.go
  - [ ] Code inspection: Loop variables passed as parameters
  - [ ] Code inspection: defer wg.Done() in every goroutine
  - [ ] Code inspection: wg.Wait() at function end
  - [ ] Code inspection: All business logic unchanged (no missing conditions)

  **Commit**: YES
  - Message: `feat(goproxy): parallelize spend checker key validation`
  - Files: `goproxy/internal/openhands/spend_checker.go`
  - Pre-commit: `go build ./internal/openhands/...` (must succeed)

---

- [ ] 3. Test parallel execution behavior

  **What to do**:
  - Build the project: `go build -o trollllm-proxy goproxy/main.go`
  - Run tests if they exist: `go test ./internal/openhands/...`
  - Run with race detector: `go test -race ./internal/openhands/...`
  - Start the proxy in debug mode and observe logs for ~1-2 minutes
  - Verify log timestamps show simultaneity (within same second)
  - Check for any errors, panics, or unexpected behavior
  - Verify rotation still works (if any key hits threshold)

  **Must NOT do**:
  - Skip verification steps
  - Assume it works without testing
  - Deploy without manual testing

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard testing procedures, well-defined checks
  - **Skills**: None needed
    - Reason: Standard Go testing commands

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential Task 3
  - **Blocks**: Task 4 (need test results before final review)
  - **Blocked By**: Task 2 (need code changes first)

  **References**:

  **Testing Commands**:
  - Build: `go build -o trollllm-proxy goproxy/main.go`
  - Unit tests: `go test ./internal/openhands/...`
  - Race detector: `go test -race ./internal/openhands/...`
  - Run proxy: `cd goproxy && go run main.go` (if .env configured)

  **Log Pattern to Verify**:
  - BEFORE (sequential):
    ```
    2026/02/03 10:46:38 💵 [SpendChecker] tai-p6-...: $7.12 / $9.95 (71.5%)
    2026/02/03 10:46:39 💵 [SpendChecker] tai-p5-...: $3.62 / $9.95 (36.3%)
    2026/02/03 10:46:40 💵 [SpendChecker] tai-p4-...: $2.13 / $9.95 (21.4%)
    ```
  - AFTER (parallel):
    ```
    2026/02/03 10:46:38 💵 [SpendChecker] tai-p5-...: $3.62 / $9.95 (36.3%)
    2026/02/03 10:46:38 💵 [SpendChecker] tai-p6-...: $7.12 / $9.95 (71.5%)
    2026/02/03 10:46:38 💵 [SpendChecker] tai-p4-...: $2.13 / $9.95 (21.4%)
    ```
  - Key difference: Same second timestamp (HH:MM:SS), random order

  **Configuration Needed for Testing**:
  - `goproxy/.env` must have MONGODB_URI configured
  - Must have OpenHands keys in database
  - SpendChecker must be enabled (check main.go startup logs)

  **Acceptance Criteria**:
  - [ ] Build succeeds without compilation errors
  - [ ] Tests pass (or confirm no tests exist): `go test ./internal/openhands/...`
  - [ ] Race detector shows no data races: `go test -race ./internal/openhands/...`
  - [ ] Manual test: Log timestamps show simultaneity (within ±1 second)
  - [ ] Manual test: All keys logged (no missing keys)
  - [ ] Manual test: Rotation still works correctly (if triggered)
  - [ ] Manual test: No panics or crashes during 1-2 minute run
  - [ ] Evidence captured: Log excerpt showing simultaneous timestamps

  **Commit**: NO (testing only, no code changes)

---

- [ ] 4. Final review and documentation

  **What to do**:
  - Review the code changes one final time
  - Verify the commit message is accurate and follows conventions
  - Confirm all guardrails were respected (no extra changes)
  - Add a brief comment in code explaining the WaitGroup usage
  - Ensure no TODO comments or debugging code left behind

  **Must NOT do**:
  - Add extensive documentation (not requested)
  - Modify other functions or files
  - Add performance metrics or monitoring

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple review checklist, no complex analysis
  - **Skills**: None needed
    - Reason: Standard code review

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential Task 4 (final step)
  - **Blocks**: None (last task)
  - **Blocked By**: Task 3 (need test results to confirm success)

  **References**:

  **Commit Message Format** (from root AGENTS.md):
  - Format: `type(scope): description`
  - Example: `feat(goproxy): parallelize spend checker key validation`
  - Scope: `goproxy` (affects Go proxy component)
  - Type: `feat` (new functionality - parallel execution)

  **Code Review Checklist**:
  - [ ] Only `spend_checker.go` modified (no other files)
  - [ ] Only `checkAllKeys()` function changed
  - [ ] WaitGroup pattern matches healthcheck.go
  - [ ] No function signature changes
  - [ ] All business logic preserved
  - [ ] Log format exactly the same
  - [ ] No new dependencies added
  - [ ] No debug logs or TODOs left
  - [ ] Commit message follows convention

  **Optional: Add Brief Comment**:
  ```go
  // Check all healthy keys in parallel using goroutines
  var wg sync.WaitGroup  // Synchronize parallel checks
  ```

  **Acceptance Criteria**:
  - [ ] Code review checklist complete
  - [ ] No extra changes beyond scope
  - [ ] Commit message accurate and conventional
  - [ ] No debugging artifacts left in code
  - [ ] Ready for /start-work execution

  **Commit**: NO (review only, commit already done in Task 2)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `feat(goproxy): parallelize spend checker key validation` | goproxy/internal/openhands/spend_checker.go | go build ./internal/openhands/... |

**Note**: Single atomic commit after Task 2. Tasks 1, 3, 4 are read-only.

---

## Success Criteria

### Verification Commands
```bash
# Build verification
go build -o trollllm-proxy goproxy/main.go
# Expected: Build succeeds

# Test verification (if tests exist)
go test ./internal/openhands/...
# Expected: All tests pass

# Race condition check
go test -race ./internal/openhands/...
# Expected: No race warnings
```

### Final Checklist
- [ ] All "Must Have" present (WaitGroup, parameter passing, preserved logic)
- [ ] All "Must NOT Have" absent (no signature changes, no new files)
- [ ] Log timestamps show simultaneity (same second)
- [ ] No race conditions detected
- [ ] All tests pass (or confirm no tests exist)
- [ ] Rotation still works correctly
- [ ] No panics or errors during runtime
