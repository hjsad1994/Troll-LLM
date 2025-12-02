package keypool

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

// BackupKey represents a backup factory key stored in MongoDB
type BackupKey struct {
	ID        string    `bson:"_id" json:"id"`
	APIKey    string    `bson:"apiKey" json:"api_key"`
	IsUsed    bool      `bson:"isUsed" json:"is_used"`
	CreatedAt time.Time `bson:"createdAt" json:"created_at"`
	UsedAt    *time.Time `bson:"usedAt,omitempty" json:"used_at,omitempty"`
	UsedFor   string    `bson:"usedFor,omitempty" json:"used_for,omitempty"` // Which key it replaced
}

// RotateKey swaps a failed key's API key with a backup key
// Keeps all bindings intact - just updates the API key value
func (p *KeyPool) RotateKey(failedKeyID string, reason string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Printf("🔄 [KeyRotation] Starting rotation for failed key: %s (reason: %s)", failedKeyID, reason)

	// 1. Find an available backup key
	backupKeysCol := db.GetCollection("backup_keys")
	var backupKey BackupKey
	err := backupKeysCol.FindOne(ctx, bson.M{"isUsed": false}).Decode(&backupKey)
	if err != nil {
		log.Printf("❌ [KeyRotation] No backup keys available: %v", err)
		return "", err
	}

	// 2. Get the failed key
	failedKey := p.GetKeyByID(failedKeyID)
	if failedKey == nil {
		log.Printf("❌ [KeyRotation] Failed key not found in pool: %s", failedKeyID)
		return "", nil
	}

	// 3. Store old API key info for logging
	oldKeyMasked := failedKey.APIKey
	if len(oldKeyMasked) > 12 {
		oldKeyMasked = oldKeyMasked[:8] + "..." + oldKeyMasked[len(oldKeyMasked)-4:]
	}
	newKeyMasked := backupKey.APIKey
	if len(newKeyMasked) > 12 {
		newKeyMasked = newKeyMasked[:8] + "..." + newKeyMasked[len(newKeyMasked)-4:]
	}

	// 4. Update factory key with new API key (keep same ID, keep all bindings)
	now := time.Now()
	trollKeysCol := db.TrollKeysCollection()
	_, err = trollKeysCol.UpdateByID(ctx, failedKeyID, bson.M{
		"$set": bson.M{
			"apiKey":    backupKey.APIKey,
			"status":    StatusHealthy,
			"lastError": "",
			"rotatedAt": now,
			"rotatedFrom": oldKeyMasked,
		},
	})
	if err != nil {
		log.Printf("❌ [KeyRotation] Failed to update factory key: %v", err)
		return "", err
	}

	// 5. Mark backup key as used
	_, err = backupKeysCol.UpdateByID(ctx, backupKey.ID, bson.M{
		"$set": bson.M{
			"isUsed":  true,
			"usedAt":  now,
			"usedFor": failedKeyID,
		},
	})
	if err != nil {
		log.Printf("⚠️ [KeyRotation] Failed to mark backup key as used: %v", err)
	}

	// 6. Update in-memory pool
	p.mu.Lock()
	for _, key := range p.keys {
		if key.ID == failedKeyID {
			key.APIKey = backupKey.APIKey
			key.Status = StatusHealthy
			key.LastError = ""
			break
		}
	}
	p.mu.Unlock()

	log.Printf("✅ [KeyRotation] Swapped API key for %s: %s -> %s", failedKeyID, oldKeyMasked, newKeyMasked)
	log.Printf("✅ [KeyRotation] All bindings preserved - no changes needed")
	
	return failedKeyID, nil
}

// CheckAndRotateOnError checks if the error warrants key rotation and performs it
func (p *KeyPool) CheckAndRotateOnError(keyID string, statusCode int, errorBody string) {
	shouldRotate := false
	reason := ""

	switch statusCode {
	case 429:
		// Rate limited - might be temporary, don't rotate immediately
		p.MarkRateLimited(keyID)
		log.Printf("⚠️ [KeyRotation] Key %s rate limited, marked for cooldown", keyID)
		return
	case 401, 403:
		// Authentication error - key might be invalid/revoked
		shouldRotate = true
		reason = "authentication_error"
	case 402:
		// Payment required - quota exhausted
		shouldRotate = true
		reason = "quota_exhausted"
	}

	// Check for Factory AI specific subscription/billing messages
	if contains(errorBody, "Ready to get started? Subscribe at") ||
		contains(errorBody, "Ready for more? Reload your tokens at") ||
		contains(errorBody, "app.factory.ai/settings/billing") {
		shouldRotate = true
		reason = "factory_subscription_expired"
		log.Printf("🔔 [KeyRotation] Factory AI subscription/token issue detected for key %s", keyID)
	}

	// Check error body for other specific messages
	if contains(errorBody, "quota") || contains(errorBody, "exceeded") || contains(errorBody, "limit") {
		if contains(errorBody, "credit") || contains(errorBody, "billing") || contains(errorBody, "payment") {
			shouldRotate = true
			reason = "billing_error"
		}
	}

	if contains(errorBody, "invalid_api_key") || contains(errorBody, "revoked") {
		shouldRotate = true
		reason = "invalid_key"
	}

	if shouldRotate {
		log.Printf("🔄 [KeyRotation] Detected rotation trigger for key %s: %s", keyID, reason)
		go func() {
			newKeyID, err := p.RotateKey(keyID, reason)
			if err != nil {
				log.Printf("❌ [KeyRotation] Rotation failed: %v", err)
				log.Printf("🚨 [ALERT] No backup keys available! Manual intervention required.")
			} else if newKeyID != "" {
				log.Printf("✅ [KeyRotation] Key rotated successfully: %s", keyID)
			}
		}()
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

func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && 
		(len(s) >= len(substr)) && 
		(s == substr || len(s) > len(substr) && 
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || 
		containsMiddle(s, substr)))
}

func containsMiddle(s, substr string) bool {
	for i := 1; i < len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
