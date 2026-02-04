package openhandspool

import (
	"context"
	"errors"
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

var (
	ErrNoHealthyKeys = errors.New("no healthy openhands keys available")
)

type KeyPool struct {
	mu      sync.Mutex
	keys    []*OpenHandsKey
	current int
}

var (
	pool     *KeyPool
	poolOnce sync.Once
)

func GetPool() *KeyPool {
	poolOnce.Do(func() {
		pool = &KeyPool{
			keys:    make([]*OpenHandsKey, 0),
			current: 0,
		}
		pool.LoadKeys()
	})
	return pool
}

func (p *KeyPool) LoadKeys() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// First, get all active key IDs from bindings
	bindingsCol := db.GetCollection("openhands_bindings")
	bindingsCursor, err := bindingsCol.Find(ctx, bson.M{"isActive": true})
	if err != nil {
		return err
	}
	defer bindingsCursor.Close(ctx)

	// Collect unique key IDs from bindings
	boundKeyIDs := make(map[string]bool)
	for bindingsCursor.Next(ctx) {
		var binding struct {
			OpenHandsKeyID string `bson:"openhandsKeyId"`
		}
		if err := bindingsCursor.Decode(&binding); err != nil {
			continue
		}
		if binding.OpenHandsKeyID != "" {
			boundKeyIDs[binding.OpenHandsKeyID] = true
		}
	}

	// If no bindings found, fall back to loading all keys
	if len(boundKeyIDs) == 0 {
		log.Printf("⚠️ No active bindings found, loading all openhands keys")
		return p.loadAllKeys(ctx)
	}

	// Load only keys that have bindings
	keyIDs := make([]string, 0, len(boundKeyIDs))
	for keyID := range boundKeyIDs {
		keyIDs = append(keyIDs, keyID)
	}

	// Load keys but exclude bad statuses (need_refresh, exhausted, error)
	// These keys should not be used until manually fixed
	cursor, err := db.OpenHandsKeysCollection().Find(ctx, bson.M{
		"_id":    bson.M{"$in": keyIDs},
		"status": bson.M{"$nin": []string{"need_refresh", "exhausted", "error"}},
	})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	p.mu.Lock()
	defer p.mu.Unlock()

	p.keys = make([]*OpenHandsKey, 0)
	loadedCount := 0
	skippedCount := 0
	for cursor.Next(ctx) {
		var key OpenHandsKey
		if err := cursor.Decode(&key); err != nil {
			log.Printf("⚠️ Failed to decode openhands key: %v", err)
			continue
		}
		p.keys = append(p.keys, &key)
		loadedCount++
	}

	// Log if any keys were skipped due to bad status
	skippedCount = len(keyIDs) - loadedCount
	if skippedCount > 0 {
		log.Printf("⚠️ OpenHands key pool: skipped %d keys with bad status (need_refresh/exhausted/error)", skippedCount)
	}
	log.Printf("✅ OpenHands key pool loaded: %d healthy keys", len(p.keys))
	return nil
}

// loadAllKeys loads all keys without checking bindings (fallback)
func (p *KeyPool) loadAllKeys(ctx context.Context) error {
	cursor, err := db.OpenHandsKeysCollection().Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	p.mu.Lock()
	defer p.mu.Unlock()

	p.keys = make([]*OpenHandsKey, 0)
	for cursor.Next(ctx) {
		var key OpenHandsKey
		if err := cursor.Decode(&key); err != nil {
			log.Printf("⚠️ Failed to decode openhands key: %v", err)
			continue
		}
		p.keys = append(p.keys, &key)
	}

	log.Printf("✅ OpenHands key pool loaded: %d keys", len(p.keys))
	return nil
}

func (p *KeyPool) SelectKey() (*OpenHandsKey, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.keys) == 0 {
		return nil, ErrNoHealthyKeys
	}

	// Round-robin through available keys
	startIdx := p.current
	for i := 0; i < len(p.keys); i++ {
		idx := (startIdx + i) % len(p.keys)
		key := p.keys[idx]

		if key.IsAvailable() {
			p.current = (idx + 1) % len(p.keys)
			return key, nil
		}
	}

	return nil, ErrNoHealthyKeys
}

