# TTL Index for Spend History Auto-Cleanup

## TL;DR

> **Quick Summary**: Add MongoDB TTL index to automatically delete `openhands_key_spend_history` documents after 3 hours, preventing unbounded log accumulation.
> 
> **Deliverables**:
> - `EnsureIndexes()` function in `goproxy/db/mongodb.go`
> - TTL index on `checkedAt` field with 3-hour expiry
> - Startup call in `goproxy/main.go`
> 
> **Estimated Effort**: Quick (< 30 min implementation)
> **Parallel Execution**: NO - sequential (2 dependent tasks)
> **Critical Path**: Task 1 (add function) -> Task 2 (call from main)

---

## Context

### Original Request
Automatically delete `openhands_key_spend_history` documents after 24 hours to avoid storing too many logs.

### Interview Summary
**Key Discussions**:
- Collection only exists in goproxy (Go service)
- `checkedAt` field is the timestamp to use for TTL
- MongoDB TTL index is the cleanest solution (vs manual cleanup goroutine)
- Index creation should be in separate `EnsureIndexes()` function (Option B)

**Research Findings**:
- Collection: `openhands_key_spend_history` (constant in `spend_checker.go:25`)
- Schema has `checkedAt time.Time` field suitable for TTL
- No existing index infrastructure in `mongodb.go`
- Current insert-only pattern in `saveSpendHistory()` at line 451

---

## Work Objectives

### Core Objective
Implement automatic 3-hour document expiry for spend history logs using MongoDB TTL index.

### Concrete Deliverables
1. `EnsureIndexes()` function in `goproxy/db/mongodb.go`
2. TTL index created on `openhands_key_spend_history.checkedAt`
3. Startup initialization in `goproxy/main.go`

### Definition of Done
- [ ] `go build ./...` compiles without errors
- [ ] `go test ./...` passes (existing tests)
- [ ] Index visible in MongoDB: `db.openhands_key_spend_history.getIndexes()` shows TTL index
- [ ] Log message appears on startup: `[MongoDB] TTL index ensured...`

### Must Have
- TTL expiry of exactly 10800 seconds (3 hours)
- Idempotent index creation (safe to run multiple times)
- Error handling with log output (non-fatal - app continues if index fails)
- Emoji-prefixed log message per project conventions

### Must NOT Have (Guardrails)
- DO NOT create a background cleanup goroutine (TTL index handles this)
- DO NOT add any dependencies beyond existing `go.mongodb.org/mongo-driver`
- DO NOT modify the `SpendHistoryEntry` struct or `saveSpendHistory()` function
- DO NOT make index creation fatal (should log warning and continue)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Go test framework)
- **User wants tests**: Manual verification (infrastructure change, not business logic)
- **Framework**: `go test`

### Automated Verification

**Index Verification** (after deployment):
```bash
# Connect to MongoDB and verify index exists
mongosh "$MONGODB_URI" --eval "db.openhands_key_spend_history.getIndexes()"
# Expected: Array includes index with "expireAfterSeconds": 10800
```

**Build Verification**:
```bash
cd goproxy && go build ./...
# Expected: Exit code 0, no errors
```

