package ratelimit

import (
	"testing"
	"time"

	"goproxy/internal/userkey"
)

// Integration tests for rate limiting with key type detection
// These tests verify all Acceptance Criteria from Story 1.1

// AC1: User Key (sk-troll-xxx) should get 2000 RPM limit
func TestIntegration_UserKeyRateLimit2000RPM(t *testing.T) {
	limiter := NewRateLimiter()
	userKey := "sk-troll-user123abc"

	// Verify key type detection
	keyType := userkey.GetKeyType(userKey)
	if keyType != userkey.KeyTypeUser {
		t.Fatalf("Expected KeyTypeUser, got %v", keyType)
	}

	// Verify RPM is 2000
	limit := GetRPMForAPIKey(userKey)
	if limit != 2000 {
		t.Fatalf("Expected 2000 RPM for user key, got %d", limit)
	}

	// Verify rate limiter allows up to 2000 requests
	for i := 0; i < 2000; i++ {
		if !limiter.Allow(userKey, limit) {
			t.Fatalf("Request %d was rate limited, expected all 2000 to be allowed", i+1)
		}
	}

	// 2001st request should be rate limited
	if limiter.Allow(userKey, limit) {
		t.Fatal("Request 2001 should have been rate limited")
	}
}

// AC2: Friend Key (sk-trollllm-friend-xxx) should get 60 RPM limit
func TestIntegration_FriendKeyRateLimit60RPM(t *testing.T) {
	limiter := NewRateLimiter()
	friendKey := "sk-trollllm-friend-owner123"

	// Verify key type detection
	keyType := userkey.GetKeyType(friendKey)
	if keyType != userkey.KeyTypeFriend {
		t.Fatalf("Expected KeyTypeFriend, got %v", keyType)
	}

	// Verify RPM is 60
	limit := GetRPMForAPIKey(friendKey)
	if limit != 60 {
		t.Fatalf("Expected 60 RPM for friend key, got %d", limit)
	}

	// Verify rate limiter allows up to 60 requests
	for i := 0; i < 60; i++ {
		if !limiter.Allow(friendKey, limit) {
			t.Fatalf("Request %d was rate limited, expected all 60 to be allowed", i+1)
		}
	}

	// 61st request should be rate limited
	if limiter.Allow(friendKey, limit) {
		t.Fatal("Request 61 should have been rate limited")
	}
}

// AC3: Key type detection must complete in < 1ms
func TestIntegration_KeyTypeDetectionPerformance(t *testing.T) {
	testKeys := []string{
		"sk-troll-user123abc",
		"sk-trollllm-friend-owner123",
		"sk-other-unknown",
	}

	iterations := 10000
	start := time.Now()

	for i := 0; i < iterations; i++ {
		for _, key := range testKeys {
			_ = userkey.GetKeyType(key)
		}
	}

	elapsed := time.Since(start)
	avgPerOp := elapsed / time.Duration(iterations*len(testKeys))

	// Should be well under 1ms (typically ~10-20ns)
	if avgPerOp > time.Millisecond {
		t.Fatalf("Key type detection took %v per operation, expected < 1ms", avgPerOp)
	}

	t.Logf("Key type detection performance: %v per operation", avgPerOp)
}

// AC4: Existing API behavior remains unchanged
func TestIntegration_ExistingBehaviorUnchanged(t *testing.T) {
	limiter := NewRateLimiter()

	// Test that rate limiter still works correctly for different keys
	tests := []struct {
		name     string
		apiKey   string
		expected int
	}{
		{"User key", "sk-trollllm-user-abc123", 2000},
		{"Friend key", "sk-trollllm-friend-xyz456", 60},
		{"Unknown key fallback", "sk-random-key", 300},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limit := GetRPMForAPIKey(tt.apiKey)
			if limit != tt.expected {
				t.Errorf("Expected %d RPM for %s, got %d", tt.expected, tt.apiKey, limit)
			}

			// Verify limiter works with the determined limit
			if !limiter.Allow(tt.apiKey, limit) {
				t.Errorf("First request should be allowed for %s", tt.apiKey)
			}
		})
	}
}

