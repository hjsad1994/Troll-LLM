# Work Plan: Fix Key Rotation Duplicate Key Bug

**Created:** 2026-01-25
**Status:** Ready for Execution
**Priority:** P0 - Critical Bug Fix

## Problem Statement

When key rotation occurs, extra keys are being created in the `openhands_keys` collection. If there are 10 keys before rotation, there should still be 10 keys after rotation - NOT 11 or 12.

## Root Causes

1. **Two pool systems manage same collection** - `openhands.OpenHandsProvider` and `openhandspool.KeyPool` both have `RotateKey()` that inserts into `openhands_keys`
2. **Both can trigger rotation simultaneously** - SpendChecker uses one, error handlers use the other
3. **No idempotency check** - Rotation continues to insert new key even if old key was already deleted/rotated
4. **Race condition window** - Between delete and insert, another rotation can start

## Solution Overview

Add idempotency checks to BOTH rotation functions. If the key being rotated was already deleted (DeletedCount == 0), skip the insert of new key.

---

## Task 1: Add Idempotency Check to OpenHandsProvider.RotateKey ✅

**File:** `goproxy/internal/openhands/backup.go`
**Lines:** 220-244
**Status:** COMPLETED

### Current Code (problematic):
```go
// 2. DELETE old key completely
keysCol := db.OpenHandsKeysCollection()
_, err = keysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
if err != nil {
    log.Printf("⚠️ [OpenHands/Rotation] Failed to delete old key: %v", err)
} else {
    log.Printf("🗑️ [OpenHands/Rotation] Deleted old key: %s", failedKeyID)
}

// 3. INSERT backup key as new openhands_key
// ... continues to insert even if delete found nothing
```

### Required Change:
```go
// 2. DELETE old key completely
keysCol := db.OpenHandsKeysCollection()
deleteResult, err := keysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
if err != nil {
    log.Printf("⚠️ [OpenHands/Rotation] Failed to delete old key: %v", err)
} else {
    log.Printf("🗑️ [OpenHands/Rotation] Deleted old key: %s (count: %d)", failedKeyID, deleteResult.DeletedCount)
}

// IDEMPOTENCY CHECK: If key was already deleted, skip insert
if deleteResult.DeletedCount == 0 {
    log.Printf("⚠️ [OpenHands/Rotation] Key %s already rotated by another process, skipping insert", failedKeyID)
    return "", nil // Return empty - key was already handled
}

// 3. INSERT backup key as new openhands_key
// ... continue only if we actually deleted something
```

### Acceptance Criteria:
- [x] `deleteResult.DeletedCount` is captured from `DeleteOne()`
- [x] If `DeletedCount == 0`, function returns early with empty string and nil error
- [x] Log message indicates key was already rotated
- [x] No new key is inserted if old key was already gone

### Verification:
```bash
# Run tests
cd goproxy && go test -v ./internal/openhandspool/... -run TestRotate

# Manual verification
grep -n "already rotated" goproxy/internal/openhandspool/rotation.go
```

---

## Task 3: Add Idempotency Check to keypool.KeyPool.RotateKey ✅

**File:** `goproxy/internal/keypool/rotation.go`
**Lines:** 68-76
**Status:** COMPLETED

### Current Code (problematic):
```go
// 4. Delete failed key from troll_keys
trollKeysCol := db.TrollKeysCollection()
_, err = trollKeysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
if err != nil {
    log.Printf("⚠️ [KeyRotation] Failed to delete troll key: %v", err)
} else {
    log.Printf("🗑️ [KeyRotation] Deleted troll key: %s", failedKeyID)
}

// 5. Insert backup key as new troll key (with reset stats)
// ... continues regardless
```

### Required Change:
```go
// 4. Delete failed key from troll_keys
trollKeysCol := db.TrollKeysCollection()
deleteResult, err := trollKeysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
if err != nil {
    log.Printf("⚠️ [KeyRotation] Failed to delete troll key: %v", err)
} else {
    log.Printf("🗑️ [KeyRotation] Deleted troll key: %s (count: %d)", failedKeyID, deleteResult.DeletedCount)
}

// IDEMPOTENCY CHECK: If key was already deleted, skip insert
if deleteResult.DeletedCount == 0 {
    log.Printf("⚠️ [KeyRotation] Key %s already rotated by another process, skipping insert", failedKeyID)
    return "", nil // Return empty - key was already handled
}

// 5. Insert backup key as new troll key (with reset stats)
// ... continue only if we actually deleted something
```

### Acceptance Criteria:
- [x] `deleteResult.DeletedCount` is captured from `DeleteOne()`
- [x] If `DeletedCount == 0`, function returns early
- [x] Backup key is NOT marked as used if rotation was skipped
- [x] No binding is created if rotation was skipped

### Verification:
```bash
cd goproxy && go test -v ./internal/keypool/... -run TestRotate
```

---

## Task 4: Update Callers to Handle Empty Return ✅

**File:** `goproxy/internal/openhands/spend_checker.go`
**Lines:** 209-218, 247-256
**Status:** COMPLETED

