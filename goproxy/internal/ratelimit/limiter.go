package ratelimit

import (
	"os"
	"strings"
	"sync"
	"time"

	"goproxy/internal/userkey"
)

// DefaultRPM is the fallback rate limit for unknown key types
const DefaultRPM = 300

// UserKeyRPM is the rate limit for User Keys (sk-troll-* or sk-trollllm-*)
const UserKeyRPM = 2000

// FriendKeyRPM is the rate limit for Friend Keys (sk-trollllm-friend-*)
const FriendKeyRPM = 60

// GetRPMForKeyType returns the RPM limit for a given key type
func GetRPMForKeyType(keyType userkey.KeyType) int {
	switch keyType {
	case userkey.KeyTypeUser:
		return UserKeyRPM
	case userkey.KeyTypeFriend:
		return FriendKeyRPM
	default:
		return DefaultRPM
	}
}

// GetRPMForAPIKey returns the RPM limit for an API key based on its prefix
// This is a convenience function that combines GetKeyType and GetRPMForKeyType
func GetRPMForAPIKey(apiKey string) int {
	return GetRPMForKeyType(userkey.GetKeyType(apiKey))
}

// UseOptimizedLimiter controls whether to use the optimized limiter
// Set to true for production (O(1) sliding window)
// Can be disabled via env: GOPROXY_DISABLE_OPTIMIZATIONS=true
var UseOptimizedLimiter = true

func init() {
	if isEnvDisabled("GOPROXY_DISABLE_OPTIMIZATIONS") || isEnvDisabled("GOPROXY_DISABLE_RATE_LIMITER_OPT") {
		UseOptimizedLimiter = false
	}
}

func isEnvDisabled(key string) bool {
	val := strings.ToLower(os.Getenv(key))
	return val == "true" || val == "1" || val == "yes"
}

type RateLimiter struct {
	mu        sync.Mutex
	requests  map[string][]time.Time
	window    time.Duration
	optimized *OptimizedRateLimiter
}

func NewRateLimiter() *RateLimiter {
	r := &RateLimiter{
		requests: make(map[string][]time.Time),
		window:   time.Minute,
	}
	if UseOptimizedLimiter {
		r.optimized = NewOptimizedRateLimiter()
	}
	return r
}

func (r *RateLimiter) Allow(key string, limit int) bool {
	// Use optimized limiter if enabled
	if r.optimized != nil {
		return r.optimized.Allow(key, limit)
	}

	// Fallback to legacy implementation
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-r.window)

	// Get existing requests for this key
	reqs, exists := r.requests[key]
	if !exists {
		r.requests[key] = []time.Time{now}
		return true
	}

	// Filter out old requests
	var valid []time.Time
	for _, t := range reqs {
		if t.After(windowStart) {
			valid = append(valid, t)
		}
	}

	// Check if under limit
	if len(valid) >= limit {
		r.requests[key] = valid
		return false
	}

	// Add new request
	valid = append(valid, now)
	r.requests[key] = valid
	return true
}

func (r *RateLimiter) RetryAfter(key string, limit int) int {
	// Use optimized limiter if enabled
	if r.optimized != nil {
		return r.optimized.RetryAfter(key, limit)
	}

	// Fallback to legacy implementation
	r.mu.Lock()
	defer r.mu.Unlock()

	reqs, exists := r.requests[key]
	if !exists || len(reqs) < limit {
		return 0
	}

	now := time.Now()
	windowStart := now.Add(-r.window)

	// Find oldest request in window
	var oldest time.Time
	for _, t := range reqs {
		if t.After(windowStart) {
			if oldest.IsZero() || t.Before(oldest) {
				oldest = t
			}
		}
	}

	if oldest.IsZero() {
		return 0
	}

	// Calculate when oldest will expire
	expiresAt := oldest.Add(r.window)
	retryAfter := int(expiresAt.Sub(now).Seconds())
	if retryAfter < 0 {
		return 0
	}
	return retryAfter + 1
}

func (r *RateLimiter) CurrentCount(key string) int {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-r.window)

	reqs, exists := r.requests[key]
	if !exists {
		return 0
	}

	count := 0
	for _, t := range reqs {
		if t.After(windowStart) {
			count++
		}
	}
	return count
}

// Remaining returns the number of requests remaining in the current window
func (r *RateLimiter) Remaining(key string, limit int) int {
	// Use optimized limiter if enabled
	if r.optimized != nil {
		return r.optimized.Remaining(key, limit)
	}

	// Fallback to legacy implementation
	count := r.CurrentCount(key)
	remaining := limit - count
	if remaining < 0 {
		return 0
	}
	return remaining
}

// GetLimit returns the default rate limit (300 RPM for unknown key types)
func GetLimit() int {
	return DefaultRPM
}

// Cleanup old entries periodically
func (r *RateLimiter) Cleanup() {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-r.window)

	for key, reqs := range r.requests {
		var valid []time.Time
		for _, t := range reqs {
			if t.After(windowStart) {
				valid = append(valid, t)
			}
		}
		if len(valid) == 0 {
			delete(r.requests, key)
		} else {
			r.requests[key] = valid
		}
	}
}