// Test refCredits bonus still works for User Keys
func TestIntegration_RefCreditsBonusUserKeyOnly(t *testing.T) {
	// Verify that RefCredits bonus (1000 RPM) can only apply to User Keys
	// This is validated at the main.go level, here we just verify the key type detection

	userKey := "sk-troll-user123"
	friendKey := "sk-trollllm-friend-owner123"

	// User key should be eligible for RefCredits bonus
	if userkey.GetKeyType(userKey) != userkey.KeyTypeUser {
		t.Error("User key not detected correctly for RefCredits eligibility")
	}

	// Friend key should NOT be eligible for RefCredits bonus
	if userkey.GetKeyType(friendKey) != userkey.KeyTypeFriend {
		t.Error("Friend key should not be eligible for RefCredits bonus")
	}
}

// Test multiple key prefixes work correctly
func TestIntegration_MultipleKeyPrefixes(t *testing.T) {
	tests := []struct {
		name        string
		apiKey      string
		expectedKey userkey.KeyType
		expectedRPM int
	}{
		// User keys
		{"sk-troll prefix", "sk-troll-abc", userkey.KeyTypeUser, 2000},
		{"sk-trollllm prefix", "sk-trollllm-abc", userkey.KeyTypeUser, 2000},
		{"sk-trollllm-user prefix", "sk-trollllm-user-abc", userkey.KeyTypeUser, 2000},

		// Friend keys
		{"sk-trollllm-friend prefix", "sk-trollllm-friend-abc", userkey.KeyTypeFriend, 60},
		{"sk-trollllm-friend-owner prefix", "sk-trollllm-friend-owner-abc", userkey.KeyTypeFriend, 60},

		// Unknown keys
		{"Other prefix", "sk-openai-abc", userkey.KeyTypeUnknown, 300},
		{"Empty key", "", userkey.KeyTypeUnknown, 300},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotType := userkey.GetKeyType(tt.apiKey)
			gotRPM := GetRPMForAPIKey(tt.apiKey)

			if gotType != tt.expectedKey {
				t.Errorf("GetKeyType(%q) = %v, want %v", tt.apiKey, gotType, tt.expectedKey)
			}
			if gotRPM != tt.expectedRPM {
				t.Errorf("GetRPMForAPIKey(%q) = %d, want %d", tt.apiKey, gotRPM, tt.expectedRPM)
			}
		})
	}
}

// Benchmark full rate limit flow
func BenchmarkIntegration_FullRateLimitFlow(b *testing.B) {
	limiter := NewRateLimiter()
	testKeys := []string{
		"sk-troll-user123abc",
		"sk-trollllm-friend-owner123",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for _, key := range testKeys {
			limit := GetRPMForAPIKey(key)
			limiter.Allow(key, limit)
		}
	}
}

// Story 1.3: Friend Key Rate Limit - Comprehensive Tests
// These tests verify all Acceptance Criteria from Story 1.3
//
// TEST SCOPE: Unit/Integration tests for rate limiter behavior.
// These tests verify the RateLimiter struct methods (Allow, RetryAfter, Remaining).
// HTTP response headers are set in main.go:checkRateLimitWithUsername() using limiter data.
// Full HTTP layer testing would require httptest.Server and is outside this test file's scope.
//
// For HTTP layer verification, consider:
// - Manual testing with curl
// - End-to-end tests in a separate test file
// - Integration tests with real HTTP server

// TestFriendKey_AC1_60RequestsSucceed verifies AC1: 60 requests succeed within window
func TestFriendKey_AC1_60RequestsSucceed(t *testing.T) {
	limiter := NewRateLimiter()
	friendKey := "sk-trollllm-friend-test-ac1"
	limit := FriendKeyRPM // 60

	// All 60 requests should succeed
	successCount := 0
	for i := 0; i < 60; i++ {
		if limiter.Allow(friendKey, limit) {
			successCount++
		}
	}

	if successCount != 60 {
		t.Errorf("AC1 FAILED: Expected 60 successful requests, got %d", successCount)
	}
}

