package openhands

import (
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func newTestSpendCheckerWithHTTPResponder(t *testing.T, threshold float64, responder roundTripFunc) *SpendChecker {
	t.Helper()

	provider := &OpenHandsProvider{
		client: &http.Client{Transport: responder},
	}

	return NewSpendChecker(provider, threshold, DefaultActiveCheckInterval, DefaultIdleCheckInterval)
}

// Helper function to create time pointers
func timePtr(t time.Time) *time.Time {
	return &t
}

func TestDefaultConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      interface{}
		expected interface{}
	}{
		{"DefaultSpendThreshold", DefaultSpendThreshold, 10.0},
		{"SpendCheckInterval", SpendCheckInterval, 10 * time.Second},
		{"ActiveKeyWindow", ActiveKeyWindow, 4 * time.Minute},
		{"OpenHandsActivityURL", OpenHandsActivityURL, "https://llm-proxy.app.all-hands.dev/user/daily/activity"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("%s = %v, want %v", tt.name, tt.got, tt.expected)
			}
		})
	}
}

func TestSpendThresholdLogic(t *testing.T) {
	tests := []struct {
		name                 string
		spend                float64
		threshold            float64
		isAtOrAboveThreshold bool
	}{
		{"spend below threshold", 5.0, 9.8, false},
		{"spend at threshold", 9.8, 9.8, true},
		{"spend above threshold", 10.5, 9.8, true},
		{"spend just below threshold", 9.79, 9.8, false},
		{"zero spend", 0.0, 9.8, false},
		{"negative spend", -1.0, 9.8, false},
		{"very high spend", 100.0, 9.8, true},
		{"custom threshold low", 5.0, 5.0, true},
		{"custom threshold high", 15.0, 20.0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isAtOrAboveThreshold := tt.spend >= tt.threshold
			if isAtOrAboveThreshold != tt.isAtOrAboveThreshold {
				t.Errorf("spend %.2f >= threshold %.2f = %v, want %v",
					tt.spend, tt.threshold, isAtOrAboveThreshold, tt.isAtOrAboveThreshold)
			}
		})
	}
}

func TestSpendCheckerIsMonitorOnly_NoRotationCalls(t *testing.T) {
	content, err := os.ReadFile("spend_checker.go")
	if err != nil {
		t.Fatalf("failed to read spend_checker.go: %v", err)
	}

	source := string(content)
	forbidden := []string{"RotateKey(", "CheckAndRotateOnError("}

	for _, token := range forbidden {
		if strings.Contains(source, token) {
			t.Errorf("spend_checker.go must stay monitor-only, found forbidden call: %s", token)
		}
	}
}

func TestCheckKeySpend_BudgetExceededParsing(t *testing.T) {
	responseBody := `{"error":{"message":"budget_exceeded Spend=10.02107649999999, Budget=10.0"}}`

	sc := newTestSpendCheckerWithHTTPResponder(t, 10.0, func(req *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusBadRequest,
			Body:       io.NopCloser(strings.NewReader(responseBody)),
			Header:     make(http.Header),
			Request:    req,
		}, nil
	})

	key := &OpenHandsKey{ID: "k1", APIKey: "sk-test", Status: OpenHandsStatusHealthy}
	result := sc.checkKeySpend(key, true)

	if !result.BudgetExceeded {
		t.Fatalf("expected BudgetExceeded to be true")
	}
	if result.Error != nil {
		t.Fatalf("expected no error for budget_exceeded path, got: %v", result.Error)
	}
	if result.Spend <= 10.0 {
		t.Fatalf("expected parsed spend > threshold, got %.6f", result.Spend)
	}
}

func TestCheckKeySpend_BudgetExceededFallbackToThreshold(t *testing.T) {
	responseBody := `{"error":{"message":"budget_exceeded"}}`

	sc := newTestSpendCheckerWithHTTPResponder(t, 10.0, func(req *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusBadRequest,
			Body:       io.NopCloser(strings.NewReader(responseBody)),
			Header:     make(http.Header),
			Request:    req,
		}, nil
	})

	key := &OpenHandsKey{ID: "k2", APIKey: "sk-test", Status: OpenHandsStatusHealthy}
	result := sc.checkKeySpend(key, true)

	if !result.BudgetExceeded {
		t.Fatalf("expected BudgetExceeded to be true")
	}
	if result.Error != nil {
		t.Fatalf("expected no error for budget_exceeded path, got: %v", result.Error)
	}
	if result.Spend != 10.0 {
		t.Fatalf("expected fallback spend to threshold 10.0, got %.2f", result.Spend)
	}
}

