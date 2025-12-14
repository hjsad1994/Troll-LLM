package openhandspool

import (
	"context"
	"log"
	"time"

	"goproxy/db"

	"go.mongodb.org/mongo-driver/bson"
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
// Simple: error status code -> disable and rotate
func (p *KeyPool) CheckAndRotateOnError(keyID string, statusCode int, errorBody string) {
	shouldRotate := false
	reason := ""

	switch statusCode {
	case 401:
		shouldRotate = true
		reason = "unauthorized"
	case 402:
		shouldRotate = true
		reason = "payment_required"
	case 403:
		shouldRotate = true
		reason = "forbidden"
	case 429:
		p.MarkRateLimited(keyID)
		return
	}

	if shouldRotate {
		log.Printf("🚫 [OpenHandsRotation] Key %s error %d, rotating...", keyID, statusCode)
		backupCount := GetBackupKeyCount()
		if backupCount > 0 {
			newKeyID, err := p.RotateKey(keyID, reason)
			if err != nil {
				log.Printf("❌ [OpenHandsRotation] Rotation failed: %v", err)
				p.MarkExhausted(keyID)
			} else if newKeyID != "" {
				log.Printf("✅ [OpenHandsRotation] Rotated: %s -> %s", keyID, newKeyID)
			}
		} else {
			p.MarkExhausted(keyID)
			log.Printf("🚨 [OpenHandsRotation] No backup keys, %s disabled", keyID)
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
