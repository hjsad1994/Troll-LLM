package keypool

import (
	"context"
	"log"
	"sync/atomic"
	"time"

	"github.com/puzpuzpuz/xsync/v4"
	"go.mongodb.org/mongo-driver/bson"
	"goproxy/db"
)

// OptimizedKeyPool uses xsync.Map and atomic operations for lock-free access
type OptimizedKeyPool struct {
	keys    *xsync.Map[string, *TrollKey] // keyId -> TrollKey
	keyList atomic.Pointer[[]*TrollKey]   // ordered list for round-robin
	current atomic.Int32                   // lock-free round-robin counter
}

var (
	optimizedKeyPool     *OptimizedKeyPool
	optimizedKeyPoolOnce atomic.Bool
)

// GetOptimizedKeyPool returns the singleton optimized key pool
func GetOptimizedKeyPool() *OptimizedKeyPool {
	if !optimizedKeyPoolOnce.Load() {
		if optimizedKeyPoolOnce.CompareAndSwap(false, true) {
			optimizedKeyPool = &OptimizedKeyPool{
				keys: xsync.NewMap[string, *TrollKey](),
			}
			optimizedKeyPool.LoadKeys()
		}
	}
	return optimizedKeyPool
}

// LoadKeys loads all troll keys from database
func (p *OptimizedKeyPool) LoadKeys() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := db.TrollKeysCollection().Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	newKeys := make([]*TrollKey, 0)
	for cursor.Next(ctx) {
		var key TrollKey
		if err := cursor.Decode(&key); err != nil {
			log.Printf("⚠️ Failed to decode troll key: %v", err)
			continue
		}
		p.keys.Store(key.ID, &key)
		newKeys = append(newKeys, &key)
	}

	// Update atomic key list
	p.keyList.Store(&newKeys)

	log.Printf("✅ [Optimized] Loaded %d troll keys", len(newKeys))
	return nil
}

// SelectKey returns the next available key using lock-free round-robin
func (p *OptimizedKeyPool) SelectKey() (*TrollKey, error) {
	keyList := p.keyList.Load()
	if keyList == nil || len(*keyList) == 0 {
		return nil, ErrNoHealthyKeys
	}

	keys := *keyList
	count := int32(len(keys))

	// Atomic increment - NO LOCK
	startIdx := p.current.Add(1) % count

	// Round-robin through available keys
	for i := int32(0); i < count; i++ {
		idx := (startIdx + i) % count
		key := keys[idx]
		if key.IsAvailable() {
			return key, nil
		}
	}

	return nil, ErrNoHealthyKeys
}

// MarkStatus updates the status of a key
func (p *OptimizedKeyPool) MarkStatus(keyID string, status TrollKeyStatus, cooldown time.Duration, lastError string) {
	if key, ok := p.keys.Load(keyID); ok {
		key.Status = status
		key.LastError = lastError
		if cooldown > 0 {
			until := time.Now().Add(cooldown)
			key.CooldownUntil = &until
		} else {
			key.CooldownUntil = nil
		}

		// Update in database (async)
		go p.updateKeyStatus(keyID, status, key.CooldownUntil, lastError)
	}
}

func (p *OptimizedKeyPool) updateKeyStatus(keyID string, status TrollKeyStatus, cooldownUntil *time.Time, lastError string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"status":        status,
			"lastError":     lastError,
			"cooldownUntil": cooldownUntil,
		},
	}

	_, err := db.TrollKeysCollection().UpdateByID(ctx, keyID, update)
	if err != nil {
		log.Printf("⚠️ Failed to update troll key status: %v", err)
	}
}

// MarkHealthy marks a key as healthy
func (p *OptimizedKeyPool) MarkHealthy(keyID string) {
	p.MarkStatus(keyID, StatusHealthy, 0, "")
}