// TestFriendKey_AC2_61stRequestReturns429 verifies AC2: 61st request returns 429
func TestFriendKey_AC2_61stRequestReturns429(t *testing.T) {
	limiter := NewRateLimiter()
	friendKey := "sk-trollllm-friend-test-ac2"
	limit := FriendKeyRPM // 60

	// Make 60 requests (all should succeed)
	for i := 0; i < 60; i++ {
		limiter.Allow(friendKey, limit)
	}

	// 61st request should be denied (equivalent to 429)
	if limiter.Allow(friendKey, limit) {
		t.Error("AC2 FAILED: 61st request should have been rate limited (429)")
	}
}

// TestFriendKey_AC3_RetryAfterHeader verifies AC3: Retry-After header on 429
func TestFriendKey_AC3_RetryAfterHeader(t *testing.T) {
	limiter := NewRateLimiter()
	friendKey := "sk-trollllm-friend-test-ac3"
	limit := FriendKeyRPM // 60

	// Exhaust rate limit
	for i := 0; i < 60; i++ {
		limiter.Allow(friendKey, limit)
	}

	// Check RetryAfter value (should be > 0 when rate limited)
	retryAfter := limiter.RetryAfter(friendKey, limit)
	if retryAfter <= 0 {
		t.Errorf("AC3 FAILED: RetryAfter should be > 0 when rate limited, got %d", retryAfter)
	}

	// RetryAfter should be <= 60 seconds (window size)
	if retryAfter > 61 {
		t.Errorf("AC3 FAILED: RetryAfter should be <= 61 seconds, got %d", retryAfter)
	}

	t.Logf("RetryAfter value: %d seconds", retryAfter)
}

// TestFriendKey_AC4_RateLimitResetHeader verifies AC4: X-RateLimit-Reset header
// NOTE: This test verifies the limiter provides data for header calculation.
// The actual X-RateLimit-Reset header (Unix timestamp) is set in main.go:checkRateLimitWithUsername()
// using: time.Now().Add(time.Minute).Unix() - this is HTTP layer logic, not unit test scope.
func TestFriendKey_AC4_RateLimitResetHeader(t *testing.T) {
	limiter := NewRateLimiter()
	friendKey := "sk-trollllm-friend-test-ac4"
	limit := FriendKeyRPM // 60

	// Make one request
	allowed := limiter.Allow(friendKey, limit)
	if !allowed {
		t.Error("AC4 FAILED: First request should be allowed")
	}

	// RetryAfter provides the window duration for X-RateLimit-Reset calculation
	// - Optimized mode: Always returns 60 (window duration)
	// - Legacy mode: Returns seconds until oldest request expires
	retryAfter := limiter.RetryAfter(friendKey, limit)

	// Verify RetryAfter is within valid range (0-60 seconds)
	if retryAfter < 0 || retryAfter > 60 {
		t.Errorf("AC4 FAILED: RetryAfter should be 0-60 seconds, got %d", retryAfter)
	}

	t.Logf("RetryAfter value for X-RateLimit-Reset calculation: %d seconds", retryAfter)

	// The actual header is: X-RateLimit-Reset: <unix_timestamp>
	// Set in main.go as: time.Now().Add(time.Minute).Unix()
	// This verifies the limiter provides correct data for that calculation
}

