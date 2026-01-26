
## Idempotency Pattern for Key Rotation (2026-01-25)

### Implementation
Added idempotency check to `OpenHandsProvider.RotateKey()` in `goproxy/internal/openhands/backup.go` (lines 220-233).

### Pattern Applied
**MongoDB DeleteResult.DeletedCount check:**
```go
deleteResult, err := keysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
if deleteResult.DeletedCount == 0 {
    log.Printf("⚠️ Key already rotated by another process, skipping insert")
    return "", nil
}
// Only insert if we actually deleted something
```

### Why This Works
- `DeletedCount == 0` means the document was already deleted by another process
- This prevents duplicate key insertion when concurrent rotations occur
- Common pattern in distributed systems for idempotent operations

### Race Condition Scenario
**Without fix:**
1. Process A: Delete key X → success (count=1)
2. Process B: Delete key X → success (count=0, key already gone)
3. Process A: Insert backup key Y → success
4. Process B: Insert backup key Z → success (DUPLICATE!)
5. Result: 10 keys → 11 keys (BAD)

**With fix:**
1. Process A: Delete key X → success (count=1)
2. Process B: Delete key X → success (count=0)
3. Process A: Insert backup key Y → success
4. Process B: Skip insert (count=0 detected) → return early
5. Result: 10 keys → 10 keys (GOOD)

### Key Insight
MongoDB atomic operations provide the foundation, but you must **check the result** to implement true idempotency. The operation succeeds even if nothing changed - checking `DeletedCount` tells you if you actually made a change.

### Applicable Elsewhere
This pattern applies to ANY operation where:
- Multiple processes may try the same action
- You want to avoid duplicate side effects
- You have an atomic "claim" operation (delete, update with filter, etc.)

**Examples:**
- Job processing (delete job from queue before processing)
- Resource allocation (update with filter for available=true)
- Lock acquisition (insert unique document)

## Task 2: Idempotency Check in openhandspool.KeyPool.RotateKey()

**Date:** 2026-01-25

**File Modified:** `goproxy/internal/openhandspool/rotation.go` (lines 41-54)

**Changes Applied:**
1. Captured `deleteResult` from `DeleteOne()` call (line 43)
2. Updated log message to include `DeletedCount` (line 47)
3. Added idempotency check after delete operation (lines 50-54)
4. Function returns `"", nil` early if `DeletedCount == 0`

**Code Pattern:**
```go
deleteResult, err := openHandsKeysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
if err != nil {
    log.Printf("⚠️ [OpenHandsRotation] Failed to delete old key: %v", err)
} else {
    log.Printf("🗑️ [OpenHandsRotation] Deleted old key: %s (count: %d)", failedKeyID, deleteResult.DeletedCount)
}

// Idempotency check: if no key was deleted, it was already rotated by another process
if deleteResult.DeletedCount == 0 {
    log.Printf("⚠️ [OpenHandsRotation] Key %s already rotated by another process, skipping insert", failedKeyID)
    return "", nil
}
```

**Why This Works:**
- MongoDB's `DeleteOne()` returns `DeletedCount = 0` if the document doesn't exist
- This indicates another process already deleted (and rotated) the key
- Skipping the INSERT prevents duplicate key errors

**Architectural Note:**
- This package (`openhandspool`) is essentially a duplicate of `internal/openhands/`
- Both packages manage the same `openhands_keys` collection
- Both can rotate the same keys, causing race conditions
- This fix mirrors the identical fix applied to `internal/openhands/rotation.go` (Task 1)
- Future improvement: consolidate these duplicate packages

**Verification:**
- Build succeeded: `go build ./internal/openhandspool/` ✓
- No compilation errors
- Logic matches Task 1 implementation


## Task 3: Idempotency Check in keypool.KeyPool.RotateKey()

**Date:** 2026-01-25

**File Modified:** `goproxy/internal/keypool/rotation.go` (lines 68-80)

**Changes Applied:**
1. Captured `deleteResult` from `DeleteOne()` call on `troll_keys` collection (line 70)
2. Changed `:=` to `=` (variable already declared on line 61 for bindings delete)
3. Updated log message to include `DeletedCount` (line 74)
4. Added idempotency check after delete operation (lines 77-80)
5. Function returns `"", nil` early if `DeletedCount == 0`

**Code Pattern:**
```go
// Delete bindings first
deleteResult, err := bindingsCol.DeleteMany(ctx, bson.M{"factoryKeyId": failedKeyID})

// Delete troll key (reuse deleteResult variable)
trollKeysCol := db.TrollKeysCollection()
deleteResult, err = trollKeysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
if err != nil {
    log.Printf("⚠️ [KeyRotation] Failed to delete troll key: %v", err)
} else {
    log.Printf("🗑️ [KeyRotation] Deleted troll key: %s (count: %d)", failedKeyID, deleteResult.DeletedCount)
}

// Idempotency check: if DeletedCount is 0, another process already rotated this key
if deleteResult.DeletedCount == 0 {
    log.Printf("⚠️ [KeyRotation] Key %s already rotated by another process, skipping insert", failedKeyID)
    return "", nil
}
```

**Why This Works:**
- MongoDB's `DeleteOne()` returns `DeletedCount = 0` if document doesn't exist
- This indicates another process already deleted (and rotated) the key
- Skipping the INSERT prevents pool size from growing incorrectly

