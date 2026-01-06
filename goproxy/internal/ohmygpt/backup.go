package ohmygpt

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"goproxy/db"
)

// OhMyGPTBackupKey represents a backup key for OhMyGPT
type OhMyGPTBackupKey struct {
	ID            string     `bson:"_id" json:"id"`
	APIKey        string     `bson:"apiKey" json:"api_key"`
	IsUsed        bool       `bson:"isUsed" json:"is_used"`
	Activated     bool       `bson:"activated" json:"activated"`
	UsedFor       string     `bson:"usedFor,omitempty" json:"used_for,omitempty"`
	UsedAt        *time.Time `bson:"usedAt,omitempty" json:"used_at,omitempty"`
	CreatedAt     time.Time  `bson:"createdAt" json:"created_at"`
	EnableFailover bool       `bson:"enableFailover" json:"enable_failover"`
}

// BackupKeyStats contains stats about backup keys
type BackupKeyStats struct {
	Total     int
	Available int
	Used      int
}

// OhMyGPTBackupKeysCollection returns the MongoDB collection for OhMyGPT backup keys
func OhMyGPTBackupKeysCollection() *mongo.Collection {
	return db.GetCollection("ohmygpt_backup_keys")
}

// GetBackupKeyCount returns the number of available backup keys
func GetOhMyGPTBackupKeyCount() int {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, err := OhMyGPTBackupKeysCollection().CountDocuments(ctx, bson.M{"isUsed": false})
	if err != nil {
		return 0
	}
	return int(count)
}

// ListOhMyGPTBackupKeys returns all backup keys with stats
func ListOhMyGPTBackupKeys() ([]OhMyGPTBackupKey, BackupKeyStats) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	col := OhMyGPTBackupKeysCollection()

	// Get all keys
	cursor, err := col.Find(ctx, bson.M{}, options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		log.Printf("Error listing OhMyGPT backup keys: %v", err)
		return []OhMyGPTBackupKey{}, BackupKeyStats{}
	}
	defer cursor.Close(ctx)

	var keys []OhMyGPTBackupKey
	if err := cursor.All(ctx, &keys); err != nil {
		log.Printf("Error decoding OhMyGPT backup keys: %v", err)
		return []OhMyGPTBackupKey{}, BackupKeyStats{}
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

	return keys, BackupKeyStats{
		Total:     len(keys),
		Available: available,
		Used:      used,
	}
}

// AddOhMyGPTBackupKey adds a new backup key
func AddOhMyGPTBackupKey(id, apiKey string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	key := OhMyGPTBackupKey{
		ID:        id,
		APIKey:    apiKey,
		IsUsed:    false,
		Activated: false,
		CreatedAt: time.Now(),
	}

	_, err := OhMyGPTBackupKeysCollection().InsertOne(ctx, key)
	return err
}

// DeleteOhMyGPTBackupKey deletes a backup key
func DeleteOhMyGPTBackupKey(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := OhMyGPTBackupKeysCollection().DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// RestoreOhMyGPTBackupKey marks a backup key as available again
func RestoreOhMyGPTBackupKey(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := OhMyGPTBackupKeysCollection().UpdateByID(ctx, id, bson.M{
		"$set": bson.M{
			"isUsed":    false,
			"activated": false,
			"usedFor":   "",
			"usedAt":    nil,
		},
	})
	return err
}

// CleanupUsedBackupKeys deletes backup keys that have been used for more than 12 hours
func CleanupUsedOhMyGPTBackupKeys() (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Calculate cutoff time (12 hours ago)
	cutoffTime := time.Now().Add(-12 * time.Hour)

	// Delete keys where isUsed=true AND usedAt < cutoffTime
	result, err := OhMyGPTBackupKeysCollection().DeleteMany(ctx, bson.M{
		"isUsed": true,
		"usedAt": bson.M{"$lt": cutoffTime},
	})
	if err != nil {
		return 0, err
	}

	return result.DeletedCount, nil
}

// StartBackupKeyCleanupJob starts a goroutine that periodically cleans up used backup keys
func StartOhMyGPTBackupKeyCleanupJob(interval time.Duration) {
	go func() {
		log.Printf("🧹 [OhMyGPT/Cleanup] Started backup key cleanup job (interval: %v)", interval)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		// Run immediately on startup
		if deleted, err := CleanupUsedOhMyGPTBackupKeys(); err != nil {
			log.Printf("⚠️ [OhMyGPT/Cleanup] Initial cleanup failed: %v", err)
		} else if deleted > 0 {
			log.Printf("🗑️ [OhMyGPT/Cleanup] Initial cleanup: deleted %d expired backup keys", deleted)
		}

		for range ticker.C {
			if deleted, err := CleanupUsedOhMyGPTBackupKeys(); err != nil {
				log.Printf("⚠️ [OhMyGPT/Cleanup] Cleanup failed: %v", err)
			} else if deleted > 0 {
				log.Printf("🗑️ [OhMyGPT/Cleanup] Deleted %d expired backup keys (used > 12h)", deleted)
			}
		}
	}()
}