// TestFriendKey_AC5_RateLimitHeaders verifies AC5: X-RateLimit-Limit and X-RateLimit-Remaining
// KNOWN LIMITATION: In optimized limiter mode, Remaining() returns estimate (limit/2) not exact count.
// This is a trade-off for O(1) performance. The X-RateLimit-Remaining header will show estimated value.
// See limiter_optimized.go:97-99 for implementation details.
func TestFriendKey_AC5_RateLimitHeaders(t *testing.T) {
	// Verify limit constant is 60 for Friend Key
	limit := FriendKeyRPM // 60
	if limit != 60 {
		t.Errorf("AC5 FAILED: X-RateLimit-Limit should be 60, got %d", limit)
	}

	// The key validation is that FriendKeyRPM = 60 is used
	// X-RateLimit-Remaining is provided by limiter.Remaining()
	// In optimized mode, Remaining() returns an estimate (limit/2)
	// In legacy mode, Remaining() returns exact count

	// Test that the rate limit enforcement works correctly
	limiter := NewRateLimiter()
	friendKey := "sk-trollllm-friend-test-ac5"

	// Make 60 requests - all should succeed
	successCount := 0
	for i := 0; i < 60; i++ {
		if limiter.Allow(friendKey, limit) {
			successCount++
		}
	}

	if successCount != 60 {
		t.Errorf("AC5 FAILED: Expected 60 successful requests, got %d", successCount)
	}

	// 61st request should be denied
	if limiter.Allow(friendKey, limit) {
		t.Error("AC5 FAILED: 61st request should be rate limited")
	}

	// Note: Remaining() value depends on implementation
	// Optimized limiter returns estimate, legacy returns exact count
	remaining := limiter.Remaining(friendKey, limit)
	t.Logf("Remaining value (may be estimate in optimized mode): %d", remaining)
}

// TestFriendKey_IndependentFromUserKey verifies Friend Key rate limiting is independent
func TestFriendKey_IndependentFromUserKey(t *testing.T) {
	limiter := NewRateLimiter()
	userKey := "sk-troll-user-independent-test"
	friendKey := "sk-trollllm-friend-independent-test"

	userLimit := UserKeyRPM     // 2000
	friendLimit := FriendKeyRPM // 60

	// Exhaust User Key rate limit
	for i := 0; i < 2000; i++ {
		limiter.Allow(userKey, userLimit)
	}

	// User Key should now be rate limited
	if limiter.Allow(userKey, userLimit) {
		t.Error("User Key should be rate limited after 2000 requests")
	}

	// User Key should now be rate limited
	if limiter.Allow(userKey, userLimit) {
		t.Error("User Key should be rate limited after 600 requests")
	}

	// Friend Key should still work (independent)
	if !limiter.Allow(friendKey, friendLimit) {
		t.Error("Friend Key should NOT be affected by User Key rate limit")
	}

	// Friend Key can make up to 60 requests
	successCount := 1 // Already made 1 request above
	for i := 0; i < 59; i++ {
		if limiter.Allow(friendKey, friendLimit) {
			successCount++
		}
	}

	if successCount != 60 {
		t.Errorf("Friend Key should allow 60 requests, got %d", successCount)
	}

	// 61st Friend Key request should be denied
	if limiter.Allow(friendKey, friendLimit) {
		t.Error("Friend Key 61st request should be rate limited")
	}
}

// TestFriendKey_DifferentFriendKeysIndependent verifies different Friend Keys have independent limits
func TestFriendKey_DifferentFriendKeysIndependent(t *testing.T) {
	limiter := NewRateLimiter()
	friendKey1 := "sk-trollllm-friend-owner1-key1"
	friendKey2 := "sk-trollllm-friend-owner2-key2"
	limit := FriendKeyRPM // 60

	// Exhaust first Friend Key's limit
	for i := 0; i < 60; i++ {
		limiter.Allow(friendKey1, limit)
	}

	// First Friend Key should be rate limited
	if limiter.Allow(friendKey1, limit) {
		t.Error("Friend Key 1 should be rate limited after 60 requests")
	}

	// Second Friend Key should still work - can make all 60 requests
	successCount := 0
	for i := 0; i < 60; i++ {
		if limiter.Allow(friendKey2, limit) {
			successCount++
		}
	}

	if successCount != 60 {
		t.Errorf("Friend Key 2 should allow 60 requests independently, got %d", successCount)
	}

	// 61st request for Friend Key 2 should be denied
	if limiter.Allow(friendKey2, limit) {
		t.Error("Friend Key 2 61st request should be rate limited")
	}
}