func (p *KeyPool) MarkStatus(keyID string, status OpenHandsKeyStatus, cooldown time.Duration, lastError string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, key := range p.keys {
		if key.ID == keyID {
			key.Status = status
			key.LastError = lastError
			if cooldown > 0 {
				until := time.Now().Add(cooldown)
				key.CooldownUntil = &until
			} else {
				key.CooldownUntil = nil
			}

			// Update in database
			go p.updateKeyStatus(keyID, status, key.CooldownUntil, lastError)
			break
		}
	}

	// If status is terminal (need_refresh, exhausted, error), remove from pool immediately
	// This ensures the key is not used even before next reload
	if status == StatusNeedRefresh || status == StatusExhausted || status == StatusError {
		newKeys := make([]*OpenHandsKey, 0)
		for _, key := range p.keys {
			if key.ID != keyID {
				newKeys = append(newKeys, key)
			}
		}
		removedCount := len(p.keys) - len(newKeys)
		p.keys = newKeys
		if removedCount > 0 {
			log.Printf("🚫 Removed key %s from pool (status: %s, pool size: %d)", keyID, status, len(p.keys))
		}
	}
}

func (p *KeyPool) updateKeyStatus(keyID string, status OpenHandsKeyStatus, cooldownUntil *time.Time, lastError string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Update key status in database
	update := bson.M{
		"$set": bson.M{
			"status":        status,
			"lastError":     lastError,
			"cooldownUntil": cooldownUntil,
		},
	}

	_, err := db.OpenHandsKeysCollection().UpdateByID(ctx, keyID, update)
	if err != nil {
		log.Printf("⚠️ Failed to update openhands key status: %v", err)
	}

	// If status is terminal (need_refresh, exhausted, error) - DELETE bindings ONLY
	// Keep the key document for admin to manually check and delete
	// This prevents user requests from using this key (bindings removed from pool)
	if status == StatusNeedRefresh || status == StatusExhausted || status == StatusError {
		bindingsCol := db.GetCollection("openhands_bindings")
		deleteBindingsResult, err := bindingsCol.DeleteMany(ctx, bson.M{"openhandsKeyId": keyID})
		if err != nil {
			log.Printf("⚠️ Failed to delete bindings for key %s: %v", keyID, err)
		} else if deleteBindingsResult.DeletedCount > 0 {
			log.Printf("🗑️ Deleted %d bindings for key %s (status: %s). Key document kept for manual review.", deleteBindingsResult.DeletedCount, keyID, status)
		}
	}
}

func (p *KeyPool) MarkHealthy(keyID string) {
	p.MarkStatus(keyID, StatusHealthy, 0, "")
}

func (p *KeyPool) MarkRateLimited(keyID string) {
	p.MarkStatus(keyID, StatusRateLimited, 60*time.Second, "Rate limited by upstream")
}

func (p *KeyPool) MarkExhausted(keyID string) {
	p.MarkStatus(keyID, StatusExhausted, 24*time.Hour, "Token quota exhausted")
}

func (p *KeyPool) MarkNeedRefresh(keyID string, lastError string) {
	p.MarkStatus(keyID, StatusNeedRefresh, 0, lastError)
}

func (p *KeyPool) MarkError(keyID string, err string) {
	p.MarkStatus(keyID, StatusError, 30*time.Second, err)
}

// RemoveKey removes a key from the in-memory pool without touching the database.
// Use this when the key has already been deleted from DB by another process (e.g., SpendChecker).
// This ensures the key is not used even before the next auto-reload.
func (p *KeyPool) RemoveKey(keyID string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	newKeys := make([]*OpenHandsKey, 0, len(p.keys))
	for _, key := range p.keys {
		if key.ID != keyID {
			newKeys = append(newKeys, key)
		}
	}

	if len(newKeys) < len(p.keys) {
		p.keys = newKeys
		log.Printf("🗑️ [OpenHandsPool] Removed key %s from memory pool (pool size: %d)", keyID, len(p.keys))
	}
}

