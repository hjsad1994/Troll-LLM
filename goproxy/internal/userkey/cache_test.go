package userkey

import (
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

// newTestCache creates a fresh KeyCache with a custom TTL for testing
func newTestCache(ttl time.Duration) *KeyCache {
	return &KeyCache{
		ttl: ttl,
	}
}

func TestCacheHitMiss(t *testing.T) {
	cache := newTestCache(5 * time.Second)

	// Miss on empty cache
	_, _, hit := cache.Get("sk-trollllm-test-1")
	if hit {
		t.Fatal("expected cache miss on empty cache")
	}

	// Set a valid entry
	uk := &UserKey{ID: "sk-trollllm-test-1", Name: "testuser", IsActive: true}
	cache.Set("sk-trollllm-test-1", uk, nil)

	// Hit on cached entry
	gotKey, gotErr, hit := cache.Get("sk-trollllm-test-1")
	if !hit {
		t.Fatal("expected cache hit after Set")
	}
	if gotErr != nil {
		t.Fatalf("expected nil error, got %v", gotErr)
	}
	if gotKey.ID != "sk-trollllm-test-1" {
		t.Fatalf("expected ID sk-trollllm-test-1, got %s", gotKey.ID)
	}
	if gotKey.Name != "testuser" {
		t.Fatalf("expected Name testuser, got %s", gotKey.Name)
	}

	// Verify stats
	stats := cache.Stats()
	if stats.Hits != 1 {
		t.Fatalf("expected 1 hit, got %d", stats.Hits)
	}
	if stats.Misses != 1 {
		t.Fatalf("expected 1 miss, got %d", stats.Misses)
	}
	if stats.Size != 1 {
		t.Fatalf("expected size 1, got %d", stats.Size)
	}
}

func TestCacheTTLExpiration(t *testing.T) {
	cache := newTestCache(50 * time.Millisecond)

	uk := &UserKey{ID: "sk-trollllm-test-ttl", Name: "ttluser", IsActive: true}
	cache.Set("sk-trollllm-test-ttl", uk, nil)

	// Should hit immediately
	_, _, hit := cache.Get("sk-trollllm-test-ttl")
	if !hit {
		t.Fatal("expected cache hit before TTL expiration")
	}

	// Wait for TTL to expire
	time.Sleep(60 * time.Millisecond)

	// Should miss after expiration
	_, _, hit = cache.Get("sk-trollllm-test-ttl")
	if hit {
		t.Fatal("expected cache miss after TTL expiration")
	}
}

func TestCacheDeterministicErrorsCached(t *testing.T) {
	tests := []struct {
		name string
		err  error
	}{
		{"ErrKeyNotFound", ErrKeyNotFound},
		{"ErrKeyRevoked", ErrKeyRevoked},
		{"ErrCreditsExpired", ErrCreditsExpired},
		{"ErrMigrationRequired", ErrMigrationRequired},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cache := newTestCache(5 * time.Second)

			cache.Set("sk-trollllm-err-test", nil, tt.err)

			_, gotErr, hit := cache.Get("sk-trollllm-err-test")
			if !hit {
				t.Fatalf("expected deterministic error %v to be cached", tt.err)
			}
			if gotErr != tt.err {
				t.Fatalf("expected error %v, got %v", tt.err, gotErr)
			}
		})
	}
}

func TestCacheTransientErrorsNotCached(t *testing.T) {
	tests := []struct {
		name string
		err  error
	}{
		{"connection reset", errors.New("connection reset")},
		{"context deadline exceeded", errors.New("context deadline exceeded")},
		{"random db error", errors.New("random db error")},
		{"ErrInsufficientCredits", ErrInsufficientCredits},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cache := newTestCache(5 * time.Second)

			cache.Set("sk-trollllm-transient-test", nil, tt.err)

			_, _, hit := cache.Get("sk-trollllm-transient-test")
			if hit {
				t.Fatalf("expected transient error %v to NOT be cached", tt.err)
			}
		})
	}
}

func TestCacheConcurrentAccess(t *testing.T) {
	cache := newTestCache(5 * time.Second)
	numGoroutines := 100
	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func(idx int) {
			defer wg.Done()
			key := fmt.Sprintf("sk-trollllm-concurrent-%d", idx)
			uk := &UserKey{ID: key, Name: fmt.Sprintf("user-%d", idx), IsActive: true}

			// Set
			cache.Set(key, uk, nil)

			// Get
			gotKey, gotErr, hit := cache.Get(key)
			if !hit {
				t.Errorf("goroutine %d: expected cache hit", idx)
				return
			}
			if gotErr != nil {
				t.Errorf("goroutine %d: expected nil error, got %v", idx, gotErr)
				return
			}
			if gotKey.ID != key {
				t.Errorf("goroutine %d: expected ID %s, got %s", idx, key, gotKey.ID)
			}
		}(i)
	}

	wg.Wait()

	// Verify size roughly matches
	stats := cache.Stats()
	if stats.Size != numGoroutines {
		t.Fatalf("expected size %d, got %d", numGoroutines, stats.Size)
	}
}

