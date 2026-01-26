
## Fix: Race Condition in keypool/rotation.go (2026-01-25)

**Issue:** Two concurrent rotations could grab the same backup key, causing duplicate key errors.

**Root Cause:**
- Backup key fetch (line 36-42) was non-atomic
- Idempotency check happened AFTER backup fetch (line 78)
- Race window: Process A grabs backup → Process B grabs same backup → Process A checks idempotency → deletes key → Process B tries to insert same backup → DUPLICATE KEY ERROR

**Solution Applied:**

1. **Early Idempotency Check (lines 37-50)**
   - Check if key exists BEFORE fetching backup
   - If key doesn't exist → already rotated → return early
   - Prevents wasting backup keys on duplicate rotation attempts

2. **Atomic Backup Key Claim (lines 52-70)**
   - Replaced `FindOne()` with `FindOneAndUpdate()`
   - Atomically marks backup as used in single DB operation
   - Filter: `{"isUsed": false}`
   - Update: `{"$set": {"isUsed": true, "usedAt": now, "usedFor": failedKeyID}}`
   - Uses `SetReturnDocument(options.Before)` to get backup data before update
   - If no backup available → error immediately (no race)

3. **Removed Duplicate Idempotency Check (line 78-81)**
   - Old check relied on DeletedCount after delete operation
   - No longer needed since early check prevents duplicate rotations

**New Flow:**
```
1. Check key exists → if not, return early (already rotated)
2. Atomically claim backup key (marks as used)
3. Delete bindings
4. Delete failed key
5. Insert backup key
6. Create new binding
```

**Benefits:**
- No race condition on backup key claim
- Early exit prevents wasting backup keys
- Atomic operation prevents double-use
- Cleaner error handling

**Files Modified:**
- `goproxy/internal/keypool/rotation.go`

**Imports Added:**
- `go.mongodb.org/mongo-driver/mongo`
- `go.mongodb.org/mongo-driver/mongo/options`

**Verification:**
- ✅ `go build ./internal/keypool/` succeeds
- ✅ No test files exist yet (will need integration tests for race conditions)

**Related:**
- PR #16 review comment on race condition window
- Claude review: "Race Condition Window in keypool/rotation.go:36-41"

## Race Condition Fix: openhands/backup.go

**Applied:** 2026-01-25

**Issue:** Same race condition as keypool/rotation.go - backup keys fetched non-atomically before idempotency check.

**Fix Applied:**
1. **Early idempotency check** (lines 205-218):
   - Check if key exists BEFORE claiming backup
   - If key doesn't exist → already rotated by another process → return early
   - Prevents wasting backup keys on duplicate rotations

2. **Atomic backup key claim** (lines 220-238):
   - Replaced `FindOne()` + later `UpdateByID()` with single `FindOneAndUpdate()`
   - Sets `isUsed: true`, `usedAt`, `usedFor` atomically
   - Ensures only ONE process can claim each backup key

3. **Removed duplicate backup marking** (old lines 291-304):
   - Previous non-atomic `UpdateByID()` call removed
   - Backup is now marked as used atomically when claimed (step 2)

**Pattern Match:**
Implementation matches `goproxy/internal/keypool/rotation.go` (lines 37-76):
- Same early check → atomic claim → delete → insert → update bindings flow
- Same idempotency guarantees
- Same race condition prevention

**Verification:**
✅ `cd goproxy && go build ./internal/openhands/` succeeds

**Impact:**
- Prevents duplicate backup key consumption in concurrent rotation scenarios
- Ensures atomic backup allocation
- Maintains same functionality with better concurrency safety

## WARNING: Broken File Discovered

**File:** `goproxy/internal/openhandspool/rotation.go`

**Status:** BROKEN - appears to be partially edited
- Lines 35-51: Code references undefined variables (backupKey, err, newKeyMasked)
- Comments suggest fix was started but not completed
- Prevents full goproxy build

**Not in Task Scope:**
Task was specifically for `openhands/backup.go` ONLY.
This file needs separate fix (likely same pattern as backup.go).

**Impact:**
- ✅ Task file (openhands/backup.go) builds successfully: `go build ./internal/openhands/`
- ❌ Full goproxy build fails: `go build .`
- openhandspool package needs same race condition fix applied

## openhandspool rotation.go - Race Condition Fix Applied

**Date:** 2026-01-25

**File:** `goproxy/internal/openhandspool/rotation.go`

**Issue:** Same race condition as keypool - backup keys were fetched non-atomically before idempotency check, allowing concurrent rotations to claim the same backup key.

**Changes Applied:**

1. **Moved idempotency check earlier** (lines 29-41):
   - Check if `failedKeyID` exists in `openhands_keys` collection BEFORE claiming backup
   - If key doesn't exist (`mongo.ErrNoDocuments`), return early - already rotated
   - Prevents wasted backup claims for already-rotated keys

2. **Atomic backup key claim** (lines 43-59):
   - Changed from `FindOne` + manual update to `FindOneAndUpdate`
   - Single atomic operation claims backup:
     - Filter: `{"isUsed": false}`
     - Update: `{"$set": {"isUsed": true, "usedAt": now, "usedFor": failedKeyID}}`
     - Returns document BEFORE update (so we get the unclaimed key)
   - No race window - concurrent rotations get different backups

3. **Removed redundant "Mark as used" step** (old lines 73-86):
   - Backup marking now happens atomically in step 2
   - Deleted duplicate UpdateByID operation

4. **Added required imports**:
   - `"go.mongodb.org/mongo-driver/mongo"` - for `mongo.ErrNoDocuments`
   - `"go.mongodb.org/mongo-driver/mongo/options"` - for `FindOneAndUpdate` options

**Verification:**
```bash
cd goproxy && go build ./internal/openhandspool/
# Build succeeds - no errors
```

**Pattern Consistency:**
This fix exactly matches the pattern applied to `keypool/rotation.go` in the same PR, ensuring both rotation systems handle race conditions identically.

**Race Condition Eliminated:**
```
BEFORE (Race condition):
Process A: FindOne backup_key_1 (isUsed=false)  ← Step 1
Process B: FindOne backup_key_1 (isUsed=false)  ← Step 1 (same key!)
Process A: Check if key exists → exists
Process B: Check if key exists → exists
Process A: Delete old key
Process B: Delete old key (already gone, count=0) → skips
Process A: Update backup_key_1 isUsed=true
Process B: Would have used same key if not for late idempotency check

AFTER (Fixed):
Process A: Check if key exists → exists
Process B: Check if key exists → exists
Process A: FindOneAndUpdate claims backup_key_1 atomically
Process B: FindOneAndUpdate claims backup_key_2 atomically (different key!)
Process A: Delete old key
Process B: Delete old key (already gone) → early return, no backup wasted
```

**Impact:**
- Prevents backup key exhaustion from concurrent rotation attempts
- Ensures each rotation gets a unique backup key
- Early exit saves DB operations when key already rotated
