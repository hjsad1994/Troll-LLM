package openhandspool

import (
	"context"
	"log"
	"strings"
	"time"

	"goproxy/db"

	"go.mongodb.org/mongo-driver/bson"
)

// RotateKey replaces a failed key with a backup key:
// 1. Find available backup key
// 2. DELETE the old openhands_key document completely
// 3. INSERT backup key as new openhands_key
// 4. UPDATE bindings to point to new key ID
// 5. Mark backup key as used
// 6. Update in-memory pool
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

	// 2. DELETE old key completely
	openHandsKeysCol := db.OpenHandsKeysCollection()
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

	// 3. INSERT backup key as new openhands_key
	now := time.Now()
	newKeyDoc := bson.M{
		"_id":           backupKey.ID,
		"apiKey":        backupKey.APIKey,
		"status":        StatusHealthy,
		"tokensUsed":    int64(0),
		"requestsCount": int64(0),
		"createdAt":     now,
		"replacedKey":   failedKeyID, // Track which key this replaced
	}
	_, err = openHandsKeysCol.InsertOne(ctx, newKeyDoc)
	if err != nil {
		log.Printf("❌ [OpenHandsRotation] Failed to insert new key: %v", err)
		return "", err
	}
	log.Printf("✅ [OpenHandsRotation] Inserted new key: %s (%s)", backupKey.ID, newKeyMasked)

	// 4. UPDATE bindings to point to new key ID
	bindingsCol := db.GetCollection("openhands_bindings")
	updateResult, err := bindingsCol.UpdateMany(ctx,
		bson.M{"openhandsKeyId": failedKeyID},
		bson.M{
			"$set": bson.M{
				"openhandsKeyId": backupKey.ID,
				"updatedAt":      now,
			},
		},
	)
	if err != nil {
		log.Printf("⚠️ [OpenHandsRotation] Failed to update bindings: %v", err)
	} else if updateResult.ModifiedCount > 0 {
		log.Printf("✅ [OpenHandsRotation] Updated %d bindings: %s -> %s", updateResult.ModifiedCount, failedKeyID, backupKey.ID)
	} else {
		log.Printf("ℹ️ [OpenHandsRotation] No bindings to update for key %s", failedKeyID)
	}

	// 5. Mark backup key as used
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
	} else {
		log.Printf("✅ [OpenHandsRotation] Marked backup %s as used (replaced: %s)", backupKey.ID, failedKeyID)
	}

	// 6. Update in-memory pool - remove old key, add new key
	p.mu.Lock()
	newKeys := make([]*OpenHandsKey, 0)
	for _, key := range p.keys {
		if key.ID != failedKeyID {
			newKeys = append(newKeys, key)
		}
	}
	newKeys = append(newKeys, &OpenHandsKey{
		ID:            backupKey.ID,
		APIKey:        backupKey.APIKey,
		Status:        StatusHealthy,
		TokensUsed:    0,
		RequestsCount: 0,
		CreatedAt:     now,
	})
	p.keys = newKeys
	p.mu.Unlock()

	log.Printf("✅ [OpenHandsRotation] Rotation complete: %s (deleted) -> %s (new)", failedKeyID, backupKey.ID)
	return backupKey.ID, nil
}

// CheckAndRotateOnError checks if the error warrants key rotation and performs it
// Simple: error status code -> disable and rotate
func (p *KeyPool) CheckAndRotateOnError(keyID string, statusCode int, errorBody string) {
	shouldRotate := false
	reason := ""

	switch statusCode {
	case 400:
		// Check if it's a budget_exceeded error
		if strings.Contains(errorBody, "ExceededBudget") || strings.Contains(errorBody, "budget_exceeded") || strings.Contains(errorBody, "over budget") {
			shouldRotate = true
			reason = "budget_exceeded"
			log.Printf("🚨 [OpenHandsRotation] Key %s budget exceeded, triggering rotation", keyID)
		}
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
