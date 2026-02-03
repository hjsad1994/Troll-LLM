package openhands

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"goproxy/db"
)

// OpenHandsBackupKey represents a backup key for OpenHands
type OpenHandsBackupKey struct {
	ID        string     `bson:"_id" json:"id"`
	APIKey    string     `bson:"apiKey" json:"api_key"`
	IsUsed    bool       `bson:"isUsed" json:"is_used"`
	Activated bool       `bson:"activated" json:"activated"`
	UsedFor   string     `bson:"usedFor,omitempty" json:"used_for,omitempty"`
	UsedAt    *time.Time `bson:"usedAt,omitempty" json:"used_at,omitempty"`
	CreatedAt time.Time  `bson:"createdAt" json:"created_at"`
}

// BackupKeyStats contains stats about backup keys
type BackupKeyStats struct {
	Total     int
	Available int
	Used      int
}

// OpenHandsBackupKeysCollection returns the MongoDB collection for OpenHands backup keys
func OpenHandsBackupKeysCollection() *mongo.Collection {
	return db.GetCollection("openhands_backup_keys")
}

// GetBackupKeyCount returns the number of available backup keys
func GetOpenHandsBackupKeyCount() int {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, err := OpenHandsBackupKeysCollection().CountDocuments(ctx, bson.M{"isUsed": false})
	if err != nil {
		return 0
	}
	return int(count)
}

// listBackupKeysInternal returns all backup keys with stats (internal)
func listBackupKeysInternal() ([]OpenHandsBackupKey, int, int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	col := OpenHandsBackupKeysCollection()

	// Get all keys
	cursor, err := col.Find(ctx, bson.M{}, options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, 0, 0, err
	}
	defer cursor.Close(ctx)

	var keys []OpenHandsBackupKey
	if err := cursor.All(ctx, &keys); err != nil {
		return nil, 0, 0, err
	}

	// Count stats
	available := 0
	used := 0
	for _, k := range keys {
		if k.IsUsed {
			used++
		} else {
			available++
		}
	}

	return keys, available, used, nil
}

// ListOpenHandsBackupKeys returns all backup keys with stats (for API endpoint)
func ListOpenHandsBackupKeys() ([]OpenHandsBackupKey, BackupKeyStats) {
	keys, available, used, err := listBackupKeysInternal()
	if err != nil {
		log.Printf("Error listing OpenHands backup keys: %v", err)
		return []OpenHandsBackupKey{}, BackupKeyStats{}
	}
	return keys, BackupKeyStats{
		Total:     len(keys),
		Available: available,
		Used:      used,
	}
}

// AddBackupKey adds a new backup key
func AddOpenHandsBackupKey(id, apiKey string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	key := OpenHandsBackupKey{
		ID:        id,
		APIKey:    apiKey,
		IsUsed:    false,
		Activated: false,
		CreatedAt: time.Now(),
	}

	_, err := OpenHandsBackupKeysCollection().InsertOne(ctx, key)
	return err
}