func TestCheckKeySpend_UnauthorizedReturnsError(t *testing.T) {
	responseBody := `{"error":"unauthorized"}`

	sc := newTestSpendCheckerWithHTTPResponder(t, 10.0, func(req *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusUnauthorized,
			Body:       io.NopCloser(strings.NewReader(responseBody)),
			Header:     make(http.Header),
			Request:    req,
		}, nil
	})

	key := &OpenHandsKey{ID: "k3", APIKey: "sk-test", Status: OpenHandsStatusHealthy}
	result := sc.checkKeySpend(key, true)

	if result.BudgetExceeded {
		t.Fatalf("expected BudgetExceeded to be false")
	}
	if result.Error == nil {
		t.Fatalf("expected auth error for 401 response")
	}
	if !strings.Contains(result.Error.Error(), "auth error 401") {
		t.Fatalf("expected auth error message, got: %v", result.Error)
	}
}

func TestKeyActiveDetection(t *testing.T) {
	now := time.Now()

	// Create a mock SpendChecker for testing
	sc := &SpendChecker{
		baseCheckInterval: SpendCheckInterval,
		threshold:         DefaultSpendThreshold,
	}

	tests := []struct {
		name       string
		lastUsedAt *time.Time
		isActive   bool
	}{
		{"nil lastUsedAt", nil, false},
		{"used 1 minute ago", timePtr(now.Add(-1 * time.Minute)), true},
		{"used 3 minutes ago", timePtr(now.Add(-3 * time.Minute)), true},
		{"used 3m59s ago (just within window)", timePtr(now.Add(-3*time.Minute - 59*time.Second)), true},
		{"used 4 minutes ago (boundary)", timePtr(now.Add(-4 * time.Minute)), false},
		{"used 5 minutes ago", timePtr(now.Add(-5 * time.Minute)), false},
		{"used 1 hour ago", timePtr(now.Add(-1 * time.Hour)), false},
		{"used just now", timePtr(now), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := &OpenHandsKey{
				ID:         "test-key",
				LastUsedAt: tt.lastUsedAt,
			}

			isActive := sc.isKeyActive(key, now)
			if isActive != tt.isActive {
				t.Errorf("isKeyActive() = %v, want %v", isActive, tt.isActive)
			}
		})
	}
}

func TestShouldCheckKeyFixedInterval(t *testing.T) {
	now := time.Now()

	sc := &SpendChecker{
		baseCheckInterval: SpendCheckInterval,
		threshold:         DefaultSpendThreshold,
	}

	tests := []struct {
		name           string
		totalSpend     float64
		lastSpendCheck *time.Time
		shouldCheck    bool
		description    string
	}{
		// Never checked - always check
		{"never checked, low spend", 2.0, nil, true, "first check should always happen"},
		{"never checked, high spend", 9.0, nil, true, "first check should always happen"},

		// Fixed 10s interval for ALL spend levels
		{"any spend, checked 9s ago", 5.0, timePtr(now.Add(-9 * time.Second)), false, "should skip - 10s interval not elapsed"},
		{"any spend, checked 10s ago", 5.0, timePtr(now.Add(-10 * time.Second)), true, "should check - 10s interval elapsed"},
		{"any spend, checked 11s ago", 9.5, timePtr(now.Add(-11 * time.Second)), true, "should check - past 10s"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := &OpenHandsKey{
				ID:             "test-key",
				TotalSpend:     tt.totalSpend,
				LastSpendCheck: tt.lastSpendCheck,
			}

			// Note: isActive parameter is now ignored in the new implementation
			shouldCheck := sc.shouldCheckKey(key, false, now)
			if shouldCheck != tt.shouldCheck {
				t.Errorf("shouldCheckKey(spend=%.2f) = %v, want %v (%s)",
					tt.totalSpend, shouldCheck, tt.shouldCheck, tt.description)
			}
		})
	}
}

func TestGetCheckIntervalForSpend(t *testing.T) {
	sc := &SpendChecker{
		baseCheckInterval: SpendCheckInterval,
		threshold:         DefaultSpendThreshold,
	}

	tests := []struct {
		name             string
		spend            float64
		expectedInterval time.Duration
	}{
		// Fixed 10s interval for all spend levels
		{"zero spend", 0.0, SpendCheckInterval},
		{"$5 spend", 5.0, SpendCheckInterval},
		{"$9 spend", 9.0, SpendCheckInterval},
		{"$10 spend", 10.0, SpendCheckInterval},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			interval := sc.getCheckIntervalForSpend(tt.spend)
			if interval != tt.expectedInterval {
				t.Errorf("getCheckIntervalForSpend(%.2f) = %v, want %v",
					tt.spend, interval, tt.expectedInterval)
			}
		})
	}
}

