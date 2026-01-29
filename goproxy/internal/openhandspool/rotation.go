package openhandspool

import (
	"context"
	"log"
	"strings"
	"time"

	"goproxy/db"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// RotateKey replaces a failed key with a backup key:
// 1. Check if key exists (early idempotency check)
// 2. Atomically claim backup key with FindOneAndUpdate (marks as used)
// 3. DELETE the old openhands_key document completely
// 4. INSERT backup key as new openhands_key
// 5. UPDATE bindings to point to new key ID
// 6. Update in-memory pool
func (p *KeyPool) RotateKey(failedKeyID string, reason string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Printf("🔄 [OpenHandsRotation] Starting rotation for failed key: %s (reason: %s)", failedKeyID, reason)

	// 1. Check if key exists before fetching backup (idempotency check moved earlier)
	openHandsKeysCol := db.OpenHandsKeysCollection()
	var existingKey struct {
		ID string `bson:"_id"`
	}
	err := openHandsKeysCol.FindOne(ctx, bson.M{"_id": failedKeyID}).Decode(&existingKey)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Printf("⚠️ [OpenHandsRotation] Key %s already rotated by another process, skipping", failedKeyID)
			return "", nil
		}
		log.Printf("❌ [OpenHandsRotation] Failed to check key existence: %v", err)
		return "", err
	}

	// 2. Atomically claim an available backup key
	backupKeysCol := db.OpenHandsBackupKeysCollection()
	var backupKey BackupKey
	updateResult := backupKeysCol.FindOneAndUpdate(
		ctx,
		bson.M{"isUsed": false},
		bson.M{
			"$set": bson.M{
				"isUsed":  true,
				"usedAt":  time.Now(),
				"usedFor": failedKeyID,
			},
		},
		options.FindOneAndUpdate().SetReturnDocument(options.Before),
	)
	if err := updateResult.Decode(&backupKey); err != nil {
		log.Printf("❌ [OpenHandsRotation] No backup keys available: %v", err)
		return "", err
	}

	newKeyMasked := backupKey.APIKey
	if len(newKeyMasked) > 12 {
		newKeyMasked = newKeyMasked[:8] + "..." + newKeyMasked[len(newKeyMasked)-4:]
	}
	log.Printf("✅ [OpenHandsRotation] Atomically claimed backup key: %s (%s)", backupKey.ID, newKeyMasked)

	// 3. DELETE old key completely
	deleteResult, err := openHandsKeysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
	if err != nil {
		log.Printf("⚠️ [OpenHandsRotation] Failed to delete old key: %v", err)
	} else {
		log.Printf("🗑️ [OpenHandsRotation] Deleted old key: %s (count: %d)", failedKeyID, deleteResult.DeletedCount)
	}

	// 4. INSERT backup key as new openhands_key
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

	// 5. UPDATE bindings to point to new key ID
	bindingsCol := db.GetCollection("openhands_bindings")
	updateResult2, err := bindingsCol.UpdateMany(ctx,
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
	} else if updateResult2.ModifiedCount > 0 {
		log.Printf("✅ [OpenHandsRotation] Updated %d bindings: %s -> %s", updateResult2.ModifiedCount, failedKeyID, backupKey.ID)
	} else {
		log.Printf("ℹ️ [OpenHandsRotation] No bindings to update for key %s", failedKeyID)
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
			} else {
				log.Printf("ℹ️ [OpenHandsRotation] Key %s was already rotated by another process", keyID)
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

// NeedReloadKey represents a key that needs manual reloading
type NeedReloadKey struct {
	Email     string    `bson:"email"`
	KeyID     string    `bson:"keyId"`
	Reason    string    `bson:"reason"`
	CreatedAt time.Time `bson:"createdAt"`
}

// NeedReloadKeysCollection returns the collection for keys that need reloading
const NeedReloadKeysCollectionName = "openhands_need_reload_keys"

// SaveNeedReloadKey saves a rotated key to the need_reload_keys collection
// Adds @hotmail.com suffix to the key ID to form the email
func SaveNeedReloadKey(keyID string, reason string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	email := keyID + "@hotmail.com"
	entry := NeedReloadKey{
		Email:     email,
		KeyID:     keyID,
		Reason:    reason,
		CreatedAt: time.Now(),
	}

	col := db.GetCollection(NeedReloadKeysCollectionName)
	if col == nil {
		log.Printf("⚠️ [NeedReloadKey] Failed to get collection")
		return
	}

	_, err := col.InsertOne(ctx, entry)
	if err != nil {
		log.Printf("⚠️ [NeedReloadKey] Failed to save key %s: %v", keyID, err)
	} else {
		log.Printf("📧 [NeedReloadKey] Saved for reload: %s", email)
	}
}