**Key Difference from Tasks 1 & 2:**
- **Collection:** `troll_keys` (factory key pool) instead of `openhands_keys`
- **Purpose:** Rotate factory keys used by main proxy instead of OpenHands-specific keys
- **Pattern:** Identical idempotency logic, different collection
- **Variable Reuse:** Must use `=` not `:=` because `deleteResult` already declared earlier

**Architectural Note:**
- This rotation is for the main TrollLLM factory key pool
- Collection: `troll_keys` (main factory keys)
- Bindings: `proxy_key_bindings` (maps factory keys to proxies)
- Same race condition as Tasks 1 & 2, different key pool

**Verification:**
- Build succeeded: `go build ./internal/keypool/` ✓
- No compilation errors
- Logic matches Task 1 & 2 implementations

**Pattern Summary (All 3 Tasks):**
All three rotation functions now follow the same idempotency pattern:
1. `internal/openhands/backup.go` → `openhands_keys` collection
2. `internal/openhandspool/rotation.go` → `openhands_keys` collection (duplicate package)
3. `internal/keypool/rotation.go` → `troll_keys` collection (factory keys)

The fix prevents duplicate key insertion in all rotation mechanisms.


## Task 5: Add Explicit Logging for Already-Rotated Case in CheckAndRotateOnError()

**Date:** 2026-01-25

**File Modified:** `goproxy/internal/openhandspool/rotation.go` (lines 163-169)

**Changes Applied:**
Added `else` branch to log when `RotateKey()` returns empty string (line 169):
```go
newKeyID, err := p.RotateKey(keyID, reason)
if err != nil {
    log.Printf("❌ [OpenHandsRotation] Rotation failed: %v", err)
    p.MarkExhausted(keyID)
} else if newKeyID != "" {
    log.Printf("✅ [OpenHandsRotation] Rotated: %s -> %s", keyID, newKeyID)
} else {
    log.Printf("ℹ️ [OpenHandsRotation] Key %s was already rotated by another process", keyID)
}
```

**Purpose:**
Make the "silent success" case explicit for debugging and transparency.

**Why This Matters:**
- The current code correctly handles empty return (doesn't log false success)
- But it's silent - no indication in logs that rotation was attempted
- New log makes it clear when concurrent rotation occurred
- Helps with debugging and understanding system behavior

**Not a Bug Fix:**
Unlike Tasks 1-4 which fixed actual logic bugs, this is purely a logging improvement.
The behavior was already correct (Task 2 ensures `RotateKey()` returns `""` when idempotency check fails).
This just makes that case visible in logs.

**Pattern:**
When a function returns empty string to signal "operation already done", the caller should:
1. Not treat it as success (don't log success message) ✓ Already implemented
2. Not treat it as error (don't mark as exhausted) ✓ Already implemented
3. Log for transparency (now added) ✓ This task

**Verification:**
- Build succeeded: `go build ./internal/openhandspool/` ✓
- No compilation errors
- Behavior unchanged, logging improved


## Task 4: Update Caller Code (spend_checker.go)

**Completed:** 2026-01-25

**What was done:**
- Modified `goproxy/internal/openhands/spend_checker.go` to handle empty string returns from `RotateKey()`
- Added `else if newKeyID == ""` branches at TWO rotation call sites:
  1. Lines 209-218 (budget_exceeded path)
  2. Lines 247-256 (proactive_threshold path)

**Key changes:**
- When `RotateKey()` returns empty string, log "Key was already rotated, skipping"
- Do NOT call `saveSpendHistory()` with rotation info when key was already rotated
- Only save rotation history when `newKeyID != ""`

**Pattern learned:**
- After adding idempotency checks to rotation functions (Tasks 1-3), callers must distinguish:
  - `err != nil` → rotation failed (save failure history)
  - `newKeyID == ""` → already rotated by another process (skip history save, just log)
  - `newKeyID != ""` → successful rotation (save rotation history)

**Verification:**
- `go build ./internal/openhands/` compiled successfully
- Both rotation paths now handle the empty string case gracefully


## Test Created for Rotation Idempotency

**File:** `goproxy/internal/openhands/backup_test.go`

**Test Function:** `TestRotateKey_Idempotency`

**Type:** Documentation test (skipped, requires MongoDB integration)

**Purpose:**
- Documents the idempotency behavior added in Tasks 1-3
- Serves as regression prevention documentation
- Provides manual verification steps for production testing

**Key Documentation Points:**
1. When `RotateKey()` called twice for same key:
   - First call: `DeletedCount = 1`, inserts new key, returns new ID
   - Second call: `DeletedCount = 0`, skips insert, returns `""`
2. Prevents duplicate key creation from concurrent rotation triggers
3. References backup.go lines 229-233 (idempotency check implementation)

**Verification:**
- Test compiles and runs: ✅ `go test -v ./internal/openhands/... -run TestRotateKey_Idempotency`
- Test is properly skipped (no MongoDB setup required): ✅
- All existing openhands tests still pass: ✅

**Pattern Followed:**
- Matches existing test style in `spend_checker_test.go`
- Uses `t.Skip()` for integration tests requiring MongoDB
- Includes comprehensive documentation in function comments
- Provides behavior matrix for expected outcomes

**Future Integration Test:**
If MongoDB test infrastructure is added, the test can be expanded to:
1. Insert test key → openhands_keys
2. Call RotateKey() → verify success
3. Call RotateKey() again → verify returns ""
4. Verify backup key count changed by 1 (not 2)

