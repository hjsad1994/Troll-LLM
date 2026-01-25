package keypool

import (
	"context"
	"log"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"goproxy/db"
	"goproxy/internal/proxy"
)

// BackupKey represents a backup factory key stored in MongoDB
type BackupKey struct {
	ID        string     `bson:"_id" json:"id"`
	APIKey    string     `bson:"apiKey" json:"api_key"`
	IsUsed    bool       `bson:"isUsed" json:"is_used"`
	CreatedAt time.Time  `bson:"createdAt" json:"created_at"`
	UsedAt    *time.Time `bson:"usedAt,omitempty" json:"used_at,omitempty"`
	UsedFor   string     `bson:"usedFor,omitempty" json:"used_for,omitempty"` // Which key it replaced
}

// RotateKey replaces a failed key completely:
// 1. Delete failed key from proxy_key_bindings
// 2. Delete failed key from troll_keys
// 3. Insert backup key into troll_keys
// 4. Create new binding in proxy_key_bindings
func (p *KeyPool) RotateKey(failedKeyID string, reason string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Printf("🔄 [KeyRotation] Starting rotation for failed key: %s (reason: %s)", failedKeyID, reason)

	// 1. Check if key exists before fetching backup (idempotency check moved earlier)
	trollKeysCol := db.TrollKeysCollection()
	var existingKey struct {
		ID string `bson:"_id"`
	}
	err := trollKeysCol.FindOne(ctx, bson.M{"_id": failedKeyID}).Decode(&existingKey)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Printf("⚠️ [KeyRotation] Key %s already rotated by another process, skipping", failedKeyID)
			return "", nil
		}
		log.Printf("❌ [KeyRotation] Failed to check key existence: %v", err)
		return "", err
	}

	// 2. Atomically claim an available backup key
	backupKeysCol := db.GetCollection("backup_keys")
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
		log.Printf("❌ [KeyRotation] No backup keys available: %v", err)
		return "", err
	}

	newKeyMasked := backupKey.APIKey
	if len(newKeyMasked) > 12 {
		newKeyMasked = newKeyMasked[:8] + "..." + newKeyMasked[len(newKeyMasked)-4:]
	}
	log.Printf("✅ [KeyRotation] Atomically claimed backup key: %s (%s)", backupKey.ID, newKeyMasked)

	// 3. Get the proxy ID from bindings (to recreate binding later)
	bindingsCol := db.GetCollection("proxy_key_bindings")
	var oldBinding struct {
		ProxyID  string `bson:"proxyId"`
		Priority int    `bson:"priority"`
	}
	err = bindingsCol.FindOne(ctx, bson.M{"factoryKeyId": failedKeyID}).Decode(&oldBinding)
	if err != nil {
		log.Printf("⚠️ [KeyRotation] No binding found for key %s: %v", failedKeyID, err)
	}

	// 4. Delete failed key from proxy_key_bindings
	deleteResult, err := bindingsCol.DeleteMany(ctx, bson.M{"factoryKeyId": failedKeyID})
	if err != nil {
		log.Printf("⚠️ [KeyRotation] Failed to delete bindings: %v", err)
	} else {
		log.Printf("🗑️ [KeyRotation] Deleted %d bindings for key %s", deleteResult.DeletedCount, failedKeyID)
	}

	// 5. Delete failed key from troll_keys
	deleteResult, err = trollKeysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
	if err != nil {
		log.Printf("⚠️ [KeyRotation] Failed to delete troll key: %v", err)
	} else {
		log.Printf("🗑️ [KeyRotation] Deleted troll key: %s (count: %d)", failedKeyID, deleteResult.DeletedCount)
	}

	// 6. Insert backup key as new troll key (with reset stats)
	now := time.Now()
	newTrollKeyDoc := bson.M{
		"_id":           backupKey.ID,
		"apiKey":        backupKey.APIKey,
		"status":        StatusHealthy,
		"tokensUsed":    int64(0),
		"requestsCount": int64(0),
		"createdAt":     now,
	}
	_, err = trollKeysCol.InsertOne(ctx, newTrollKeyDoc)

	// Also create in-memory struct
	newTrollKey := TrollKey{
		ID:            backupKey.ID,
		APIKey:        backupKey.APIKey,
		Status:        StatusHealthy,
		TokensUsed:    0,
		RequestsCount: 0,
		CreatedAt:     now,
	}
	if err != nil {
		log.Printf("❌ [KeyRotation] Failed to insert new troll key: %v", err)
		return "", err
	}
	log.Printf("✅ [KeyRotation] Inserted new troll key: %s (%s)", backupKey.ID, newKeyMasked)

	// 7. Create new binding for the backup key (use same proxy as failed key)
	if oldBinding.ProxyID != "" {
		newBinding := bson.M{
			"proxyId":      oldBinding.ProxyID,
			"factoryKeyId": backupKey.ID,
			"priority":     oldBinding.Priority,
			"isActive":     true,
			"createdAt":    now,
		}
		_, err = bindingsCol.InsertOne(ctx, newBinding)
		if err != nil {
			log.Printf("⚠️ [KeyRotation] Failed to create new binding: %v", err)
		} else {
			log.Printf("✅ [KeyRotation] Created binding: proxy %s -> key %s", oldBinding.ProxyID, backupKey.ID)
		}
	}

	// 8. Mark backup key as used (already marked atomically in step 2, but update activated flag)
	_, err = backupKeysCol.UpdateByID(ctx, backupKey.ID, bson.M{
		"$set": bson.M{
			"activated": true,
		},
	})
	if err != nil {
		log.Printf("⚠️ [KeyRotation] Failed to mark backup key as activated: %v", err)
	}

	// 9. Update in-memory pool - remove old key, add new key
	p.mu.Lock()
	newKeys := make([]*TrollKey, 0)
	for _, key := range p.keys {
		if key.ID != failedKeyID {
			newKeys = append(newKeys, key)
		}
	}
	newKeys = append(newKeys, &newTrollKey)
	p.keys = newKeys
	p.mu.Unlock()

	// 10. Reload proxy pool to pick up new bindings
	if err := proxy.GetPool().Reload(); err != nil {
		log.Printf("⚠️ [KeyRotation] Failed to reload proxy pool: %v", err)
	} else {
		log.Printf("🔄 [KeyRotation] Proxy pool reloaded")
	}

	log.Printf("✅ [KeyRotation] Rotation complete: %s (dead) -> %s (active)", failedKeyID, backupKey.ID)
	log.Printf("📝 [KeyRotation] Admin can delete backup key %s from backup_keys (marked as activated)", backupKey.ID)

	return backupKey.ID, nil
}