// DeleteBackupKey deletes a backup key
func DeleteOpenHandsBackupKey(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := OpenHandsBackupKeysCollection().DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// RestoreBackupKey marks a backup key as available again
func RestoreOpenHandsBackupKey(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := OpenHandsBackupKeysCollection().UpdateByID(ctx, id, bson.M{
		"$set": bson.M{
			"isUsed":    false,
			"activated": false,
			"usedFor":   "",
			"usedAt":    nil,
		},
	})
	return err
}

// CleanupUsedBackupKeys deletes backup keys that have been used for more than 6 hours
// This runs periodically to keep the database clean
func CleanupUsedBackupKeys() (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Calculate cutoff time (6 hours ago)
	cutoffTime := time.Now().Add(-6 * time.Hour)
	log.Printf("🧹 [OpenHands/Cleanup] Cutoff time: %v (deleting keys used before this time)", cutoffTime)

	// Delete keys where isUsed=true AND usedAt exists AND usedAt < cutoffTime
	result, err := OpenHandsBackupKeysCollection().DeleteMany(ctx, bson.M{
		"isUsed": true,
		"usedAt": bson.M{
			"$exists": true,
			"$lt":     cutoffTime,
		},
	})
	if err != nil {
		log.Printf("⚠️ [OpenHands/Cleanup] DeleteMany error: %v", err)
		return 0, err
	}

	if result.DeletedCount > 0 {
		log.Printf("🗑️ [OpenHands/Cleanup] Deleted %d expired backup keys", result.DeletedCount)
	}

	return result.DeletedCount, nil
}

// StartBackupKeyCleanupJob starts a goroutine that periodically cleans up used backup keys
func StartBackupKeyCleanupJob(interval time.Duration) {
	go func() {
		log.Printf("🧹 [OpenHands/Cleanup] Started backup key cleanup job (interval: %v)", interval)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		// Run immediately on startup
		if deleted, err := CleanupUsedBackupKeys(); err != nil {
			log.Printf("⚠️ [OpenHands/Cleanup] Initial cleanup failed: %v", err)
		} else if deleted > 0 {
			log.Printf("🗑️ [OpenHands/Cleanup] Initial cleanup: deleted %d expired backup keys", deleted)
		}

		for range ticker.C {
			if deleted, err := CleanupUsedBackupKeys(); err != nil {
				log.Printf("⚠️ [OpenHands/Cleanup] Cleanup failed: %v", err)
			} else if deleted > 0 {
				log.Printf("🗑️ [OpenHands/Cleanup] Deleted %d expired backup keys (used > 6h)", deleted)
			}
		}
	}()
}

// RotateOpenHandsKey replaces a failed key with a backup key:
// 1. Check if key exists and not already exhausted (early idempotency check)
// 2. Get bindings BEFORE marking exhausted (to recreate for new key)
// 3. Mark old key as EXHAUSTED (auto-deletes bindings via DB update)
// 4. Atomically claim backup key
// 5. INSERT backup key as new openhands_key
// 6. Recreate bindings for new key
// 7. Update in-memory pool
// 8. Keep old key in DB with exhausted status for admin review
func (p *OpenHandsProvider) RotateKey(failedKeyID string, reason string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Printf("🔄 [OpenHands/Rotation] Starting rotation for failed key: %s (reason: %s)", failedKeyID, reason)

	// 1. Check if key exists and get current status
	keysCol := db.OpenHandsKeysCollection()
	var existingKey struct {
		ID     string             `bson:"_id"`
		Status OpenHandsKeyStatus `bson:"status"`
	}
	err := keysCol.FindOne(ctx, bson.M{"_id": failedKeyID}).Decode(&existingKey)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Printf("⚠️ [OpenHands/Rotation] Key %s already rotated by another process, skipping", failedKeyID)
			return "", nil
		}
		log.Printf("❌ [OpenHands/Rotation] Failed to check key existence: %v", err)
		return "", err
	}

	// If key is already exhausted, skip rotation (idempotent)
	if existingKey.Status == OpenHandsStatusExhausted {
		log.Printf("⚠️ [OpenHands/Rotation] Key %s already marked as exhausted, skipping rotation", failedKeyID)
		return "", nil
	}

	// 2. Get bindings BEFORE marking exhausted (so we can recreate them for new key)
	bindingsCol := db.GetCollection("openhands_bindings")
	cursor, err := bindingsCol.Find(ctx, bson.M{"openhandsKeyId": failedKeyID})
	if err != nil {
		log.Printf("⚠️ [OpenHands/Rotation] Failed to fetch bindings for key %s: %v", failedKeyID, err)
	}

	type BindingInfo struct {
		ProxyID  string `bson:"proxyId"`
		Priority int    `bson:"priority"`
	}
	var oldBindings []BindingInfo
	if cursor != nil {
		defer cursor.Close(ctx)
		if err := cursor.All(ctx, &oldBindings); err != nil {
			log.Printf("⚠️ [OpenHands/Rotation] Failed to decode bindings: %v", err)
			oldBindings = []BindingInfo{} // Continue without bindings
		}
	}
	log.Printf("📋 [OpenHands/Rotation] Found %d bindings for key %s", len(oldBindings), failedKeyID)

	// 3. Mark key as EXHAUSTED and delete bindings
	_, err = keysCol.UpdateByID(ctx, failedKeyID, bson.M{
		"$set": bson.M{
			"status":    OpenHandsStatusExhausted,
			"lastError": reason,
			"updatedAt": time.Now(),
		},
	})
	if err != nil {
		log.Printf("⚠️ [OpenHands/Rotation] Failed to mark key exhausted: %v", err)
	} else {
		log.Printf("🚫 [OpenHands/Rotation] Marked key %s as exhausted", failedKeyID)
	}

	// Delete bindings (key should stop receiving traffic)
	deleteBindingsResult, err := bindingsCol.DeleteMany(ctx, bson.M{"openhandsKeyId": failedKeyID})
	if err != nil {
		log.Printf("⚠️ [OpenHands/Rotation] Failed to delete bindings: %v", err)
	} else if deleteBindingsResult.DeletedCount > 0 {
		log.Printf("🗑️ [OpenHands/Rotation] Deleted %d bindings for key %s", deleteBindingsResult.DeletedCount, failedKeyID)
	}

	// 4. Atomically claim an available backup key
	backupCol := OpenHandsBackupKeysCollection()
	var backupKey OpenHandsBackupKey
	findResult := backupCol.FindOneAndUpdate(
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
	if err = findResult.Decode(&backupKey); err != nil {
		log.Printf("❌ [OpenHands/Rotation] No backup keys available: %v", err)
		return "", err
	}

	newKeyMasked := backupKey.APIKey
	if len(newKeyMasked) > 12 {
		newKeyMasked = newKeyMasked[:8] + "..." + newKeyMasked[len(newKeyMasked)-4:]
	}
	log.Printf("✅ [OpenHands/Rotation] Atomically claimed backup key: %s (%s)", backupKey.ID, newKeyMasked)

	// 5. INSERT backup key as new openhands_key (DO NOT delete old key - keep for review)
	now := time.Now()
	newKeyDoc := bson.M{
		"_id":           backupKey.ID,
		"apiKey":        backupKey.APIKey,
		"status":        OpenHandsStatusHealthy,
		"tokensUsed":    int64(0),
		"requestsCount": int64(0),
		"createdAt":     now,
		"replacedKey":   failedKeyID,
	}
	_, err = keysCol.InsertOne(ctx, newKeyDoc)
	if err != nil {
		log.Printf("❌ [OpenHands/Rotation] Failed to insert new key: %v", err)
		return "", err
	}
	log.Printf("✅ [OpenHands/Rotation] Inserted new key: %s (%s)", backupKey.ID, newKeyMasked)

	// 6. Recreate bindings for new key
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
				log.Printf("⚠️ [OpenHands/Rotation] Failed to create binding for proxy %s: %v", binding.ProxyID, err)
			}
		}
		log.Printf("✅ [OpenHands/Rotation] Recreated %d bindings for new key %s", len(oldBindings), backupKey.ID)
	} else {
		log.Printf("ℹ️ [OpenHands/Rotation] No bindings to recreate for key %s", backupKey.ID)
	}

	// 7. Update in-memory pool - mark old key exhausted in memory, add new key
	p.mu.Lock()
	// Update old key status in memory (if still present)
	for _, key := range p.keys {
		if key.ID == failedKeyID {
			key.Status = OpenHandsStatusExhausted
			break
		}
	}
	// Add new key to pool
	p.keys = append(p.keys, &OpenHandsKey{
		ID:             backupKey.ID,
		APIKey:         backupKey.APIKey,
		Status:         OpenHandsStatusHealthy,
		TokensUsed:     0,
		RequestsCount:  0,
		CreatedAt:      now,
		LastUsedAt:     nil,
		TotalSpend:     0,
		LastSpendCheck: nil,
	})
	p.mu.Unlock()

	log.Printf("✅ [OpenHands/Rotation] Complete: %s (kept as exhausted) -> %s (new healthy key)", failedKeyID, backupKey.ID)
	return backupKey.ID, nil
}
