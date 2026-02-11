package userkey

import (
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// UseKeyCache controls whether to use in-memory TTL cache for ValidateKey
// Can be disabled via env: GOPROXY_DISABLE_KEY_CACHE=true or GOPROXY_DISABLE_OPTIMIZATIONS=true
var UseKeyCache = true

// Default cache TTL (30 seconds)
var keyCacheTTL = 30 * time.Second

func init() {
	if isCacheEnvDisabled("GOPROXY_DISABLE_OPTIMIZATIONS") || isCacheEnvDisabled("GOPROXY_DISABLE_KEY_CACHE") {
		UseKeyCache = false
		log.Printf("🔑 [KeyCache] Disabled via environment variable")
	}

	// Allow custom TTL via env var
	if ttlStr := os.Getenv("GOPROXY_KEY_CACHE_TTL_SECONDS"); ttlStr != "" {
		if ttlSeconds, err := strconv.Atoi(ttlStr); err == nil && ttlSeconds > 0 {
			keyCacheTTL = time.Duration(ttlSeconds) * time.Second
		}
	}
}

func isCacheEnvDisabled(key string) bool {
	val := strings.ToLower(os.Getenv(key))
	return val == "true" || val == "1" || val == "yes"
}

// cacheEntry holds a cached ValidateKey result
type cacheEntry struct {
	userKey  *UserKey
	err      error
	cachedAt time.Time
}

// CacheStats holds cache statistics for monitoring
type CacheStats struct {
	Hits   uint64
	Misses uint64
	Size   int
}

// KeyCache provides in-memory TTL caching for ValidateKey results
type KeyCache struct {
	entries sync.Map // map[string]*cacheEntry
	ttl     time.Duration
	hits    atomic.Uint64
	misses  atomic.Uint64
}

var (
	keyCache     *KeyCache
	keyCacheOnce sync.Once
)

// GetKeyCache returns the singleton KeyCache instance
func GetKeyCache() *KeyCache {
	keyCacheOnce.Do(func() {
		keyCache = &KeyCache{
			ttl: keyCacheTTL,
		}
		keyCache.startCleanup()
		log.Printf("🔑 [KeyCache] Initialized (TTL: %ds, cleanup: 60s)", int(keyCacheTTL.Seconds()))
	})
	return keyCache
}

// Get retrieves a cached ValidateKey result.
// Returns the cached UserKey, error, and whether it was a cache hit.
func (c *KeyCache) Get(apiKey string) (*UserKey, error, bool) {
	raw, ok := c.entries.Load(apiKey)
	if !ok {
		c.misses.Add(1)
		return nil, nil, false
	}

	entry := raw.(*cacheEntry)

	// Check TTL expiration
	if time.Since(entry.cachedAt) >= c.ttl {
		c.entries.Delete(apiKey)
		c.misses.Add(1)
		return nil, nil, false
	}

	c.hits.Add(1)
	return entry.userKey, entry.err, true
}

// Set stores a ValidateKey result in cache.
// Only caches deterministic results (success or known error types).
// Transient errors (DB timeouts, network issues) are never cached.
func (c *KeyCache) Set(apiKey string, userKey *UserKey, err error) {
	if !isCacheableResult(err) {
		return
	}

	c.entries.Store(apiKey, &cacheEntry{
		userKey:  userKey,
		err:      err,
		cachedAt: time.Now(),
	})
}

// Invalidate removes a single entry from the cache
func (c *KeyCache) Invalidate(apiKey string) {
	c.entries.Delete(apiKey)
}

// InvalidateAll clears the entire cache
func (c *KeyCache) InvalidateAll() {
	c.entries.Range(func(key, _ any) bool {
		c.entries.Delete(key)
		return true
	})
}

// Stats returns current cache statistics
func (c *KeyCache) Stats() CacheStats {
	size := 0
	c.entries.Range(func(_, _ any) bool {
		size++
		return true
	})

	return CacheStats{
		Hits:   c.hits.Load(),
		Misses: c.misses.Load(),
		Size:   size,
	}
}

// Cleanup removes expired entries from the cache
func (c *KeyCache) Cleanup() {
	now := time.Now()
	removed := 0

	c.entries.Range(func(key, value any) bool {
		entry := value.(*cacheEntry)
		if now.Sub(entry.cachedAt) >= c.ttl {
			c.entries.Delete(key)
			removed++
		}
		return true
	})

	remaining := 0
	c.entries.Range(func(_, _ any) bool {
		remaining++
		return true
	})

	if removed > 0 {
		log.Printf("🧹 [KeyCache] Cleanup: removed %d expired entries, %d remaining", removed, remaining)
	}
}

// startCleanup runs a background goroutine to periodically evict expired entries
func (c *KeyCache) startCleanup() {
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			c.Cleanup()
		}
	}()
}

// isCacheableResult determines if a ValidateKey result should be cached.
// Only deterministic results are cached. Transient errors (DB failures, timeouts) are not.
// ErrInsufficientCredits is NOT cached because credit balances are volatile.
func isCacheableResult(err error) bool {
	if err == nil {
		return true
	}

	switch err {
	case ErrKeyNotFound, ErrKeyRevoked, ErrCreditsExpired, ErrMigrationRequired:
		return true
	default:
		return false
	}
}
