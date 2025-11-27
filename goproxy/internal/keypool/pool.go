package keypool

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
	ErrNoHealthyKeys = errors.New("no healthy factory keys available")
)

type KeyPool struct {
	mu      sync.Mutex
	keys    []*FactoryKey
	current int
}

var (
	pool     *KeyPool
	poolOnce sync.Once
)

func GetPool() *KeyPool {
	poolOnce.Do(func() {
		pool = &KeyPool{
			keys:    make([]*FactoryKey, 0),
			current: 0,
		}
		pool.LoadKeys()
	})
	return pool
}

func (p *KeyPool) LoadKeys() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := db.FactoryKeysCollection().Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	p.mu.Lock()
	defer p.mu.Unlock()

	p.keys = make([]*FactoryKey, 0)
	for cursor.Next(ctx) {
		var key FactoryKey
		if err := cursor.Decode(&key); err != nil {
			log.Printf("⚠️ Failed to decode factory key: %v", err)
			continue
		}
		p.keys = append(p.keys, &key)
	}

	log.Printf("✅ Loaded %d factory keys", len(p.keys))
	return nil
}

func (p *KeyPool) SelectKey() (*FactoryKey, error) {
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

func (p *KeyPool) MarkStatus(keyID string, status FactoryKeyStatus, cooldown time.Duration, lastError string) {
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

func (p *KeyPool) updateKeyStatus(keyID string, status FactoryKeyStatus, cooldownUntil *time.Time, lastError string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"status":        status,
			"lastError":     lastError,
			"cooldownUntil": cooldownUntil,
		},
	}

	_, err := db.FactoryKeysCollection().UpdateByID(ctx, keyID, update)
	if err != nil {
		log.Printf("⚠️ Failed to update factory key status: %v", err)
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

func (p *KeyPool) GetKeyCount() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.keys)
}

func (p *KeyPool) GetKeyByID(keyID string) *FactoryKey {
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