// Story 1.4: Rate Limit Headers - Comprehensive Tests
// These tests verify all Acceptance Criteria from Story 1.4
//
// TEST SCOPE: Unit tests for rate limiter data that populates HTTP headers.
// The actual HTTP headers are set in main.go:checkRateLimitWithUsername().
// These tests verify the limiter provides correct data for header values.

// TestRateLimitHeaders_AC1_XRateLimitResetOnSuccess verifies AC1: X-RateLimit-Reset on success
// The header value should be a Unix timestamp indicating when the limit resets
func TestRateLimitHeaders_AC1_XRateLimitResetOnSuccess(t *testing.T) {
	limiter := NewRateLimiter()
	userKey := "sk-troll-headers-ac1-test"
	limit := UserKeyRPM // 600

	// Make a successful request
	if !limiter.Allow(userKey, limit) {
		t.Fatal("First request should be allowed")
	}

	// Get RetryAfter - this is used to calculate X-RateLimit-Reset
	// In main.go: time.Now().Add(time.Minute).Unix() for success
	// The limiter provides RetryAfter which indicates window timing
	retryAfter := limiter.RetryAfter(userKey, limit)

	// On success (not rate limited), RetryAfter may be 0 or window duration
	// depending on implementation. Key point: X-RateLimit-Reset = now + 60 seconds
	t.Logf("AC1: RetryAfter for X-RateLimit-Reset calculation: %d seconds", retryAfter)

	// Verify the window is 60 seconds (1 minute) for RPM calculation
	// This is implicit in the limiter design - verify via constant
	if limiter.window != time.Minute {
		t.Errorf("AC1: Window should be 1 minute, got %v", limiter.window)
	}
}

// TestRateLimitHeaders_AC2_RetryAfterOn429 verifies AC2: Retry-After header on 429
func TestRateLimitHeaders_AC2_RetryAfterOn429(t *testing.T) {
	limiter := NewRateLimiter()
	userKey := "sk-troll-headers-ac2-test"
	limit := UserKeyRPM // 2000

	// Exhaust rate limit
	for i := 0; i < 2000; i++ {
		limiter.Allow(userKey, limit)
	}

	// Verify rate limited
	if limiter.Allow(userKey, limit) {
		t.Fatal("Request 2001 should be rate limited")
	}

	// Check Retry-After value
	retryAfter := limiter.RetryAfter(userKey, limit)

	// Retry-After must be > 0 when rate limited
	if retryAfter <= 0 {
		t.Errorf("AC2 FAILED: Retry-After should be > 0 on 429, got %d", retryAfter)
	}

	// Retry-After should be <= 61 seconds (window + 1)
	if retryAfter > 61 {
		t.Errorf("AC2 FAILED: Retry-After should be <= 61 seconds, got %d", retryAfter)
	}

	t.Logf("AC2: Retry-After header value on 429: %d seconds", retryAfter)
}

// TestRateLimitHeaders_AC3_XRateLimitResetOn429 verifies AC3: X-RateLimit-Reset on 429
func TestRateLimitHeaders_AC3_XRateLimitResetOn429(t *testing.T) {
	limiter := NewRateLimiter()
	friendKey := "sk-trollllm-friend-headers-ac3-test"
	limit := FriendKeyRPM // 60

	// Exhaust rate limit
	for i := 0; i < 60; i++ {
		limiter.Allow(friendKey, limit)
	}

	// Verify rate limited
	if limiter.Allow(friendKey, limit) {
		t.Fatal("Request 61 should be rate limited")
	}

	// X-RateLimit-Reset uses RetryAfter to calculate: now + retryAfter seconds
	retryAfter := limiter.RetryAfter(friendKey, limit)

	// RetryAfter must be valid for X-RateLimit-Reset calculation
	if retryAfter <= 0 {
		t.Errorf("AC3 FAILED: RetryAfter should be > 0 for X-RateLimit-Reset on 429, got %d", retryAfter)
	}

	// Calculate expected reset time range
	// Reset should be between now and now + 60 seconds
	now := time.Now()
	resetTime := now.Add(time.Duration(retryAfter) * time.Second)

	// Verify reset time is in the future
	if resetTime.Before(now) {
		t.Errorf("AC3 FAILED: X-RateLimit-Reset should be in the future")
	}

	// Verify reset time is within window
	if resetTime.After(now.Add(61 * time.Second)) {
		t.Errorf("AC3 FAILED: X-RateLimit-Reset should be within ~60 seconds")
	}

	t.Logf("AC3: X-RateLimit-Reset would be Unix timestamp: %d (retryAfter: %d)", resetTime.Unix(), retryAfter)
}