// CheckAndRotateOnError checks if the error warrants key rotation and performs it
func (p *KeyPool) CheckAndRotateOnError(keyID string, statusCode int, errorBody string) {
	shouldRotate := false
	reason := ""
	bodyLower := strings.ToLower(errorBody)

	// Check for Factory AI specific billing/subscription messages (PRIORITY)
	if strings.Contains(bodyLower, "ready for more? reload your tokens") ||
		strings.Contains(bodyLower, "ready to get started? subscribe") ||
		strings.Contains(errorBody, "app.factory.ai/settings/billing") {
		shouldRotate = true
		reason = "factory_quota_exhausted"
		log.Printf("🚨 [KeyRotation] Factory AI quota exhausted for key %s", keyID)
	}

	// Check status codes
	if !shouldRotate {
		switch statusCode {
		case 429:
			// Rate limited - temporary, don't rotate
			p.MarkRateLimited(keyID)
			log.Printf("⚠️ [KeyRotation] Key %s rate limited, marked for cooldown", keyID)
			return
		case 401, 403:
			shouldRotate = true
			reason = "authentication_error"
		case 402:
			shouldRotate = true
			reason = "payment_required"
		}
	}

	// Check for invalid/revoked key
	if !shouldRotate && (strings.Contains(bodyLower, "invalid_api_key") || strings.Contains(bodyLower, "revoked")) {
		shouldRotate = true
		reason = "invalid_key"
	}

	if shouldRotate {
		log.Printf("🚫 [KeyRotation] Key %s needs rotation (reason: %s)", keyID, reason)

		// Check if backup keys available
		backupCount := GetBackupKeyCount()

		if backupCount > 0 {
			// Backup available - rotate to new key
			log.Printf("🔄 [KeyRotation] Found %d backup keys, rotating key %s", backupCount, keyID)
			newKeyID, err := p.RotateKey(keyID, reason)
			if err != nil {
				// Rotation failed - mark as exhausted
				log.Printf("❌ [KeyRotation] Rotation failed: %v", err)
				p.MarkExhausted(keyID)
				log.Printf("🚨 [KeyRotation] Key %s marked as exhausted (disabled)", keyID)
			} else if newKeyID != "" {
				log.Printf("✅ [KeyRotation] Key %s replaced with backup key %s", keyID, newKeyID)
			}
		} else {
			// No backup - mark as exhausted and keep disabled
			log.Printf("⚠️ [KeyRotation] No backup keys available")
			p.MarkExhausted(keyID)
			log.Printf("🚨 [KeyRotation] Key %s marked as exhausted (disabled) - add backup keys to restore service", keyID)
		}

		// Reload proxy pool to apply changes
		if err := proxy.GetPool().Reload(); err != nil {
			log.Printf("⚠️ [KeyRotation] Failed to reload proxy pool: %v", err)
		}
	}
}

// GetBackupKeyCount returns the number of available backup keys
func GetBackupKeyCount() int {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, err := db.GetCollection("backup_keys").CountDocuments(ctx, bson.M{"isUsed": false})
	if err != nil {
		return 0
	}
	return int(count)
}
