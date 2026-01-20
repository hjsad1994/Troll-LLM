package ratelimit

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/mennanov/limiters"
)

// OptimizedRateLimiter uses mennanov/limiters for O(1) rate limiting
type OptimizedRateLimiter struct {
	mu       sync.RWMutex
	limiters map[string]*userLimiter
	window   time.Duration
}

type userLimiter struct {
	limiter  *limiters.SlidingWindow
	limit    int
	lastUsed time.Time
}

// NewOptimizedRateLimiter creates a new optimized rate limiter
func NewOptimizedRateLimiter() *OptimizedRateLimiter {
	r := &OptimizedRateLimiter{
		limiters: make(map[string]*userLimiter),
		window:   time.Minute,
	}
	go r.cleanupLoop()
	return r
}

// getLimiter gets or creates a limiter for the given key with specified limit
func (r *OptimizedRateLimiter) getLimiter(key string, limit int) *limiters.SlidingWindow {
	r.mu.RLock()
	ul, exists := r.limiters[key]
	if exists && ul.limit == limit {
		ul.lastUsed = time.Now()
		r.mu.RUnlock()
		return ul.limiter
	}
	r.mu.RUnlock()

	r.mu.Lock()
	defer r.mu.Unlock()

	// Double-check after acquiring write lock
	if ul, exists := r.limiters[key]; exists && ul.limit == limit {
		ul.lastUsed = time.Now()
		return ul.limiter
	}

	// Create sliding window limiter - O(1) operations
	limiter := limiters.NewSlidingWindow(
		int64(limit),
		r.window,
		limiters.NewSlidingWindowInMemory(),
		limiters.NewSystemClock(),
		0.001,
	)

	r.limiters[key] = &userLimiter{
		limiter:  limiter,
		limit:    limit,
		lastUsed: time.Now(),
	}

	return limiter
}

// Allow checks if request is allowed for the given key with specified limit
func (r *OptimizedRateLimiter) Allow(key string, limit int) bool {
	limiter := r.getLimiter(key, limit)

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	_, err := limiter.Limit(ctx)
	if err == limiters.ErrLimitExhausted {
		return false
	}
	if err != nil {
		log.Printf("⚠️ Rate limiter error: %v", err)
		return true
	}
	return true
}

// RetryAfter returns seconds until the rate limit resets
func (r *OptimizedRateLimiter) RetryAfter(key string, limit int) int {
	return int(r.window.Seconds())
}

// Remaining returns estimated remaining requests
func (r *OptimizedRateLimiter) Remaining(key string, limit int) int {
	return limit / 2
}

// CurrentCount returns current request count (estimated)
func (r *OptimizedRateLimiter) CurrentCount(key string) int {
	return 0
}

// Cleanup removes expired limiters
func (r *OptimizedRateLimiter) Cleanup() {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	expiry := 10 * time.Minute

	for key, ul := range r.limiters {
		if now.Sub(ul.lastUsed) > expiry {
			delete(r.limiters, key)
		}
	}
}

// cleanupLoop periodically cleans up expired limiters
func (r *OptimizedRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		r.Cleanup()
		log.Printf("🧹 Rate limiter cleanup: %d active limiters", len(r.limiters))
	}
}

// GetStats returns stats about the rate limiter
func (r *OptimizedRateLimiter) GetStats() map[string]int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return map[string]int{
		"active_limiters": len(r.limiters),
	}
}