func TestCacheDisableViaEnv(t *testing.T) {
	// Test the helper function directly since init() only runs once
	t.Run("isCacheEnvDisabled", func(t *testing.T) {
		tests := []struct {
			value    string
			expected bool
		}{
			{"true", true},
			{"TRUE", true},
			{"True", true},
			{"1", true},
			{"yes", true},
			{"YES", true},
			{"false", false},
			{"0", false},
			{"no", false},
			{"", false},
		}

		for _, tt := range tests {
			t.Run(tt.value, func(t *testing.T) {
				t.Setenv("GOPROXY_TEST_CACHE_DISABLE", tt.value)
				result := isCacheEnvDisabled("GOPROXY_TEST_CACHE_DISABLE")
				if result != tt.expected {
					t.Fatalf("isCacheEnvDisabled(%q) = %v, want %v", tt.value, result, tt.expected)
				}
			})
		}
	})
}

func TestCacheCleanupRemovesExpired(t *testing.T) {
	cache := newTestCache(50 * time.Millisecond)

	// Add multiple entries
	for i := 0; i < 10; i++ {
		key := fmt.Sprintf("sk-trollllm-cleanup-%d", i)
		uk := &UserKey{ID: key, Name: fmt.Sprintf("user-%d", i), IsActive: true}
		cache.Set(key, uk, nil)
	}

	// Verify entries exist
	stats := cache.Stats()
	if stats.Size != 10 {
		t.Fatalf("expected 10 entries before cleanup, got %d", stats.Size)
	}

	// Wait for TTL to expire
	time.Sleep(60 * time.Millisecond)

	// Run cleanup
	cache.Cleanup()

	// Verify all expired entries were removed
	stats = cache.Stats()
	if stats.Size != 0 {
		t.Fatalf("expected 0 entries after cleanup, got %d", stats.Size)
	}
}

func TestCacheInvalidate(t *testing.T) {
	cache := newTestCache(5 * time.Second)

	// Set and verify hit
	uk := &UserKey{ID: "sk-trollllm-invalidate", Name: "user1", IsActive: true}
	cache.Set("sk-trollllm-invalidate", uk, nil)
	_, _, hit := cache.Get("sk-trollllm-invalidate")
	if !hit {
		t.Fatal("expected cache hit before invalidation")
	}

	// Invalidate single entry
	cache.Invalidate("sk-trollllm-invalidate")
	_, _, hit = cache.Get("sk-trollllm-invalidate")
	if hit {
		t.Fatal("expected cache miss after Invalidate")
	}

	// Test InvalidateAll
	for i := 0; i < 5; i++ {
		key := fmt.Sprintf("sk-trollllm-inv-all-%d", i)
		cache.Set(key, &UserKey{ID: key, Name: "user", IsActive: true}, nil)
	}
	stats := cache.Stats()
	if stats.Size != 5 {
		t.Fatalf("expected 5 entries before InvalidateAll, got %d", stats.Size)
	}

	cache.InvalidateAll()
	stats = cache.Stats()
	if stats.Size != 0 {
		t.Fatalf("expected 0 entries after InvalidateAll, got %d", stats.Size)
	}
}

func TestCacheNilUserKeyWithNilError(t *testing.T) {
	cache := newTestCache(5 * time.Second)

	// Cache nil UserKey with nil error (edge case)
	cache.Set("sk-trollllm-nil-test", nil, nil)

	gotKey, gotErr, hit := cache.Get("sk-trollllm-nil-test")
	if !hit {
		t.Fatal("expected cache hit for nil UserKey with nil error")
	}
	if gotKey != nil {
		t.Fatalf("expected nil UserKey, got %+v", gotKey)
	}
	if gotErr != nil {
		t.Fatalf("expected nil error, got %v", gotErr)
	}
}

func TestIsCacheableResult(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{"nil (success)", nil, true},
		{"ErrKeyNotFound", ErrKeyNotFound, true},
		{"ErrKeyRevoked", ErrKeyRevoked, true},
		{"ErrCreditsExpired", ErrCreditsExpired, true},
		{"ErrMigrationRequired", ErrMigrationRequired, true},
		{"ErrInsufficientCredits", ErrInsufficientCredits, false},
		{"random error", errors.New("some db error"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isCacheableResult(tt.err)
			if result != tt.expected {
				t.Fatalf("isCacheableResult(%v) = %v, want %v", tt.err, result, tt.expected)
			}
		})
	}
}
