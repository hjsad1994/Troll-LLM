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
// 1. Check if key exists and not already exhausted (early idempotency check)
// 2. Mark old key as EXHAUSTED (this also deletes bindings automatically via MarkStatus)
// 3. Atomically claim backup key with FindOneAndUpdate (marks as used)
// 4. INSERT backup key as new openhands_key
// 5. Create NEW bindings for the new key (old bindings already deleted in step 2)
// 6. Update in-memory pool
// 7. Keep old key in DB with exhausted status for admin review
func (p *KeyPool) RotateKey(failedKeyID string, reason string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Printf("🔄 [OpenHandsRotation] Starting rotation for failed key: %s (reason: %s)", failedKeyID, reason)

	// 1. Check if key exists and get current status
	openHandsKeysCol := db.OpenHandsKeysCollection()
	var existingKey struct {
		ID     string             `bson:"_id"`
		Status OpenHandsKeyStatus `bson:"status"`
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

	// If key is already exhausted, skip rotation (idempotent)
	if existingKey.Status == StatusExhausted {
		log.Printf("⚠️ [OpenHandsRotation] Key %s already marked as exhausted, skipping rotation", failedKeyID)
		return "", nil
	}

	// 2. Get bindings BEFORE marking exhausted (so we can recreate them for new key)
	bindingsCol := db.GetCollection("openhands_bindings")
	cursor, err := bindingsCol.Find(ctx, bson.M{"openhandsKeyId": failedKeyID})
	if err != nil {
		log.Printf("⚠️ [OpenHandsRotation] Failed to fetch bindings for key %s: %v", failedKeyID, err)
	}

	type BindingInfo struct {
		ProxyID  string `bson:"proxyId"`
		Priority int    `bson:"priority"`
	}
	var oldBindings []BindingInfo
	if cursor != nil {
		defer cursor.Close(ctx)
		if err := cursor.All(ctx, &oldBindings); err != nil {
			log.Printf("⚠️ [OpenHandsRotation] Failed to decode bindings: %v", err)
			oldBindings = []BindingInfo{} // Continue without bindings
		}
	}
	log.Printf("📋 [OpenHandsRotation] Found %d bindings for key %s", len(oldBindings), failedKeyID)

	// 3. Mark key as EXHAUSTED (this deletes bindings automatically via MarkStatus)
	log.Printf("🚫 [OpenHandsRotation] Marking key %s as exhausted (reason: %s)", failedKeyID, reason)
	p.MarkExhausted(failedKeyID)

	// 4. Atomically claim an available backup key
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

	// 5. INSERT backup key as new openhands_key
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

	// 6. Recreate bindings from old key to new key
	if len(oldBindings) > 0 {
		for _, binding := range oldBindings {
			newBinding := bson.M{
				"proxyId":        binding.ProxyID,
				"openhandsKeyId": backupKey.ID,
				"priority":       binding.Priority,
				"isActive":       true,
				"createdAt":      now,
			}
			_, err := bindingsCol.InsertOne(ctx, newBinding)
			if err != nil {
				log.Printf("⚠️ [OpenHandsRotation] Failed to create binding for proxy %s: %v", binding.ProxyID, err)
			}
		}
		log.Printf("✅ [OpenHandsRotation] Recreated %d bindings for new key %s", len(oldBindings), backupKey.ID)
	} else {
		log.Printf("ℹ️ [OpenHandsRotation] No bindings to recreate for key %s", backupKey.ID)
	}

	// 7. Update in-memory pool - remove old key, add new key
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

	log.Printf("✅ [OpenHandsRotation] Rotation complete: %s (kept as exhausted) -> %s (new healthy key)", failedKeyID, backupKey.ID)
	return backupKey.ID, nil
}

// CheckAndRotateOnError checks if the error warrants key rotation and performs it
// Simple: error status code -> disable and rotate
func (p *KeyPool) CheckAndRotateOnError(keyID string, statusCode int, errorBody string) {
	shouldRotate := false
	reason := ""
	isAuthError := false // Track if this is an authentication error (needs refresh, not exhausted)

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
		isAuthError = true
	case 402:
		shouldRotate = true
		reason = "payment_required"
	case 403:
		shouldRotate = true
		reason = "forbidden"
		isAuthError = true
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
				// Mark appropriately based on error type
				if isAuthError {
					p.MarkNeedRefresh(keyID, truncateError(errorBody, 500))
				} else {
					p.MarkExhausted(keyID)
				}
			} else if newKeyID != "" {
				log.Printf("✅ [OpenHandsRotation] Rotated: %s -> %s", keyID, newKeyID)
			} else {
				log.Printf("ℹ️ [OpenHandsRotation] Key %s was already rotated by another process", keyID)
			}
		} else {
			// No backup keys - mark appropriately based on error type
			if isAuthError {
				p.MarkNeedRefresh(keyID, truncateError(errorBody, 500))
				log.Printf("🔄 [OpenHandsRotation] No backup keys, %s marked as need_refresh", keyID)
			} else {
				p.MarkExhausted(keyID)
				log.Printf("🚨 [OpenHandsRotation] No backup keys, %s disabled", keyID)
			}
		}
	}
}

// truncateError truncates error message to maxLen characters
func truncateError(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
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