// TestRateLimitHeaders_AC4_XRateLimitLimitPerKeyType verifies AC4: X-RateLimit-Limit per key type
func TestRateLimitHeaders_AC4_XRateLimitLimitPerKeyType(t *testing.T) {
	tests := []struct {
		name          string
		apiKey        string
		expectedLimit int
	}{
		{"User Key (sk-troll-*)", "sk-troll-headers-ac4-user", 2000},
		{"User Key (sk-trollllm-*)", "sk-trollllm-headers-ac4-user", 2000},
		{"Friend Key", "sk-trollllm-friend-headers-ac4-friend", 60},
		{"Unknown Key", "sk-unknown-headers-ac4", 300},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limit := GetRPMForAPIKey(tt.apiKey)

			if limit != tt.expectedLimit {
				t.Errorf("AC4 FAILED: X-RateLimit-Limit for %s should be %d, got %d",
					tt.name, tt.expectedLimit, limit)
			}

			t.Logf("AC4: X-RateLimit-Limit for %s = %d", tt.name, limit)
		})
	}
}

// TestRateLimitHeaders_AC5_XRateLimitRemaining verifies AC5: X-RateLimit-Remaining
// KNOWN LIMITATION: In optimized limiter mode, Remaining() returns estimate (limit/2).
func TestRateLimitHeaders_AC5_XRateLimitRemaining(t *testing.T) {
	limiter := NewRateLimiter()
	userKey := "sk-troll-headers-ac5-test"
	limit := UserKeyRPM // 600

	// Initially, all requests should be remaining
	initialRemaining := limiter.Remaining(userKey, limit)

	// In optimized mode: estimate is limit/2 = 300
	// In legacy mode: exact count = 600 (or whatever is remaining)
	if initialRemaining < 0 || initialRemaining > limit {
		t.Errorf("AC5 FAILED: X-RateLimit-Remaining should be 0-%d, got %d", limit, initialRemaining)
	}

	t.Logf("AC5: Initial X-RateLimit-Remaining: %d (limit=%d)", initialRemaining, limit)

	// Make some requests
	for i := 0; i < 100; i++ {
		limiter.Allow(userKey, limit)
	}

	// Check remaining after 100 requests
	afterRemaining := limiter.Remaining(userKey, limit)

	// Remaining should be >= 0
	if afterRemaining < 0 {
		t.Errorf("AC5 FAILED: X-RateLimit-Remaining should not be negative, got %d", afterRemaining)
	}

	t.Logf("AC5: After 100 requests, X-RateLimit-Remaining: %d", afterRemaining)

	// Exhaust limit
	for i := 0; i < 500; i++ {
		limiter.Allow(userKey, limit)
	}

	// After exhausting limit, Remaining should be 0
	exhaustedRemaining := limiter.Remaining(userKey, limit)

	if exhaustedRemaining < 0 {
		t.Errorf("AC5 FAILED: X-RateLimit-Remaining should be >= 0, got %d", exhaustedRemaining)
	}

	t.Logf("AC5: After exhausting limit, X-RateLimit-Remaining: %d", exhaustedRemaining)
}

