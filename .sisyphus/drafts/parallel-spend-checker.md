# Draft: Parallel Spend Checker Implementation

## User Request (Confirmed)
User sees logs showing keys checked sequentially one-by-one. They want ALL keys checked in PARALLEL for maximum speed.

**Key Points:**
- No concern about API spam - prioritize speed
- Use goroutines for parallel execution
- Target: `goproxy/internal/openhands/spend_checker.go` line 155 (`checkAllKeys()` function)
- Keep all existing functionality (rotation, logging, history)

## Current Implementation Analysis
**File:** `goproxy/internal/openhands/spend_checker.go`

**Current Sequential Logic (lines 155-236):**
```go
func (sc *SpendChecker) checkAllKeys() {
    // 1. Copy keys slice (lines 156-159)
    // 2. Loop through keys sequentially (lines 163-235)
    // 3. For each key: check spend, handle rotation, save history
    // 4. Blocking: Each checkKeySpend() call is sequential
}
```

**Key Operations per Key:**
1. `isKeyActive()` - check if key was used recently
2. `shouldCheckKey()` - determine if check is needed
3. `checkKeySpend()` - HTTP request to OpenHands API (BLOCKING 30s timeout)
4. Handle budget_exceeded or threshold breach → `RotateKey()`
5. `updateKeySpendInfo()` - update MongoDB + in-memory state
6. `saveSpendHistory()` - insert MongoDB record

**Shared State Concerns:**
- `sc.provider.keys` - read via locked copy
- `sc.provider.mu` - already locked when copying keys, unlocked during checks
- MongoDB writes - isolated per key
- Key rotation - uses `RotateKey()` which has its own locking

## Technical Decisions

### Parallelization Strategy: GOROUTINE PER KEY
- Launch one goroutine for each key
- Use `sync.WaitGroup` to wait for all completions
- NO semaphore/rate limiting (user explicitly said "no concern about API spam")

### Thread Safety Requirements
1. **Key slice copy** - Already done before loop, safe to read
2. **Result collection** - No collection needed (each goroutine is self-contained)
3. **MongoDB writes** - Already isolated per key, thread-safe
4. **Logging** - Go's log package is thread-safe
5. **Key rotation** - `RotateKey()` must handle concurrent calls safely

### Error Handling
- Errors logged per goroutine (no aggregation needed)
- Failed checks don't block other keys
- Continue pattern: errors are logged, goroutine exits

## Research Findings

### From Explore Agent (Codebase Patterns)
**Primary Reference:** `goproxy/internal/proxy/healthcheck.go` lines 71-79

✅ **EXACT PATTERN EXISTS** for parallel operations with WaitGroup:
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

**Key Patterns in Codebase:**
1. **Closure capture safety**: Always pass loop variable as function parameter
2. **Defer placement**: `defer wg.Done()` immediately after goroutine starts
3. **Error handling**: Each goroutine logs errors independently
4. **No result aggregation**: Fire-and-forget pattern for independent operations

### Thread Safety Verification

✅ **RotateKey() IS CONCURRENCY-SAFE**
Location: `goproxy/internal/openhandspool/rotation.go` lines 23-136

**Idempotency mechanism (lines 29-42):**
- Early check if key already rotated (returns empty string, no error)
- Returns `("", nil)` if key doesn't exist → safe duplicate rotation attempts

**Atomic backup key claim (lines 44-62):**
- Uses `FindOneAndUpdate` with `{isUsed: false}` filter
- MongoDB atomic operation ensures only ONE goroutine claims each backup key
- Race condition impossible: first caller gets key, others get error

**In-memory update (lines 116-132):**
- Protected by `p.mu.Lock()` 
- Safe for concurrent access

**Conclusion:** Multiple goroutines CAN safely call RotateKey() for the same keyID simultaneously without corruption.

## Scope Boundaries

**IN SCOPE:**
- Modify `checkAllKeys()` to use goroutines
- Add sync.WaitGroup for coordination
- Maintain all existing functionality
- Keep all existing error handling and logging

**OUT OF SCOPE:**
- Adding rate limiting (user explicitly wants none)
- Changing rotation logic
- Modifying HTTP client configuration
- Changing database operations
- Adding result aggregation/reporting

## Open Questions

1. ✅ Should we add rate limiting? → **ANSWERED: NO** (user said "no concern about API spam")
2. ✅ Should we verify RotateKey() is concurrency-safe? → **ANSWERED: YES, SAFE** (verified via rotation.go analysis)
3. ✅ Any existing concurrency patterns in codebase to follow? → **ANSWERED: YES** (healthcheck.go WaitGroup pattern)

## Risks Identified

### ✅ MITIGATED RISKS

1. **✅ Race condition in RotateKey()** 
   - **Status:** SAFE - MongoDB atomic operations + early idempotency check
   - **Evidence:** `rotation.go` uses `FindOneAndUpdate` with atomic claim
   - **Action:** None needed

### ⚠️ MODERATE RISKS

2. **⚠️ MongoDB connection pool saturation**
   - **Concern:** N parallel goroutines × 2-3 DB ops each = spike in connections
   - **Likelihood:** Low-Medium (depends on key count)
   - **Mitigation:** MongoDB driver has built-in connection pooling (default 100 connections)
   - **Action:** Monitor in production, no code change needed upfront

3. **⚠️ HTTP client connection pool exhaustion**
   - **Concern:** N parallel HTTP requests to OpenHands API
   - **Current:** Uses `http.Client` with 30s timeout per request
   - **Likelihood:** Low (Go's http.Client has connection pooling)
   - **Action:** User explicitly wants "no concern about API spam" - proceed as-is

### 📊 COSMETIC ISSUES

4. **📊 Log interleaving**
   - **Issue:** Multiple goroutines logging simultaneously = mixed output
   - **Impact:** Cosmetic only - doesn't affect functionality
   - **Status:** Acceptable (Go's log package is thread-safe)
   - **Example:** Lines might appear like "💵 [Key1] 💵 [Key2] ..." instead of grouped
   - **Action:** None needed (mention in plan as expected behavior)

## Next Steps
1. Wait for explore/librarian agents to return
2. Verify RotateKey() concurrency safety
3. Confirm HTTP client pool size is adequate
4. Generate work plan with tasks, dependencies, and delegation recommendations