**Test Verification**:
```bash
cd goproxy && go test ./...
# Expected: All existing tests pass
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Add EnsureIndexes() to mongodb.go [no dependencies]

Wave 2 (After Wave 1):
└── Task 2: Call EnsureIndexes() from main.go [depends: 1]

Critical Path: Task 1 -> Task 2
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | None | None (final) |

---

## TODOs

- [ ] 1. Add EnsureIndexes() function to mongodb.go

  **What to do**:
  1. Add import for `go.mongodb.org/mongo-driver/mongo/options` (if not present)
  2. Add import for `go.mongodb.org/mongo-driver/bson` (if not present)
  3. Create `EnsureIndexes()` function that:
     - Gets the `openhands_key_spend_history` collection
     - Creates TTL index on `checkedAt` field with `expireAfterSeconds: 86400`
     - Uses `CreateOne()` with `IndexModel`
     - Logs success with emoji prefix
     - Handles errors gracefully (log warning, don't crash)

  **Implementation Pattern**:
  ```go
  // EnsureIndexes creates required indexes for collections
  func EnsureIndexes() {
      ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
      defer cancel()

      // TTL index for spend history - auto-delete after 3 hours
      spendHistoryCol := GetCollection("openhands_key_spend_history")
      indexModel := mongo.IndexModel{
          Keys:    bson.D{{Key: "checkedAt", Value: 1}},
          Options: options.Index().SetExpireAfterSeconds(10800), // 3 hours
      }

      _, err := spendHistoryCol.Indexes().CreateOne(ctx, indexModel)
      if err != nil {
          // Index may already exist - check if it's a duplicate key error
          if !strings.Contains(err.Error(), "already exists") {
              log.Printf("⚠️ [MongoDB] Failed to create TTL index: %v", err)
          }
          return
      }

      log.Printf("✅ [MongoDB] TTL index ensured for openhands_key_spend_history (3h expiry)")
  }
  ```

  **Must NOT do**:
  - Don't make the function return an error that crashes the app
  - Don't create the index inside GetClient() - keep it separate
  - Don't use context.TODO() - always use timeout

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple Go code addition, well-defined pattern, < 30 min work
  - **Skills**: None required
    - Standard Go MongoDB operations, no specialized skills needed
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed for implementation, only for final commit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential - Wave 1
  - **Blocks**: Task 2
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `goproxy/db/mongodb.go:27-46` - Context timeout pattern with 5-10s timeout
  - `goproxy/db/mongodb.go:63-65` - GetCollection() usage pattern
  - `goproxy/internal/openhands/spend_checker.go:25` - SpendHistoryCollection constant name

  **API/Type References** (contracts to implement against):
  - MongoDB Go driver: `mongo.IndexModel` struct for index definition
  - MongoDB Go driver: `options.Index().SetExpireAfterSeconds()` for TTL

  **Documentation References**:
  - MongoDB TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
  - Go driver CreateOne: https://pkg.go.dev/go.mongodb.org/mongo-driver/mongo#IndexView.CreateOne

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Build verification
  cd goproxy && go build ./...
  # Assert: Exit code 0
  
  # Test verification (existing tests still pass)
  cd goproxy && go test ./...
  # Assert: All tests pass
  ```

  **Manual Verification**:
  - Review that `EnsureIndexes()` function exists in `mongodb.go`
  - Review that it follows the context timeout pattern (30s is fine for index creation)
  - Review that error handling logs warning but doesn't crash

  **Commit**: YES
  - Message: `feat(goproxy): add EnsureIndexes function for TTL index on spend history`
  - Files: `goproxy/db/mongodb.go`
  - Pre-commit: `cd goproxy && go build ./...`

---

- [ ] 2. Call EnsureIndexes() from main.go on startup

  **What to do**:
  1. Find the MongoDB initialization section in `main.go`
  2. Add call to `db.EnsureIndexes()` after MongoDB connection is established
  3. Ensure it runs before the HTTP server starts

  **Must NOT do**:
  - Don't call EnsureIndexes() inside GetClient() - call it separately in main.go
  - Don't make the server startup dependent on index success (it's a warning, not fatal)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line addition to main.go, trivial change
  - **Skills**: None required
  - **Skills Evaluated but Omitted**:
    - `git-master`: Only needed for final commit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential - Wave 2
  - **Blocks**: None (final task)
  - **Blocked By**: Task 1

  **References**:

  **Pattern References** (existing code to follow):
  - `goproxy/main.go:3854-3856` - MongoDB initialization section:
    ```go
    // Initialize MongoDB connection
    _ = db.GetClient() // This initializes the connection
    log.Printf("✅ MongoDB initialized")
    ```
  - Add `db.EnsureIndexes()` call AFTER line 3855 (after GetClient), BEFORE line 3856 (before the log)
  - Other init patterns in main.go (config loading, provider setup, etc.)

  **Acceptance Criteria**:

  **Automated Verification**:
  ```bash
  # Build verification
  cd goproxy && go build ./...
  # Assert: Exit code 0
  
  # Start the proxy and check logs
  cd goproxy && timeout 5 go run main.go 2>&1 | grep -i "TTL index"
  # Assert: Log line contains "TTL index ensured" or similar
  ```

  **Evidence to Capture**:
  - Terminal output showing the TTL index log message on startup

  **Commit**: YES
  - Message: `feat(goproxy): initialize TTL index on startup for spend history cleanup`
  - Files: `goproxy/main.go`
  - Pre-commit: `cd goproxy && go build ./...`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(goproxy): add EnsureIndexes function for TTL index on spend history` | goproxy/db/mongodb.go | `go build ./...` |
| 2 | `feat(goproxy): initialize TTL index on startup for spend history cleanup` | goproxy/main.go | `go build ./...` |

---

## Success Criteria

### Verification Commands
```bash
# Build passes
cd goproxy && go build ./...  # Expected: exit 0

# Tests pass
cd goproxy && go test ./...  # Expected: all pass

# Startup shows TTL index log
cd goproxy && go run main.go 2>&1 | head -20
# Expected: Contains "[MongoDB] TTL index ensured"

# Index exists in MongoDB (after deployment)
mongosh "$MONGODB_URI" --eval "db.openhands_key_spend_history.getIndexes()"
# Expected: Index with expireAfterSeconds: 86400
```

### Final Checklist
- [ ] `EnsureIndexes()` function added to `mongodb.go`
- [ ] Function called from `main.go` on startup
- [ ] TTL index has 10800 second expiry (3 hours)
- [ ] Log message with emoji prefix on success
- [ ] Graceful error handling (warning, not crash)
- [ ] All existing tests pass
- [ ] Build succeeds
