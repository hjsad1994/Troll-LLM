# In-Memory TTL Cache for API Key Validation

## TL;DR

> **Quick Summary**: Add an in-memory TTL cache layer to `goproxy/internal/userkey/` that caches `ValidateKey()` results for 30 seconds, reducing MongoDB queries by ~90% (from ~6000-8000 queries/min to ~600-800).
> 
> **Deliverables**:
> - `goproxy/internal/userkey/cache.go` — New cache implementation
> - `goproxy/internal/userkey/cache_test.go` — Comprehensive tests
> - `goproxy/internal/userkey/validator.go` — Modified to use cache (no signature changes)
> 
> **Estimated Effort**: Short (~1-2 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request
Implement an in-memory TTL cache for ValidateKey() in the Go proxy service to reduce MongoDB load by ~90%. Current state: every request hits MongoDB 2-4 times for key validation + credit checking. At 2000 RPM from OpenHands, that's ~6000-8000 MongoDB queries/minute just for validation.

### Current Flow (Per Request)
1. Extract API key from `Authorization` header
2. `ValidateKey(apiKey)` → 2-3 DB calls (user_keys FindOne → usersNew FindOne for migration check → optional usersNew fallback)
3. Rate limit check (in-memory, no DB — already optimized)
4. Select upstream config
5. `CheckUserCreditsOpenHands(username)` OR `CheckUserCredits(username)` → 1 DB call
6. Route to upstream

### Codebase Patterns Observed
- **Singleton pattern**: `usage/batcher.go` uses `sync.Once` + package-level var for `GetBatcher()`
- **Background cleanup**: `ratelimit/limiter_optimized.go` runs `cleanupLoop()` goroutine on 5-min ticker
- **Env var disable pattern**: `GOPROXY_DISABLE_OPTIMIZATIONS` or specific `GOPROXY_DISABLE_BATCHED_WRITES` in `batcher.go:init()`
- **Error vars**: Package-level `var ( ErrKeyNotFound = ... )` in `validator.go`
- **Context timeouts**: Always `context.WithTimeout(context.Background(), 5*time.Second)`
- **Logging**: Emoji-prefixed: `💰`, `⚠️`, `❌`, `✅`, `🔑`, `🧹`

---

## Work Objectives

### Core Objective
Cache `ValidateKey()` results in-memory with a 30-second TTL to eliminate redundant MongoDB lookups for the same API key, while preserving all existing behavior and error semantics.

### Concrete Deliverables
- New file: `goproxy/internal/userkey/cache.go`
- New file: `goproxy/internal/userkey/cache_test.go`
- Modified file: `goproxy/internal/userkey/validator.go` (minimal changes to `ValidateKey` function only)

### Definition of Done
- [ ] `go build ./...` passes with zero errors
- [ ] `go test ./internal/userkey/...` passes (existing + new tests)
- [ ] `go test ./...` passes (no regressions across entire project)
- [ ] ValidateKey returns cached result on second call (0 DB queries)
- [ ] Expired cache entries are evicted by cleanup goroutine
- [ ] Cache disabled via `GOPROXY_DISABLE_KEY_CACHE=true` or `GOPROXY_DISABLE_OPTIMIZATIONS=true`

### Must Have
- Thread-safe concurrent access (sync.Map or sync.RWMutex)
- Cache both success AND deterministic errors (ErrKeyNotFound, ErrKeyRevoked, ErrCreditsExpired, ErrMigrationRequired)
- Do NOT cache transient errors (network errors, timeouts, mongo driver errors)
- Background cleanup goroutine for expired entries
- Configurable TTL via env var with 30s default
- Singleton pattern matching batcher.go
- Stats function for monitoring (hits, misses, size)
- Manual cache invalidation function
- Env var disable switch

### Must NOT Have (Guardrails)
- **NO function signature changes** — `ValidateKey(apiKey string) (*UserKey, error)` must remain identical
- **NO changes to credit deduction logic** — Credit checking (CheckUserCredits*) is NOT cached
- **NO external dependencies** — Only use stdlib (`sync`, `sync/atomic`, `time`, `os`, `log`, `strings`)
- **NO caching of CheckUserCredits/CheckUserCreditsOpenHands** — Credits are volatile and must be checked fresh
- **NO caching of `ErrInsufficientCredits`** — This error comes from `validateFromUsersNewCollection()` credit balance check which is volatile
- **NO over-engineering** — No LRU, no max size limit (key space is bounded by active users), no distributed cache

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES — `go test` works, existing tests in `validator_test.go`
- **User wants tests**: YES (Tests-after, within same task)
- **Framework**: Go stdlib `testing` package

### Verification Approach

All verification is automated via `go test` and `go build`:

```bash
# Build verification
go build ./...

# Unit tests (new + existing)
go test -v ./internal/userkey/...

# Full regression
go test ./...
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Create cache.go (core cache implementation)
└── (no other independent tasks)

Wave 2 (After Wave 1):
├── Task 2: Modify validator.go (wire cache into ValidateKey)
└── Task 3: Create cache_test.go (tests for cache behavior)
    Note: Task 3 CAN run in parallel with Task 2 since tests
    exercise the public API and cache.go is already complete.
    However, Task 3 tests the integrated ValidateKey → cache flow,
    so Task 2 should ideally complete first.

Wave 3 (After Wave 2):
└── Task 4: Final verification (build + test + regression)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None (first task) |
| 2 | 1 | 3, 4 | None |
| 3 | 1, 2 | 4 | None |
| 4 | 2, 3 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | delegate_task(category='quick') |
| 2 | 2, 3 | delegate_task(category='quick'), sequential |
| 3 | 4 | delegate_task(category='quick') — verify only |

---

## TODOs

- [ ] 1. Create `goproxy/internal/userkey/cache.go` — Core TTL Cache Implementation

  **What to do**:
  - Create `cache.go` in the `userkey` package
  - Define `cacheEntry` struct: `{ userKey *UserKey, err error, cachedAt time.Time }`
  - Define `KeyCache` struct wrapping `sync.Map` with TTL config
  - Implement `init()` function that reads env vars and disables cache if needed:
    - `GOPROXY_DISABLE_KEY_CACHE=true` → disabled
    - `GOPROXY_DISABLE_OPTIMIZATIONS=true` → disabled
    - `GOPROXY_KEY_CACHE_TTL_SECONDS` → custom TTL (default: 30)
  - Implement singleton pattern: package-level `var keyCache *KeyCache` + `var keyCacheOnce sync.Once` + `func GetKeyCache() *KeyCache`
  - Implement `UseKeyCache` package-level bool (matching `UseBatchedWrites` pattern from batcher.go)
  - Implement methods:
    - `Get(apiKey string) (*UserKey, error, bool)` — returns cached value + hit bool. Checks TTL, deletes expired on access.
    - `Set(apiKey string, userKey *UserKey, err error)` — stores entry. Only caches deterministic errors (check with `isCacheableError(err)`)
    - `Invalidate(apiKey string)` — removes single entry
    - `InvalidateAll()` — clears entire cache
    - `Stats() CacheStats` — returns `{ Hits uint64, Misses uint64, Size int }` using `sync/atomic` counters
    - `startCleanup()` — background goroutine on 60-second ticker, iterates sync.Map and deletes expired entries
  - Define `isCacheableError(err error)` helper:
    - Return `true` for: `nil`, `ErrKeyNotFound`, `ErrKeyRevoked`, `ErrCreditsExpired`, `ErrMigrationRequired`
    - Return `false` for: all other errors (transient DB errors, timeouts, etc.)
    - **CRITICAL**: Return `false` for `ErrInsufficientCredits` — credit balances are volatile
  - Logging:
    - On cache init: `log.Printf("🔑 [KeyCache] Initialized (TTL: %ds, cleanup: 60s)", ttlSeconds)`
    - On cache disabled: `log.Printf("🔑 [KeyCache] Disabled via environment variable")`
    - On cleanup: `log.Printf("🧹 [KeyCache] Cleanup: removed %d expired entries, %d remaining", removed, remaining)`

  **Must NOT do**:
  - Do NOT add any external dependencies
  - Do NOT implement LRU eviction or max size limits
  - Do NOT cache `ErrInsufficientCredits` (volatile credit balance)
  - Do NOT use `sync.RWMutex` for the main cache map — `sync.Map` is better for this read-heavy workload with disjoint keys
  - Do NOT modify any existing functions or files in this task

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single focused file creation, well-defined requirements, Go stdlib only
  - **Skills**: [] (no special skills needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO (first task, must complete before others)
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `goproxy/internal/usage/batcher.go:16-29` — Env var disable pattern: `UseBatchedWrites` bool + `init()` + `isBatcherEnvDisabled()` helper. Copy this pattern exactly for `UseKeyCache`.
  - `goproxy/internal/usage/batcher.go:74-86` — Singleton pattern: `var batcher *X` + `var batcherOnce sync.Once` + `GetBatcher()`. Replicate for `GetKeyCache()`.
  - `goproxy/internal/ratelimit/limiter_optimized.go:107-130` — Background cleanup goroutine pattern: `Cleanup()` method + `cleanupLoop()` with ticker. Copy for expired entry eviction.
  - `goproxy/internal/ratelimit/limiter_optimized.go:132-139` — `GetStats()` returning `map[string]int`. Follow similar pattern for `CacheStats`.

  **API/Type References** (contracts to implement against):
  - `goproxy/internal/userkey/validator.go:14-19` — Error variables to check in `isCacheableError()`: `ErrKeyNotFound`, `ErrKeyRevoked`, `ErrCreditsExpired`, `ErrInsufficientCredits`, `ErrMigrationRequired`
  - `goproxy/internal/userkey/model.go:46-56` — `UserKey` struct definition (the value being cached)

  **Acceptance Criteria**:

  ```bash
  # Agent runs: File exists and compiles
  go build ./internal/userkey/...
  # Assert: Exit code 0, no errors

  # Agent runs: Package symbols are accessible
  go vet ./internal/userkey/...
  # Assert: Exit code 0, no warnings
  ```

  **Commit**: YES
  - Message: `feat(goproxy): add in-memory TTL cache for API key validation`
  - Files: `goproxy/internal/userkey/cache.go`
  - Pre-commit: `go build ./internal/userkey/...`

---

- [ ] 2. Modify `goproxy/internal/userkey/validator.go` — Wire Cache into ValidateKey

  **What to do**:
  - Rename existing `ValidateKey` to `validateKeyFromDB` (private, unexported)
  - Create new `ValidateKey` that:
    1. If `!UseKeyCache` → call `validateKeyFromDB()` directly (bypass)
    2. Call `GetKeyCache().Get(apiKey)` — if hit, return cached result
    3. On miss, call `validateKeyFromDB(apiKey)`
    4. Call `GetKeyCache().Set(apiKey, userKey, err)` to cache result
    5. Return result
  - Add import for `log` if not already present (for optional debug logging)
  - Keep ALL existing function signatures identical:
    - `ValidateKey(apiKey string) (*UserKey, error)` — UNCHANGED external API
    - All other functions (`CheckUserCredits`, `validateFromUserKeys`, etc.) — UNTOUCHED

  **Must NOT do**:
  - Do NOT change `ValidateKey` function signature
  - Do NOT modify any function other than `ValidateKey`
  - Do NOT cache results from `CheckUserCredits*` functions
  - Do NOT add any imports beyond what's already in the file (except possibly `log` which is stdlib)
  - Do NOT touch `validateFromUserKeys`, `validateFromUsersNewCollection`, or any credit check function

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Minimal surgical edit to a single function, well-defined transformation
  - **Skills**: [] (no special skills needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential)
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References** (existing code to follow):
  - `goproxy/internal/userkey/validator.go:22-35` — Current `ValidateKey()` implementation to be renamed to `validateKeyFromDB()`. The wrapper will call this on cache miss.
  - `goproxy/internal/usage/batcher.go:16-18` — `UseBatchedWrites` flag check pattern. Same pattern for `UseKeyCache` bypass check.

  **API/Type References** (contracts to implement against):
  - `goproxy/main.go:602` — Call site: `userKey, err := userkey.ValidateKey(clientAPIKey)`. Must continue to work identically.
  - `goproxy/main.go:3148` — Second call site for `ValidateKey`. Same contract.

  **Acceptance Criteria**:

  ```bash
  # Agent runs: Build passes after modification
  go build ./...
  # Assert: Exit code 0, no errors

  # Agent runs: Existing tests still pass
  go test ./internal/userkey/...
  # Assert: Exit code 0, all tests pass (no regressions)
  ```

  **Commit**: YES
  - Message: `feat(goproxy): wire TTL cache into ValidateKey for ~90% MongoDB reduction`
  - Files: `goproxy/internal/userkey/validator.go`
  - Pre-commit: `go test ./internal/userkey/...`

---

- [ ] 3. Create `goproxy/internal/userkey/cache_test.go` — Comprehensive Cache Tests

  **What to do**:
  - Create `cache_test.go` in the `userkey` package
  - Implement the following test cases using table-driven tests where appropriate:

  **Test 1: `TestCacheHitMiss`**
  - Create a cache with short TTL (100ms)
  - Call `Get()` on empty cache → expect miss (hit=false)
  - Call `Set()` with a valid UserKey result
  - Call `Get()` again → expect hit (hit=true), verify returned UserKey matches
  - Verify Stats().Hits == 1, Stats().Misses == 1

  **Test 2: `TestCacheTTLExpiration`**
  - Create a cache with very short TTL (50ms)
  - `Set()` a valid entry
  - `Get()` immediately → expect hit
  - `time.Sleep(60ms)` to exceed TTL
  - `Get()` again → expect miss (entry expired)

  **Test 3: `TestCacheDeterministicErrorsCached`**
  - Table-driven test with all deterministic errors:
    - `{ErrKeyNotFound, true}`
    - `{ErrKeyRevoked, true}`
    - `{ErrCreditsExpired, true}`
    - `{ErrMigrationRequired, true}`
  - For each: `Set()` with error → `Get()` → verify error is returned and hit=true

  **Test 4: `TestCacheTransientErrorsNotCached`**
  - Table-driven test with transient errors:
    - `{errors.New("connection reset"), false}`
    - `{errors.New("context deadline exceeded"), false}`
    - `{errors.New("random db error"), false}`
    - `{ErrInsufficientCredits, false}` — volatile, must NOT be cached
  - For each: `Set()` with error → `Get()` → verify miss (transient errors are not stored)

  **Test 5: `TestCacheConcurrentAccess`**
  - Launch 100 goroutines, each doing Set+Get on different keys
  - Use `sync.WaitGroup` to coordinate
  - No panics, no data races (run with `-race` flag)
  - Verify Stats().Size roughly matches expected count

  **Test 6: `TestCacheDisableViaEnv`**
  - Set `GOPROXY_DISABLE_KEY_CACHE=true` via `t.Setenv()`
  - Verify `UseKeyCache` is false (or re-initialize to check)
  - Note: May need to test the `isCacheEnvDisabled()` helper directly since the `init()` runs once

  **Test 7: `TestCacheCleanupRemovesExpired`**
  - Create cache with short TTL (50ms)
  - `Set()` multiple entries
  - `time.Sleep(60ms)` to expire them
  - Call `Cleanup()` directly (the public method, not the goroutine)
  - Verify `Stats().Size == 0`

  **Test 8: `TestCacheInvalidate`**
  - `Set()` an entry → `Get()` → hit
  - `Invalidate(apiKey)` → `Get()` → miss
  - Test `InvalidateAll()` with multiple entries

  **Test 9: `TestCacheNilUserKeyWithNilError`**
  - Edge case: `Set("key", nil, nil)` → should still cache (nil *UserKey with nil error is valid)
  - `Get("key")` → hit=true, userKey=nil, err=nil

  **Must NOT do**:
  - Do NOT require MongoDB connection for tests (all tests are unit tests with direct cache API calls)
  - Do NOT use external test frameworks (stick to stdlib `testing`)
  - Do NOT test credit check functions (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test file creation, well-defined test cases, Go stdlib testing only
  - **Skills**: [] (no special skills needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 2 for integrated ValidateKey testing)
  - **Parallel Group**: Wave 2 (after Task 2)
  - **Blocks**: Task 4
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References** (existing code to follow):
  - `goproxy/internal/userkey/validator_test.go:1-60` — Existing test file structure, naming conventions (`TestAC1_...`), t.Log for notes about limitations
  - `goproxy/internal/userkey/keytype_test.go` — Another test file in the same package for reference

  **Test References** (testing patterns to follow):
  - AGENTS.md Go test conventions — Table-driven tests with `t.Run()`, descriptive names

  **API/Type References** (contracts to test):
  - `goproxy/internal/userkey/cache.go` (Task 1 output) — The cache API being tested: `Get()`, `Set()`, `Invalidate()`, `Stats()`, `Cleanup()`
  - `goproxy/internal/userkey/validator.go:14-19` — Error variables used in test cases

  **Acceptance Criteria**:

  ```bash
  # Agent runs: All tests pass
  go test -v ./internal/userkey/...
  # Assert: Exit code 0, all tests pass including new cache tests

  # Agent runs: Race detector passes
  go test -race ./internal/userkey/...
  # Assert: Exit code 0, no race conditions detected
  ```

  **Commit**: YES
  - Message: `test(goproxy): add comprehensive cache tests for key validation TTL cache`
  - Files: `goproxy/internal/userkey/cache_test.go`
  - Pre-commit: `go test -race ./internal/userkey/...`

---

- [ ] 4. Final Verification — Build, Test, Regression Check

  **What to do**:
  - Run full build: `go build ./...`
  - Run targeted tests with verbose output: `go test -v ./internal/userkey/...`
  - Run race detector: `go test -race ./internal/userkey/...`
  - Run full project tests: `go test ./...`
  - Verify cache statistics endpoint works (if applicable) by checking `GetKeyCache().Stats()` in test output
  - Review that no other files were accidentally modified

  **Must NOT do**:
  - Do NOT modify any files
  - Do NOT skip any verification step

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification-only task, no coding
  - **Skills**: [] (no special skills needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO (final verification)
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3

  **References**:
  - Root `AGENTS.md` — Go test commands: `go test ./...`, `go test -v ./internal/userkey/...`

  **Acceptance Criteria**:

  ```bash
  # Full build
  go build ./...
  # Assert: Exit code 0

  # Targeted tests
  go test -v ./internal/userkey/...
  # Assert: All PASS, includes new cache tests

  # Race detector
  go test -race ./internal/userkey/...
  # Assert: Exit code 0, no races

  # Full regression
  go test ./...
  # Assert: Exit code 0, no test failures anywhere
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(goproxy): add in-memory TTL cache for API key validation` | `cache.go` | `go build ./internal/userkey/...` |
| 2 | `feat(goproxy): wire TTL cache into ValidateKey for ~90% MongoDB reduction` | `validator.go` | `go test ./internal/userkey/...` |
| 3 | `test(goproxy): add comprehensive cache tests for key validation TTL cache` | `cache_test.go` | `go test -race ./internal/userkey/...` |

---

## Success Criteria

### Verification Commands
```bash
go build ./...           # Expected: exit 0, clean build
go test -v ./internal/userkey/...  # Expected: all PASS
go test -race ./internal/userkey/...  # Expected: exit 0, no races
go test ./...            # Expected: exit 0, no regressions
```

### Final Checklist
- [ ] `cache.go` created with full TTL cache implementation
- [ ] `validator.go` modified with cache wrapper (no signature changes)
- [ ] `cache_test.go` created with 9+ test functions covering all scenarios
- [ ] All "Must Have" features present (TTL, cleanup, stats, invalidate, env disable)
- [ ] All "Must NOT Have" constraints respected (no ext deps, no credit caching, no signature changes)
- [ ] Zero data races under concurrent load
- [ ] Full project builds and tests pass

---

## Review Verification (High Accuracy Self-Review)

**All file references verified against actual codebase on 2026-02-11:**

| Reference | Verified | Actual Location |
|-----------|----------|-----------------|
| `validator.go:22-35` ValidateKey | ✅ | Lines 22-35 exact |
| `validator.go:14-19` Error vars | ✅ | Lines 14-19 exact |
| `model.go:46-56` UserKey struct | ✅ | Lines 46-56 exact |
| `batcher.go:16-29` env disable pattern | ✅ | Lines 16-29 exact |
| `batcher.go:74-86` singleton pattern | ✅ | Lines 74-86 exact |
| `limiter_optimized.go:107-130` cleanup | ✅ | Lines 107-130 exact |
| `limiter_optimized.go:132-139` GetStats | ✅ | Lines 132-139 exact |
| `main.go:602` ValidateKey call | ✅ | Line 602 exact |
| `main.go:3148` ValidateKey call | ✅ | Line 3148 exact |
| No existing cache.go in userkey/ | ✅ | Glob confirmed 0 files |
| Existing tests independence | ✅ | Tests use CheckUserCredits/KeyType only |
| `ErrInsufficientCredits` not cached | ✅ | Used in main.go error branches, volatile |
| Go 1.25+ supports `t.Setenv()` | ✅ | Available since Go 1.17 |

**Zero critical gaps. Zero unverified assumptions. Plan is execution-ready.**