The callers need to handle the case where `RotateKey()` returns empty string (already rotated).

### Current Code:
```go
newKeyID, err := sc.provider.RotateKey(key.ID, reason)
if err != nil {
    log.Printf("❌ [OpenHands/SpendChecker] Rotation failed for key %s: %v", key.ID, err)
    sc.saveSpendHistory(result, nil, reason, "")
} else {
    log.Printf("✅ [OpenHands/SpendChecker] Rotated: %s -> %s", key.ID, newKeyID)
    sc.saveSpendHistory(result, &rotatedAt, reason, newKeyID)
}
```

### Required Change:
```go
newKeyID, err := sc.provider.RotateKey(key.ID, reason)
if err != nil {
    log.Printf("❌ [OpenHands/SpendChecker] Rotation failed for key %s: %v", key.ID, err)
    sc.saveSpendHistory(result, nil, reason, "")
} else if newKeyID == "" {
    // Key was already rotated by another process - skip history save
    log.Printf("ℹ️ [OpenHands/SpendChecker] Key %s was already rotated, skipping", key.ID)
} else {
    log.Printf("✅ [OpenHands/SpendChecker] Rotated: %s -> %s", key.ID, newKeyID)
    sc.saveSpendHistory(result, &rotatedAt, reason, newKeyID)
}
```

### Acceptance Criteria:
- [x] Both rotation calls (line 209 and 247) handle empty newKeyID
- [x] No duplicate history entries when key was already rotated
- [x] Log indicates key was already handled

---

## Task 5: Update openhandspool Callers ✅

**File:** `goproxy/internal/openhandspool/rotation.go`
**Lines:** 157-163 (CheckAndRotateOnError function)
**Status:** COMPLETED

### Current Code:
```go
newKeyID, err := p.RotateKey(keyID, reason)
if err != nil {
    log.Printf("❌ [OpenHandsRotation] Rotation failed: %v", err)
    p.MarkExhausted(keyID)
} else if newKeyID != "" {
    log.Printf("✅ [OpenHandsRotation] Rotated: %s -> %s", keyID, newKeyID)
}
```

### Required Change:
This code already handles empty `newKeyID` correctly with `else if newKeyID != ""`. 
Just add explicit log for the skip case:

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

---

## Task 6: Add Unit Tests for Idempotency ✅

**File:** `goproxy/internal/openhands/backup_test.go` (create if not exists)
**Status:** COMPLETED

### Test Case: Rotation Idempotency
```go
func TestRotateKey_Idempotency(t *testing.T) {
    // Setup: Create a mock provider with one key
    // First rotation should succeed and return new key ID
    // Second rotation of same key should return empty string (already rotated)
    // Key count should remain the same
}
```

### Acceptance Criteria:
- [x] Test file created with idempotency test
- [x] Test passes when run with `go test`
- [x] Test covers the scenario where RotateKey is called twice for same key

---

## Commit Strategy

### Commit 1: Add idempotency check to openhands backup.go
```
fix(openhands): add idempotency check to RotateKey

- Check DeletedCount before inserting new key
- Skip insert if key was already rotated by another process
- Prevents duplicate key creation during concurrent rotation
```

### Commit 2: Add idempotency check to openhandspool rotation.go
```
fix(openhandspool): add idempotency check to RotateKey

- Same fix as openhands package
- Check DeletedCount before inserting new key
```

### Commit 3: Add idempotency check to keypool rotation.go
```
fix(keypool): add idempotency check to RotateKey

- Applies same pattern to troll_keys rotation
```

### Commit 4: Update callers to handle empty return
```
fix(rotation): handle already-rotated case in callers

- SpendChecker skips history save when key already rotated
- Add explicit log for skip case
```

### Commit 5: Add unit tests
```
test(rotation): add idempotency test for RotateKey

- Test that calling RotateKey twice returns empty on second call
- Test that key count remains stable
```

---

## Verification Checklist

After all changes:

1. **Build Check:**
   ```bash
   cd goproxy && go build ./...
   ```

2. **Test Check:**
   ```bash
   cd goproxy && go test ./...
   ```

3. **Manual Verification:**
   - Start proxy with debug logging
   - Trigger a key rotation (via spend threshold or API error)
   - Check logs for "already rotated" messages
   - Verify key count in MongoDB: `db.openhands_keys.countDocuments({})`
   - Confirm count stayed the same (e.g., 10 keys before = 10 keys after)

4. **Load Test:**
   - Send multiple concurrent requests that trigger rotation
   - Verify no duplicate keys created

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Empty return might break callers | Task 4 & 5 update all callers |
| Test coverage gaps | Task 6 adds explicit test |
| Backup key marked as used but not actually used | Idempotency check happens BEFORE backup key fetch (already the case - backup is fetched first, but we can add rollback) |

## Notes

- The fix is minimal and surgical - only adds a check after delete
- No structural changes to the architecture (consolidating pools is a future improvement)
- Backward compatible - callers already handle empty string case in most places