func TestGetSpendTierName(t *testing.T) {
	sc := &SpendChecker{
		baseCheckInterval: SpendCheckInterval,
		threshold:         DefaultSpendThreshold, // 10.0
	}

	// Tier boundaries based on percentage of threshold (10.0):
	// - LOW: < 50% (< $5.00)
	// - MEDIUM: 50% - 85% ($5.00 - $8.50)
	// - HIGH: 85% - 94% ($8.50 - $9.40)
	// - CRITICAL: >= 94% (>= $9.40)
	tests := []struct {
		name         string
		spend        float64
		expectedTier string
	}{
		{"zero spend", 0.0, "LOW"},
		{"$3 spend (30%)", 3.0, "LOW"},
		{"$4.99 spend (just under 50%)", 4.99, "LOW"},
		{"$5.00 spend (50%)", 5.00, "MEDIUM"},
		{"$6 spend (60%)", 6.0, "MEDIUM"},
		{"$8.49 spend (just under 85%)", 8.49, "MEDIUM"},
		{"$8.50 spend (85%)", 8.50, "HIGH"},
		{"$9 spend (90%)", 9.0, "HIGH"},
		{"$9.39 spend (just under 94%)", 9.39, "HIGH"},
		{"$9.40 spend (94%)", 9.40, "CRITICAL"},
		{"$9.8 spend (98%)", 9.8, "CRITICAL"},
		{"$10 spend (>100%)", 10.0, "CRITICAL"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tier := sc.getSpendTierName(tt.spend)
			if tier != tt.expectedTier {
				t.Errorf("getSpendTierName(%.2f) = %v, want %v",
					tt.spend, tier, tt.expectedTier)
			}
		})
	}
}

func TestMaskAPIKey(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		expected string
	}{
		{"standard key", "sk-abcdefghijklmnop", "sk-ab...mnop"},
		{"short key", "short", "short"},
		{"exactly 12 chars", "123456789012", "123456789012"},
		{"13 chars", "1234567890123", "12345...0123"},
		{"empty string", "", ""},
		{"very long key", "sk-abcdefghijklmnopqrstuvwxyz1234567890", "sk-ab...7890"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			masked := maskAPIKey(tt.apiKey)
			if masked != tt.expected {
				t.Errorf("maskAPIKey(%q) = %q, want %q", tt.apiKey, masked, tt.expected)
			}
		})
	}
}

func TestSpendCheckResultFields(t *testing.T) {
	now := time.Now()

	result := SpendCheckResult{
		KeyID:     "key-123",
		APIKey:    "sk-secret",
		Spend:     7.50,
		Threshold: 9.8,
		WasActive: true,
		CheckedAt: now,
		Error:     nil,
	}

	if result.KeyID != "key-123" {
		t.Errorf("KeyID = %v, want key-123", result.KeyID)
	}
	if result.Spend != 7.50 {
		t.Errorf("Spend = %v, want 7.50", result.Spend)
	}
	if result.Threshold != 9.8 {
		t.Errorf("Threshold = %v, want 9.8", result.Threshold)
	}
	if !result.WasActive {
		t.Errorf("WasActive = %v, want true", result.WasActive)
	}
	if result.Error != nil {
		t.Errorf("Error = %v, want nil", result.Error)
	}
}

func TestNewSpendChecker(t *testing.T) {
	provider := &OpenHandsProvider{}
	threshold := 8.5
	activeInterval := 15 * time.Second
	idleInterval := 30 * time.Minute

	sc := NewSpendChecker(provider, threshold, activeInterval, idleInterval)

	if sc.provider != provider {
		t.Error("provider not set correctly")
	}
	if sc.threshold != threshold {
		t.Errorf("threshold = %v, want %v", sc.threshold, threshold)
	}
	// Note: activeInterval and idleInterval are now ignored - using fixed 10s interval
	// baseCheckInterval should be SpendCheckInterval (10s)
	if sc.baseCheckInterval != SpendCheckInterval {
		t.Errorf("baseCheckInterval = %v, want %v (SpendCheckInterval)", sc.baseCheckInterval, SpendCheckInterval)
	}
	if sc.running {
		t.Error("should not be running initially")
	}
	if sc.stopChan == nil {
		t.Error("stopChan should be initialized")
	}
}

func TestSpendCheckerStats(t *testing.T) {
	provider := &OpenHandsProvider{
		keys: []*OpenHandsKey{
			{ID: "key-1", Status: OpenHandsStatusHealthy, TotalSpend: 5.0},
			{ID: "key-2", Status: OpenHandsStatusHealthy, TotalSpend: 8.0},
			{ID: "key-3", Status: OpenHandsStatusExhausted, TotalSpend: 10.0},
		},
	}

	sc := NewSpendChecker(provider, 9.8, 10*time.Second, 1*time.Hour)

	// Not running - should return basic stats
	stats := sc.GetStats()
	if stats.Running {
		t.Error("should not be running")
	}
	if stats.Threshold != 9.8 {
		t.Errorf("Threshold = %v, want 9.8", stats.Threshold)
	}

	// Simulate running state
	sc.mu.Lock()
	sc.running = true
	sc.mu.Unlock()

	stats = sc.GetStats()
	if !stats.Running {
		t.Error("should be running")
	}
	if stats.KeysMonitored != 3 {
		t.Errorf("KeysMonitored = %v, want 3", stats.KeysMonitored)
	}
	// Should only have 2 healthy keys in stats
	if len(stats.KeyStats) != 2 {
		t.Errorf("len(KeyStats) = %v, want 2 (healthy only)", len(stats.KeyStats))
	}
}
