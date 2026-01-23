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
		{"HighSpendThreshold", HighSpendThreshold, 7.0},
		{"MediumSpendThreshold", MediumSpendThreshold, 5.0},
		{"HighSpendCheckInterval", HighSpendCheckInterval, 10 * time.Second},
		{"MediumSpendCheckInterval", MediumSpendCheckInterval, 2 * time.Minute},
		{"LowSpendCheckInterval", LowSpendCheckInterval, 5 * time.Minute},
		{"ActiveKeyWindow", ActiveKeyWindow, 4 * time.Minute},
		{"SpendHistoryCollection", SpendHistoryCollection, "openhands_key_spend_history"},
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
		baseCheckInterval: HighSpendCheckInterval,
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

func TestShouldCheckKeyTieredIntervals(t *testing.T) {
	now := time.Now()

	sc := &SpendChecker{
		baseCheckInterval: HighSpendCheckInterval,
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
		{"never checked, medium spend", 6.0, nil, true, "first check should always happen"},
		{"never checked, high spend", 8.0, nil, true, "first check should always happen"},

		// LOW tier (spend < $5) - check every 5 minutes
		{"low spend, checked 1m ago", 2.0, timePtr(now.Add(-1 * time.Minute)), false, "should skip - 5m interval not elapsed"},
		{"low spend, checked 4m ago", 4.0, timePtr(now.Add(-4 * time.Minute)), false, "should skip - 5m interval not elapsed"},
		{"low spend, checked 5m ago", 3.0, timePtr(now.Add(-5 * time.Minute)), true, "should check - 5m interval elapsed"},
		{"low spend, checked 10m ago", 1.0, timePtr(now.Add(-10 * time.Minute)), true, "should check - well past 5m"},

		// MEDIUM tier ($5 <= spend < $7) - check every 2 minutes
		{"medium spend, checked 1m ago", 5.5, timePtr(now.Add(-1 * time.Minute)), false, "should skip - 2m interval not elapsed"},
		{"medium spend, checked 1m30s ago", 6.0, timePtr(now.Add(-90 * time.Second)), false, "should skip - 2m interval not elapsed"},
		{"medium spend, checked 2m ago", 5.0, timePtr(now.Add(-2 * time.Minute)), true, "should check - 2m interval elapsed"},
		{"medium spend, checked 3m ago", 6.5, timePtr(now.Add(-3 * time.Minute)), true, "should check - well past 2m"},

		// HIGH tier (spend >= $7) - check every 10 seconds
		{"high spend, checked 5s ago", 8.0, timePtr(now.Add(-5 * time.Second)), false, "should skip - 10s interval not elapsed"},
		{"high spend, checked 9s ago", 9.0, timePtr(now.Add(-9 * time.Second)), false, "should skip - 10s interval not elapsed"},
		{"high spend, checked 10s ago", 7.0, timePtr(now.Add(-10 * time.Second)), true, "should check - 10s interval elapsed"},
		{"high spend, checked 30s ago", 9.5, timePtr(now.Add(-30 * time.Second)), true, "should check - well past 10s"},

		// Boundary tests
		{"exactly $5 spend (medium tier boundary)", 5.0, timePtr(now.Add(-2 * time.Minute)), true, "exactly $5 = medium tier"},
		{"exactly $7 spend (high tier boundary)", 7.0, timePtr(now.Add(-10 * time.Second)), true, "exactly $7 = high tier"},
		{"just under $5 (low tier)", 4.99, timePtr(now.Add(-2 * time.Minute)), false, "4.99 = low tier, needs 5m"},
		{"just under $7 (medium tier)", 6.99, timePtr(now.Add(-10 * time.Second)), false, "6.99 = medium tier, needs 2m"},
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
		baseCheckInterval: HighSpendCheckInterval,
		threshold:         DefaultSpendThreshold,
	}

	tests := []struct {
		name             string
		spend            float64
		expectedInterval time.Duration
	}{
		// Low tier (< $5)
		{"zero spend", 0.0, LowSpendCheckInterval},
		{"$1 spend", 1.0, LowSpendCheckInterval},
		{"$4.99 spend", 4.99, LowSpendCheckInterval},

		// Medium tier ($5 - $7)
		{"exactly $5", 5.0, MediumSpendCheckInterval},
		{"$6 spend", 6.0, MediumSpendCheckInterval},
		{"$6.99 spend", 6.99, MediumSpendCheckInterval},

		// High tier (>= $7)
		{"exactly $7", 7.0, HighSpendCheckInterval},
		{"$8 spend", 8.0, HighSpendCheckInterval},
		{"$9.5 spend", 9.5, HighSpendCheckInterval},
		{"$15 spend (above threshold)", 15.0, HighSpendCheckInterval},
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
		baseCheckInterval: HighSpendCheckInterval,
		threshold:         DefaultSpendThreshold,
	}

	tests := []struct {
		name         string
		spend        float64
		expectedTier string
	}{
		{"zero spend", 0.0, "LOW"},
		{"$3 spend", 3.0, "LOW"},
		{"$4.99 spend", 4.99, "LOW"},
		{"exactly $5", 5.0, "MEDIUM"},
		{"$6 spend", 6.0, "MEDIUM"},
		{"$6.99 spend", 6.99, "MEDIUM"},
		{"exactly $7", 7.0, "HIGH"},
		{"$8 spend", 8.0, "HIGH"},
		{"$10 spend", 10.0, "HIGH"},
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

func TestSpendHistoryEntryFields(t *testing.T) {
	now := time.Now()
	rotatedAt := now.Add(1 * time.Second)

	entry := SpendHistoryEntry{
		KeyID:          "key-123",
		APIKeyMasked:   "sk-ab...1234",
		Spend:          9.85,
		Threshold:      9.8,
		CheckedAt:      now,
		WasActive:      true,
		RotatedAt:      &rotatedAt,
		RotationReason: "proactive_threshold_9.85",
		NewKeyID:       "key-456",
	}

	if entry.KeyID != "key-123" {
		t.Errorf("KeyID = %v, want key-123", entry.KeyID)
	}
	if entry.APIKeyMasked != "sk-ab...1234" {
		t.Errorf("APIKeyMasked = %v, want sk-ab...1234", entry.APIKeyMasked)
	}
	if entry.Spend != 9.85 {
		t.Errorf("Spend = %v, want 9.85", entry.Spend)
	}
	if entry.Threshold != 9.8 {
		t.Errorf("Threshold = %v, want 9.8", entry.Threshold)
	}
	if !entry.WasActive {
		t.Errorf("WasActive = %v, want true", entry.WasActive)
	}
	if entry.RotatedAt == nil || !entry.RotatedAt.Equal(rotatedAt) {
		t.Errorf("RotatedAt = %v, want %v", entry.RotatedAt, rotatedAt)
	}
	if entry.RotationReason != "proactive_threshold_9.85" {
		t.Errorf("RotationReason = %v, want proactive_threshold_9.85", entry.RotationReason)
	}
	if entry.NewKeyID != "key-456" {
		t.Errorf("NewKeyID = %v, want key-456", entry.NewKeyID)
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
	// Note: activeInterval and idleInterval are now ignored - using tiered intervals instead
	if sc.baseCheckInterval != HighSpendCheckInterval {
		t.Errorf("baseCheckInterval = %v, want %v (HighSpendCheckInterval)", sc.baseCheckInterval, HighSpendCheckInterval)
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
