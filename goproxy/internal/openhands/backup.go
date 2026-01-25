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
// 1. Find available backup key
// 2. DELETE the old openhands_key document completely
// 3. INSERT backup key as new openhands_key
// 4. UPDATE bindings to point to new key ID
// 5. Mark backup key as used
// 6. Update in-memory pool
func (p *OpenHandsProvider) RotateKey(failedKeyID string, reason string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Printf("🔄 [OpenHands/Rotation] Starting rotation for failed key: %s (reason: %s)", failedKeyID, reason)

	// 1. Find an available backup key
	backupCol := OpenHandsBackupKeysCollection()
	var backupKey OpenHandsBackupKey
	err := backupCol.FindOne(ctx, bson.M{"isUsed": false}).Decode(&backupKey)
	if err != nil {
		log.Printf("❌ [OpenHands/Rotation] No backup keys available: %v", err)
		return "", err
	}

	newKeyMasked := backupKey.APIKey
	if len(newKeyMasked) > 12 {
		newKeyMasked = newKeyMasked[:8] + "..." + newKeyMasked[len(newKeyMasked)-4:]
	}
	log.Printf("✅ [OpenHands/Rotation] Found backup key: %s (%s)", backupKey.ID, newKeyMasked)

	// 2. DELETE old key completely
	keysCol := db.OpenHandsKeysCollection()
	deleteResult, err := keysCol.DeleteOne(ctx, bson.M{"_id": failedKeyID})
	if err != nil {
		log.Printf("⚠️ [OpenHands/Rotation] Failed to delete old key: %v", err)
	} else {
		log.Printf("🗑️ [OpenHands/Rotation] Deleted old key: %s (count: %d)", failedKeyID, deleteResult.DeletedCount)
	}

	// Idempotency check: If DeletedCount == 0, key was already rotated by another process
	if deleteResult.DeletedCount == 0 {
		log.Printf("⚠️ [OpenHands/Rotation] Key %s already rotated by another process, skipping insert", failedKeyID)
		return "", nil
	}

	// 3. INSERT backup key as new openhands_key
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
		log.Printf("⚠️ [OpenHands/Rotation] Failed to update bindings: %v", err)
	} else if updateResult.ModifiedCount > 0 {
		log.Printf("✅ [OpenHands/Rotation] Updated %d bindings: %s -> %s", updateResult.ModifiedCount, failedKeyID, backupKey.ID)
	} else {
		log.Printf("ℹ️ [OpenHands/Rotation] No bindings to update for key %s", failedKeyID)
	}

	// 5. Mark backup key as used
	_, err = backupCol.UpdateByID(ctx, backupKey.ID, bson.M{
		"$set": bson.M{
			"isUsed":    true,
			"activated": true,
			"usedFor":   failedKeyID,
			"usedAt":    now,
		},
	})
	if err != nil {
		log.Printf("⚠️ [OpenHands/Rotation] Failed to mark backup as used: %v", err)
	} else {
		log.Printf("✅ [OpenHands/Rotation] Marked backup %s as used (replaced: %s)", backupKey.ID, failedKeyID)
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
	p.keys = newKeys
	p.mu.Unlock()

	log.Printf("✅ [OpenHands/Rotation] Complete: %s (deleted) -> %s (new)", failedKeyID, backupKey.ID)
	return backupKey.ID, nil
}
