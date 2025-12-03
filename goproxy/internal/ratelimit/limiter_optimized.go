package ratelimit

import (
	"log"
	"sync"
	"sync/atomic"
	"time"
)

// OptimizedRateLimiter uses sliding window counter for O(1) rate limiting
// No external dependencies required
type OptimizedRateLimiter struct {
	mu       sync.RWMutex
	limiters map[string]*slidingWindowCounter
	window   time.Duration
}

// slidingWindowCounter implements O(1) sliding window rate limiting
type slidingWindowCounter struct {
	prevCount   int64     // Count from previous window
	currCount   int64     // Count in current window
	windowStart time.Time // Start of current window
	limit       int
	lastUsed    time.Time
	mu          sync.Mutex
}

// NewOptimizedRateLimiter creates a new optimized rate limiter
func NewOptimizedRateLimiter() *OptimizedRateLimiter {
	r := &OptimizedRateLimiter{
		limiters: make(map[string]*slidingWindowCounter),
		window:   time.Minute,
	}
	go r.cleanupLoop()
	return r
}

// getCounter gets or creates a counter for the given key
func (r *OptimizedRateLimiter) getCounter(key string, limit int) *slidingWindowCounter {
	r.mu.RLock()
	counter, exists := r.limiters[key]
	if exists && counter.limit == limit {
		counter.lastUsed = time.Now()
		r.mu.RUnlock()
		return counter
	}
	r.mu.RUnlock()

	r.mu.Lock()
	defer r.mu.Unlock()

	// Double-check
	if counter, exists := r.limiters[key]; exists && counter.limit == limit {
		counter.lastUsed = time.Now()
		return counter
	}

	counter = &slidingWindowCounter{
		prevCount:   0,
		currCount:   0,
		windowStart: time.Now(),
		limit:       limit,
		lastUsed:    time.Now(),
	}
	r.limiters[key] = counter
	return counter
}

// Allow checks if request is allowed - O(1) complexity
func (r *OptimizedRateLimiter) Allow(key string, limit int) bool {
	counter := r.getCounter(key, limit)

	counter.mu.Lock()
	defer counter.mu.Unlock()

	now := time.Now()
	windowDuration := r.window

	// Check if we need to slide the window
	elapsed := now.Sub(counter.windowStart)

	if elapsed >= windowDuration*2 {
		// More than 2 windows passed, reset everything
		counter.prevCount = 0
		counter.currCount = 1
		counter.windowStart = now
		return true
	} else if elapsed >= windowDuration {
		// Slide window: current becomes previous
		counter.prevCount = counter.currCount
		counter.currCount = 0
		counter.windowStart = now.Add(-elapsed.Truncate(windowDuration))
		elapsed = now.Sub(counter.windowStart)
	}

	// Calculate weighted count using sliding window algorithm
	// Weight = how far we are into current window (0.0 to 1.0)
	weight := float64(elapsed) / float64(windowDuration)
	prevWeight := 1.0 - weight

	// Estimated count = (prev * prevWeight) + current
	estimatedCount := float64(counter.prevCount)*prevWeight + float64(counter.currCount)

	if int(estimatedCount) >= limit {
		return false
	}

	// Increment current window count
	counter.currCount++
	return true
}

// RetryAfter returns seconds until rate limit resets
func (r *OptimizedRateLimiter) RetryAfter(key string, limit int) int {
	r.mu.RLock()
	counter, exists := r.limiters[key]
	r.mu.RUnlock()

	if !exists {
		return 0
	}

	counter.mu.Lock()
	defer counter.mu.Unlock()

	elapsed := time.Since(counter.windowStart)
	remaining := r.window - elapsed
	if remaining < 0 {
		return 0
	}
	return int(remaining.Seconds()) + 1
}

// Remaining returns estimated remaining requests
func (r *OptimizedRateLimiter) Remaining(key string, limit int) int {
	r.mu.RLock()
	counter, exists := r.limiters[key]
	r.mu.RUnlock()

	if !exists {
		return limit
	}

	counter.mu.Lock()
	defer counter.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(counter.windowStart)
	weight := float64(elapsed) / float64(r.window)
	if weight > 1 {
		weight = 1
	}
	prevWeight := 1.0 - weight

	estimatedCount := float64(counter.prevCount)*prevWeight + float64(counter.currCount)
	remaining := limit - int(estimatedCount)
	if remaining < 0 {
		return 0
	}
	return remaining
}

// CurrentCount returns current request count
func (r *OptimizedRateLimiter) CurrentCount(key string) int {
	r.mu.RLock()
	counter, exists := r.limiters[key]
	r.mu.RUnlock()

	if !exists {
		return 0
	}

	return int(atomic.LoadInt64(&counter.currCount))
}

// Cleanup removes expired limiters
func (r *OptimizedRateLimiter) Cleanup() {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	expiry := 10 * time.Minute

	for key, counter := range r.limiters {
		if now.Sub(counter.lastUsed) > expiry {
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