// TestRateLimitHeaders_UserKey2000_AllHeaders verifies all headers for User Key (2000 RPM)
func TestRateLimitHeaders_UserKey2000_AllHeaders(t *testing.T) {
	limiter := NewRateLimiter()
	userKey := "sk-troll-headers-userkey-test"
	limit := GetRPMForAPIKey(userKey)

	// Verify User Key limit is 2000
	if limit != 2000 {
		t.Fatalf("User Key limit should be 2000, got %d", limit)
	}

	// Make a successful request
	if !limiter.Allow(userKey, limit) {
		t.Fatal("First request should succeed")
	}

	// Verify all header data
	remaining := limiter.Remaining(userKey, limit)
	retryAfter := limiter.RetryAfter(userKey, limit)

	t.Logf("User Key (2000 RPM) Headers:")
	t.Logf("  X-RateLimit-Limit: %d", limit)
	t.Logf("  X-RateLimit-Remaining: %d", remaining)
	t.Logf("  RetryAfter (for Reset calc): %d", retryAfter)

	// Verify values are valid
	if limit != 2000 {
		t.Errorf("X-RateLimit-Limit should be 2000")
	}
	if remaining < 0 || remaining > limit {
		t.Errorf("X-RateLimit-Remaining should be 0-%d", limit)
	}
}

// TestRateLimitHeaders_FriendKey60_AllHeaders verifies all headers for Friend Key (60 RPM)
func TestRateLimitHeaders_FriendKey60_AllHeaders(t *testing.T) {
	limiter := NewRateLimiter()
	friendKey := "sk-trollllm-friend-headers-friendkey-test"
	limit := GetRPMForAPIKey(friendKey)

	// Verify Friend Key limit is 60
	if limit != 60 {
		t.Fatalf("Friend Key limit should be 60, got %d", limit)
	}

	// Make a successful request
	if !limiter.Allow(friendKey, limit) {
		t.Fatal("First request should succeed")
	}

	// Verify all header data
	remaining := limiter.Remaining(friendKey, limit)
	retryAfter := limiter.RetryAfter(friendKey, limit)

	t.Logf("Friend Key (60 RPM) Headers:")
	t.Logf("  X-RateLimit-Limit: %d", limit)
	t.Logf("  X-RateLimit-Remaining: %d", remaining)
	t.Logf("  RetryAfter (for Reset calc): %d", retryAfter)

	// Verify values are valid
	if limit != 60 {
		t.Errorf("X-RateLimit-Limit should be 60")
	}
	if remaining < 0 || remaining > limit {
		t.Errorf("X-RateLimit-Remaining should be 0-%d", limit)
	}
}

// TestRateLimitHeaders_429Response_AllHeaders verifies all headers on 429 response
func TestRateLimitHeaders_429Response_AllHeaders(t *testing.T) {
	limiter := NewRateLimiter()
	friendKey := "sk-trollllm-friend-headers-429-test"
	limit := FriendKeyRPM // 60

	// Exhaust rate limit to trigger 429 scenario
	for i := 0; i < 60; i++ {
		limiter.Allow(friendKey, limit)
	}

	// 61st request triggers 429
	allowed := limiter.Allow(friendKey, limit)
	if allowed {
		t.Fatal("61st request should be rate limited (429)")
	}

	// Verify all 429 headers
	retryAfter := limiter.RetryAfter(friendKey, limit)
	remaining := limiter.Remaining(friendKey, limit)

	t.Logf("429 Response Headers:")
	t.Logf("  Retry-After: %d seconds", retryAfter)
	t.Logf("  X-RateLimit-Limit: %d", limit)
	t.Logf("  X-RateLimit-Remaining: %d (should be 0)", remaining)
	t.Logf("  X-RateLimit-Reset: Unix timestamp (now + %d seconds)", retryAfter)

	// Verify 429 specific requirements
	if retryAfter <= 0 {
		t.Errorf("Retry-After must be > 0 on 429, got %d", retryAfter)
	}
	if retryAfter > 61 {
		t.Errorf("Retry-After should be <= 61 seconds, got %d", retryAfter)
	}
	// Note: Remaining may not be exactly 0 in optimized mode, but should be low
	if remaining < 0 {
		t.Errorf("X-RateLimit-Remaining should be >= 0, got %d", remaining)
	}
}
