package openhandspool

import (
	"context"
	"log"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

// RotateKey replaces a failed key completely:
// 1. Delete failed key from openhands_keys
// 2. Insert backup key into openhands_keys
// 3. Mark backup key as used
func (p *KeyPool) RotateKey(failedKeyID string, reason string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Printf("🔄 [OpenHandsRotation] Starting rotation for failed key: %s (reason: %s)", failedKeyID, reason)

	// 1. Find an available backup key
	backupKeysCol := db.OpenHandsBackupKeysCollection()
	var backupKey BackupKey
	err := backupKeysCol.FindOne(ctx, bson.M{"isUsed": false}).Decode(&backupKey)
	if err != nil {
		log.Printf("❌ [OpenHandsRotation] No backup keys available: %v", err)
		return "", err
	}

	newKeyMasked := backupKey.APIKey
	if len(newKeyMasked) > 12 {
		newKeyMasked = newKeyMasked[:8] + "..." + newKeyMasked[len(newKeyMasked)-4:]
	}

	// 2. Delete failed key from openhands_keys
	openHandsKeysCol := db.OpenHandsKeysCollection()
	_, err = openHandsKeysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
	if err != nil {
		log.Printf("⚠️ [OpenHandsRotation] Failed to delete openhands key: %v", err)
	} else {
		log.Printf("🗑️ [OpenHandsRotation] Deleted openhands key: %s", failedKeyID)
	}

	// 3. Insert backup key as new openhands key (with reset stats)
	now := time.Now()
	newOpenHandsKeyDoc := bson.M{
		"_id":           backupKey.ID,
		"apiKey":        backupKey.APIKey,
		"status":        StatusHealthy,
		"tokensUsed":    int64(0),
		"requestsCount": int64(0),
		"createdAt":     now,
	}
	_, err = openHandsKeysCol.InsertOne(ctx, newOpenHandsKeyDoc)

	// Also create in-memory struct
	newOpenHandsKey := OpenHandsKey{
		ID:            backupKey.ID,
		APIKey:        backupKey.APIKey,
		Status:        StatusHealthy,
		TokensUsed:    0,
		RequestsCount: 0,
		CreatedAt:     now,
	}
	if err != nil {
		log.Printf("❌ [OpenHandsRotation] Failed to insert new openhands key: %v", err)
		return "", err
	}
	log.Printf("✅ [OpenHandsRotation] Inserted new openhands key: %s (%s)", backupKey.ID, newKeyMasked)

	// 4. Mark backup key as used (activated)
	_, err = backupKeysCol.UpdateByID(ctx, backupKey.ID, bson.M{
		"$set": bson.M{
			"isUsed":    true,
			"usedAt":    now,
			"usedFor":   failedKeyID,
			"activated": true,
		},
	})
	if err != nil {
		log.Printf("⚠️ [OpenHandsRotation] Failed to mark backup key as used: %v", err)
	}

	// 5. Update in-memory pool - remove old key, add new key
	p.mu.Lock()
	newKeys := make([]*OpenHandsKey, 0)
	for _, key := range p.keys {
		if key.ID != failedKeyID {
			newKeys = append(newKeys, key)
		}
	}
	newKeys = append(newKeys, &newOpenHandsKey)
	p.keys = newKeys
	p.mu.Unlock()

	log.Printf("✅ [OpenHandsRotation] Rotation complete: %s (dead) -> %s (active)", failedKeyID, backupKey.ID)
	log.Printf("📝 [OpenHandsRotation] Admin can delete backup key %s from openhands_backup_keys (marked as activated)", backupKey.ID)

	return backupKey.ID, nil
}

// CheckAndRotateOnError checks if the error warrants key rotation and performs it
func (p *KeyPool) CheckAndRotateOnError(keyID string, statusCode int, errorBody string) {
	shouldRotate := false
	reason := ""
	bodyLower := strings.ToLower(errorBody)

	// Check status codes
	switch statusCode {
	case 400:
		// Check for budget exceeded error (OpenHands specific)
		if strings.Contains(errorBody, "ExceededBudget") ||
		   strings.Contains(bodyLower, "budget_exceeded") ||
		   strings.Contains(bodyLower, "over budget") {
			shouldRotate = true
			reason = "budget_exceeded"
		}
	case 429:
		// Rate limited - temporary, don't rotate
		p.MarkRateLimited(keyID)
		log.Printf("⚠️ [OpenHandsRotation] Key %s rate limited, marked for cooldown", keyID)
		return
	case 401, 403:
		shouldRotate = true
		reason = "authentication_error"
	case 402:
		shouldRotate = true
		reason = "payment_required"
	}

	// Check for invalid/revoked key
	if !shouldRotate && (strings.Contains(bodyLower, "invalid_api_key") ||
		strings.Contains(bodyLower, "revoked") ||
		strings.Contains(bodyLower, "unauthorized")) {
		shouldRotate = true
		reason = "invalid_key"
	}

	// Check for quota/billing messages
	if !shouldRotate && (strings.Contains(bodyLower, "quota") ||
		strings.Contains(bodyLower, "insufficient credits") ||
		strings.Contains(bodyLower, "billing")) {
		shouldRotate = true
		reason = "quota_exhausted"
	}

	if shouldRotate {
		log.Printf("🚫 [OpenHandsRotation] Key %s needs rotation (reason: %s)", keyID, reason)

		// Check if backup keys available
		backupCount := GetBackupKeyCount()

		if backupCount > 0 {
			// Backup available - rotate to new key
			log.Printf("🔄 [OpenHandsRotation] Found %d backup keys, rotating key %s", backupCount, keyID)
			newKeyID, err := p.RotateKey(keyID, reason)
			if err != nil {
				// Rotation failed - mark as exhausted
				log.Printf("❌ [OpenHandsRotation] Rotation failed: %v", err)
				p.MarkExhausted(keyID)
				log.Printf("🚨 [OpenHandsRotation] Key %s marked as exhausted (disabled)", keyID)
			} else if newKeyID != "" {
				log.Printf("✅ [OpenHandsRotation] Key %s replaced with backup key %s", keyID, newKeyID)
			}
		} else {
			// No backup - mark as exhausted and keep disabled
			log.Printf("⚠️ [OpenHandsRotation] No backup keys available")
			p.MarkExhausted(keyID)
			log.Printf("🚨 [OpenHandsRotation] Key %s marked as exhausted (disabled) - add backup keys to restore service", keyID)
		}
	}
}

// GetBackupKeyCount returns the number of available backup keys
func GetBackupKeyCount() int {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, err := db.OpenHandsBackupKeysCollection().CountDocuments(ctx, bson.M{"isUsed": false})
	if err != nil {
		return 0
	}
	return int(count)
}
