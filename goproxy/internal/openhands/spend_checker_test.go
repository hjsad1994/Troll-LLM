package openhands

import (
	"testing"
	"time"
)

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
		{"DefaultSpendThreshold", DefaultSpendThreshold, 9.95},
		{"SpendCheckInterval", SpendCheckInterval, 2 * time.Second},
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
		name         string
		spend        float64
		threshold    float64
		shouldRotate bool
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
			// The rotation logic: spend >= threshold
			shouldRotate := tt.spend >= tt.threshold
			if shouldRotate != tt.shouldRotate {
				t.Errorf("spend %.2f >= threshold %.2f = %v, want %v",
					tt.spend, tt.threshold, shouldRotate, tt.shouldRotate)
			}
		})
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

		// Fixed 2s interval for ALL spend levels
		{"any spend, checked 1s ago", 5.0, timePtr(now.Add(-1 * time.Second)), false, "should skip - 2s interval not elapsed"},
		{"any spend, checked 2s ago", 5.0, timePtr(now.Add(-2 * time.Second)), true, "should check - 2s interval elapsed"},
		{"any spend, checked 3s ago", 9.5, timePtr(now.Add(-3 * time.Second)), true, "should check - well past 2s"},
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
		// Fixed 2s interval for all spend levels
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
		threshold:         DefaultSpendThreshold, // 9.95
	}

	// Tier boundaries based on percentage of threshold (9.95):
	// - LOW: < 50% (< $4.975)
	// - MEDIUM: 50% - 85% ($4.975 - $8.4575)
	// - HIGH: 85% - 94% ($8.4575 - $9.353)
	// - CRITICAL: >= 94% (>= $9.353)
	tests := []struct {
		name         string
		spend        float64
		expectedTier string
	}{
		{"zero spend", 0.0, "LOW"},
		{"$3 spend (30%)", 3.0, "LOW"},
		{"$4.97 spend (just under 50%)", 4.97, "LOW"},
		{"$4.98 spend (50%)", 4.98, "MEDIUM"},
		{"$6 spend (60%)", 6.0, "MEDIUM"},
		{"$8.45 spend (just under 85%)", 8.45, "MEDIUM"},
		{"$8.46 spend (85%)", 8.46, "HIGH"},
		{"$9 spend (90%)", 9.0, "HIGH"},
		{"$9.35 spend (just under 94%)", 9.35, "HIGH"},
		{"$9.36 spend (94%)", 9.36, "CRITICAL"},
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
	// Note: activeInterval and idleInterval are now ignored - using fixed 2s interval
	// baseCheckInterval should be SpendCheckInterval (2s)
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
