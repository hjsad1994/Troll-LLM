package openhands

import "testing"

// TestRotateKey_Idempotency documents the rotation idempotency behavior.
//
// BEHAVIOR: When RotateKey is called for a key that was already rotated:
// 1. DeleteOne returns DeletedCount = 0 (key already gone)
// 2. Function logs "already rotated by another process"
// 3. Function returns ("", nil) - empty string, no error
// 4. No new key is inserted into the database
//
// This prevents duplicate key creation when concurrent rotation triggers
// fire (e.g., SpendChecker + error handler both trying to rotate).
//
// WHY THIS MATTERS:
// - Before fix: Concurrent rotations could create 2+ backup keys for same failed key
// - After fix: Second rotation sees DeletedCount=0, returns early with empty string
// - Result: Key count remains stable (10 keys → 10 keys after rotation)
//
// IMPLEMENTATION DETAILS:
// - See backup.go lines 229-233 for idempotency check
// - DeleteOne is called before InsertOne
// - DeletedCount == 0 means key was already deleted (rotated by another goroutine)
// - Early return prevents duplicate InsertOne
//
// Manual verification in production:
// 1. Enable DEBUG=true to see rotation logs
// 2. Trigger concurrent rotation (e.g., spend checker + error handler)
// 3. Look for log message: "⚠️ [OpenHands/Rotation] Key %s already rotated by another process"
// 4. Verify key count in openhands_keys collection remains at 10
// 5. Confirm only 1 new backup key was consumed from openhands_backup_keys
func TestRotateKey_Idempotency(t *testing.T) {
	t.Skip("Integration test - requires MongoDB. See function docs for manual verification steps.")

	// Integration test would verify:
	// 1. Insert a test key into openhands_keys collection
	// 2. Call RotateKey(keyID) - should succeed and return new key ID
	// 3. Call RotateKey(keyID) again with SAME key ID - should return ""
	// 4. Verify openhands_backup_keys decreased by 1 (not 2)
	// 5. Verify openhands_keys count increased by 0 (replacement, not addition)
	//
	// Expected behavior matrix:
	// | Call # | DeletedCount | InsertOne Called? | Return Value | Backup Keys Used |
	// |--------|--------------|-------------------|--------------|------------------|
	// | 1st    | 1            | Yes               | new key ID   | 1                |
	// | 2nd    | 0            | No                | ""           | 0                |
}