// MarkRateLimited marks a key as rate limited
func (p *OptimizedKeyPool) MarkRateLimited(keyID string) {
	p.MarkStatus(keyID, StatusRateLimited, 60*time.Second, "Rate limited by upstream")
}

// MarkExhausted marks a key as exhausted
func (p *OptimizedKeyPool) MarkExhausted(keyID string) {
	p.MarkStatus(keyID, StatusExhausted, 24*time.Hour, "Token quota exhausted")
}

// MarkError marks a key with an error
func (p *OptimizedKeyPool) MarkError(keyID string, err string) {
	p.MarkStatus(keyID, StatusError, 30*time.Second, err)
}

// GetStats returns key pool statistics
func (p *OptimizedKeyPool) GetStats() map[string]int {
	stats := map[string]int{
		"total":        0,
		"healthy":      0,
		"rate_limited": 0,
		"exhausted":    0,
		"error":        0,
	}

	p.keys.Range(func(id string, key *TrollKey) bool {
		stats["total"]++
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
		return true
	})

	return stats
}

// GetAllKeysStatus returns all keys with their status
func (p *OptimizedKeyPool) GetAllKeysStatus() []map[string]interface{} {
	result := make([]map[string]interface{}, 0)
	
	p.keys.Range(func(id string, key *TrollKey) bool {
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
		return true
	})

	return result
}

// GetKeyCount returns the total number of keys
func (p *OptimizedKeyPool) GetKeyCount() int {
	keyList := p.keyList.Load()
	if keyList == nil {
		return 0
	}
	return len(*keyList)
}

// GetKeyByID returns a key by its ID (lock-free)
func (p *OptimizedKeyPool) GetKeyByID(keyID string) *TrollKey {
	if key, ok := p.keys.Load(keyID); ok {
		return key
	}
	return nil
}

// GetAPIKey returns the API key string for a given key ID
func (p *OptimizedKeyPool) GetAPIKey(keyID string) string {
	if key := p.GetKeyByID(keyID); key != nil {
		return key.APIKey
	}
	return ""
}

// Reload refreshes the key pool from database
func (p *OptimizedKeyPool) Reload() error {
	return p.LoadKeys()
}

// StartAutoReload starts a background goroutine that periodically reloads
func (p *OptimizedKeyPool) StartAutoReload(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		log.Printf("🔄 [Optimized] Key pool auto-reload started (interval: %v)", interval)

		for range ticker.C {
			if err := p.LoadKeys(); err != nil {
				log.Printf("⚠️ [Optimized] Key pool auto-reload failed: %v", err)
			} else {
				log.Printf("🔄 [Optimized] Auto-reloaded troll keys (%d keys)", p.GetKeyCount())
			}
		}
	}()
}

// AddKey adds a new key to the pool (used during rotation)
func (p *OptimizedKeyPool) AddKey(key *TrollKey) {
	p.keys.Store(key.ID, key)
	
	// Update key list
	keyList := p.keyList.Load()
	var newKeys []*TrollKey
	if keyList != nil {
		newKeys = append([]*TrollKey{}, *keyList...)
	}
	newKeys = append(newKeys, key)
	p.keyList.Store(&newKeys)
}

// RemoveKey removes a key from the pool
func (p *OptimizedKeyPool) RemoveKey(keyID string) {
	p.keys.Delete(keyID)
	
	// Update key list
	keyList := p.keyList.Load()
	if keyList != nil {
		newKeys := make([]*TrollKey, 0, len(*keyList)-1)
		for _, k := range *keyList {
			if k.ID != keyID {
				newKeys = append(newKeys, k)
			}
		}
		p.keyList.Store(&newKeys)
	}
}

// CheckAndRotateOnError checks if error warrants key rotation
func (p *OptimizedKeyPool) CheckAndRotateOnError(keyID string, statusCode int, errorBody string) {
	// Delegate to the original rotation logic
	GetPool().CheckAndRotateOnError(keyID, statusCode, errorBody)
}