// ReplaceKey replaces an exhausted key with a new backup key in the pool.
// It loads the new key from DB and swaps it in place of the old key.
// Use this after RotateKey() succeeds to immediately update the pool.
func (p *KeyPool) ReplaceKey(oldKeyID string, newKeyID string) error {
	if newKeyID == "" {
		// No new key to replace with, just remove the old one
		p.RemoveKey(oldKeyID)
		return nil
	}

	// Load new key from database
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var newKey OpenHandsKey
	err := db.OpenHandsKeysCollection().FindOne(ctx, bson.M{"_id": newKeyID}).Decode(&newKey)
	if err != nil {
		log.Printf("⚠️ [OpenHandsPool] Failed to load new key %s from DB: %v", newKeyID, err)
		// Still remove old key even if we can't load new one
		p.RemoveKey(oldKeyID)
		return err
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	// Find and replace the old key
	replaced := false
	for i, key := range p.keys {
		if key.ID == oldKeyID {
			p.keys[i] = &newKey
			replaced = true
			log.Printf("🔄 [OpenHandsPool] Replaced key %s with %s in memory pool", oldKeyID, newKeyID)
			break
		}
	}

	// If old key wasn't in pool, just add the new one
	if !replaced {
		p.keys = append(p.keys, &newKey)
		log.Printf("➕ [OpenHandsPool] Added new key %s to memory pool (old key %s not found)", newKeyID, oldKeyID)
	}

	return nil
}

func (p *KeyPool) GetStats() map[string]int {
	p.mu.Lock()
	defer p.mu.Unlock()

	stats := map[string]int{
		"total":        len(p.keys),
		"healthy":      0,
		"rate_limited": 0,
		"exhausted":    0,
		"need_refresh": 0,
		"error":        0,
	}

	for _, key := range p.keys {
		switch key.Status {
		case StatusHealthy:
			stats["healthy"]++
		case StatusRateLimited:
			stats["rate_limited"]++
		case StatusExhausted:
			stats["exhausted"]++
		case StatusNeedRefresh:
			stats["need_refresh"]++
		case StatusError:
			stats["error"]++
		}
	}

	return stats
}

// GetAllKeysStatus returns all keys with their status (for debugging)
func (p *KeyPool) GetAllKeysStatus() []map[string]interface{} {
	p.mu.Lock()
	defer p.mu.Unlock()

	result := make([]map[string]interface{}, 0, len(p.keys))
	for _, key := range p.keys {
		keyInfo := map[string]interface{}{
			"id":        key.ID,
			"status":    key.Status,
			"available": key.IsAvailable(),
		}
		if key.LastError != "" {
			keyInfo["last_error"] = key.LastError
		}
		if key.CooldownUntil != nil {
			keyInfo["cooldown_until"] = key.CooldownUntil.Format(time.RFC3339)
		}
		result = append(result, keyInfo)
	}
	return result
}

func (p *KeyPool) GetKeyCount() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.keys)
}

func (p *KeyPool) GetKeyByID(keyID string) *OpenHandsKey {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, key := range p.keys {
		if key.ID == keyID {
			return key
		}
	}
	return nil
}

func (p *KeyPool) GetAPIKey(keyID string) string {
	key := p.GetKeyByID(keyID)
	if key != nil {
		return key.APIKey
	}
	return ""
}

// Reload refreshes the key pool from database
func (p *KeyPool) Reload() error {
	return p.LoadKeys()
}

// StartAutoReload starts a background goroutine that periodically reloads keys from database
func (p *KeyPool) StartAutoReload(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		// Auto-reload started log disabled to reduce noise

		for range ticker.C {
			if err := p.LoadKeys(); err != nil {
				log.Printf("⚠️ OpenHands key pool auto-reload failed: %v", err)
			}
			// Auto-reload success log disabled to reduce noise
		}
	}()
}
