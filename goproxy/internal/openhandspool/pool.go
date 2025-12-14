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

	cursor, err := db.OpenHandsKeysCollection().Find(ctx, bson.M{"_id": bson.M{"$in": keyIDs}})
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

	log.Printf("✅ Loaded %d openhands keys (from %d bindings)", len(p.keys), len(boundKeyIDs))
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

	log.Printf("✅ Loaded %d openhands keys (all keys, no bindings)", len(p.keys))
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
}

func (p *KeyPool) updateKeyStatus(keyID string, status OpenHandsKeyStatus, cooldownUntil *time.Time, lastError string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

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

func (p *KeyPool) MarkError(keyID string, err string) {
	p.MarkStatus(keyID, StatusError, 30*time.Second, err)
}

func (p *KeyPool) GetStats() map[string]int {
	p.mu.Lock()
	defer p.mu.Unlock()

	stats := map[string]int{
		"total":        len(p.keys),
		"healthy":      0,
		"rate_limited": 0,
		"exhausted":    0,
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

		log.Printf("🔄 OpenHands key pool auto-reload started (interval: %v)", interval)

		for range ticker.C {
			if err := p.LoadKeys(); err != nil {
				log.Printf("⚠️ OpenHands key pool auto-reload failed: %v", err)
			} else {
				log.Printf("🔄 Auto-reloaded openhands keys (%d keys)", p.GetKeyCount())
			}
		}
	}()
}
