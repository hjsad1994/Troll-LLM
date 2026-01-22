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
		{"DefaultSpendThreshold", DefaultSpendThreshold, 9.8},
		{"DefaultActiveCheckInterval", DefaultActiveCheckInterval, 10 * time.Second},
		{"DefaultIdleCheckInterval", DefaultIdleCheckInterval, 1 * time.Hour},
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
		activeCheckInterval: DefaultActiveCheckInterval,
		idleCheckInterval:   DefaultIdleCheckInterval,
		threshold:           DefaultSpendThreshold,
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

func TestShouldCheckKeyIntervals(t *testing.T) {
	now := time.Now()

	sc := &SpendChecker{
		activeCheckInterval: 10 * time.Second,
		idleCheckInterval:   1 * time.Hour,
		threshold:           DefaultSpendThreshold,
	}

	tests := []struct {
		name           string
		lastSpendCheck *time.Time
		isActive       bool
		shouldCheck    bool
	}{
		{"never checked, active", nil, true, true},
		{"never checked, idle", nil, false, true},
		{"active, checked 5s ago", timePtr(now.Add(-5 * time.Second)), true, false},
		{"active, checked 10s ago", timePtr(now.Add(-10 * time.Second)), true, true},
		{"active, checked 15s ago", timePtr(now.Add(-15 * time.Second)), true, true},
		{"idle, checked 30m ago", timePtr(now.Add(-30 * time.Minute)), false, false},
		{"idle, checked 59m ago", timePtr(now.Add(-59 * time.Minute)), false, false},
		{"idle, checked 1h ago", timePtr(now.Add(-1 * time.Hour)), false, true},
		{"idle, checked 2h ago", timePtr(now.Add(-2 * time.Hour)), false, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := &OpenHandsKey{
				ID:             "test-key",
				LastSpendCheck: tt.lastSpendCheck,
			}

			shouldCheck := sc.shouldCheckKey(key, tt.isActive, now)
			if shouldCheck != tt.shouldCheck {
				t.Errorf("shouldCheckKey(isActive=%v) = %v, want %v",
					tt.isActive, shouldCheck, tt.shouldCheck)
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
	if sc.activeCheckInterval != activeInterval {
		t.Errorf("activeCheckInterval = %v, want %v", sc.activeCheckInterval, activeInterval)
	}
	if sc.idleCheckInterval != idleInterval {
		t.Errorf("idleCheckInterval = %v, want %v", sc.idleCheckInterval, idleInterval)
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
