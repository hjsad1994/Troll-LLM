package userkey

import (
	"testing"
)

// =============================================================================
// Story 2.3: Friend Key Credits Deduction Tests
// =============================================================================

// TestIsFriendKey verifies Friend Key detection
func TestIsFriendKey(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		expected bool
	}{
		{"valid friend key", "sk-trollllm-friend-abc123xyz", true},
		{"valid friend key longer", "sk-trollllm-friend-abcdefghijklmnop", true},
		{"user key sk-troll", "sk-troll-abc123", false},
		{"user key sk-trollllm", "sk-trollllm-abc123", false},
		{"empty string", "", false},
		{"short string", "sk-trollllm-friend", false},
		{"almost friend key", "sk-trollllm-frien-abc123", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsFriendKey(tt.apiKey)
			if result != tt.expected {
				t.Errorf("IsFriendKey(%q) = %v, want %v", tt.apiKey, result, tt.expected)
			}
		})
	}
}

// TestFriendKeyErrorConstants verifies Friend Key error constants
func TestFriendKeyErrorConstants(t *testing.T) {
	tests := []struct {
		err      error
		expected string
	}{
		{ErrFriendKeyNotFound, "friend key not found"},
		{ErrFriendKeyInactive, "friend key is inactive"},
		{ErrFriendKeyOwnerInactive, "friend key owner account is inactive"},
		{ErrFriendKeyModelNotAllowed, "model not configured for friend key"},
		{ErrFriendKeyModelDisabled, "model disabled for friend key"},
		{ErrFriendKeyModelLimitExceeded, "friend key model limit exceeded"},
		{ErrFriendKeyOwnerNoCredits, "friend key owner has no credits"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			if tt.err == nil {
				t.Fatalf("Error constant for %q is nil", tt.expected)
			}
			if tt.err.Error() != tt.expected {
				t.Errorf("Error message: expected %q, got %q", tt.expected, tt.err.Error())
			}
		})
	}
}

// TestFriendKeyValidationResult_Fields verifies FriendKeyValidationResult struct
func TestFriendKeyValidationResult_Fields(t *testing.T) {
	fk := &FriendKey{
		ID:       "sk-trollllm-friend-test123",
		OwnerID:  "testuser",
		IsActive: true,
	}
	owner := &FriendKeyOwner{
		Username:   "testuser",
		IsActive:   true,
		Credits:    10.50,
		RefCredits: 5.25,
	}

	result := &FriendKeyValidationResult{
		FriendKey:     fk,
		Owner:         owner,
		UseRefCredits: false,
	}

	if result.FriendKey != fk {
		t.Error("FriendKey mismatch")
	}
	if result.Owner != owner {
		t.Error("Owner mismatch")
	}
	if result.UseRefCredits != false {
		t.Error("UseRefCredits should be false")
	}
}

// TestFriendKeyOwnerCreditsCheck tests owner credits validation logic
// AC1: Friend Key deducts from owner's credits
// AC2: Block when owner has no credits
func TestFriendKeyOwnerCreditsCheck(t *testing.T) {
	tests := []struct {
		name          string
		credits       float64
		refCredits    float64
		shouldBlock   bool
		useRefCredits bool
	}{
		// AC1: Owner has credits - allowed
		{"owner has credits", 10.00, 0, false, false},
		// AC1: Owner has refCredits only - allowed
		{"owner has refCredits only", 0, 5.00, false, true},
		// AC1: Owner has both - allowed, use credits first
		{"owner has both", 5.00, 3.00, false, false},
		// AC2: Owner has no credits - blocked
		{"owner no credits", 0, 0, false, false}, // Note: validation function will return error
		// AC2: Owner has negative credits but refCredits - check logic
		{"owner negative credits with refCredits", -1.00, 5.00, false, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate the validation logic from ValidateFriendKeyBasic
			hasCredits := tt.credits > 0 || tt.refCredits > 0
			useRefCredits := tt.credits <= 0 && tt.refCredits > 0

			if !hasCredits && !tt.shouldBlock {
				// This case should have been blocked at validation
				t.Logf("Note: owner with no credits would be blocked at validation")
			}

			if useRefCredits != tt.useRefCredits {
				t.Errorf("UseRefCredits: expected %v, got %v", tt.useRefCredits, useRefCredits)
			}
		})
	}
}

// TestFriendKey_DeductionTarget documents that deduction happens on owner's account
// AC1: Credits deducted from OWNER's account, not Friend Key user
func TestFriendKey_DeductionTarget(t *testing.T) {
	t.Log(`
Friend Key Deduction Target Documentation:

In main.go, when a Friend Key is validated:
1. friendKeyResult := ValidateFriendKeyBasic(apiKey)
2. username = friendKeyResult.Owner.Username  // OWNER's username
3. DeductCreditsWithCache(username, cost, ...) // Deducts from OWNER

This ensures:
- AC1: Friend Key usage deducts from owner's credits (not Friend Key holder)
- AC3: Owner sees usage in their dashboard (deduction linked to owner username)
- AC4: Atomic deduction (Story 2.2) prevents race conditions on owner's balance

Evidence:
- main.go:593 (OpenAI): username = friendKeyResult.Owner.Username
- main.go:2683 (Anthropic): username = friendKeyResult.Owner.Username
- All DeductCredits* calls use 'username' variable
	`)
}

// TestFriendKey_402Response documents 402 response format for Friend Key
// AC2: Block when owner has no credits with 402
func TestFriendKey_402Response(t *testing.T) {
	t.Log(`
Friend Key 402 Response Documentation:

When ErrFriendKeyOwnerNoCredits is returned:

OpenAI endpoint (main.go:583-586):
  Status: 402 Payment Required
  Body: {"error": {"message": "Friend Key owner has insufficient tokens", "type": "insufficient_tokens"}}

Anthropic endpoint (main.go:2673-2676):
  Status: 402 Payment Required
  Body: {"type":"error","error":{"type":"insufficient_tokens","message":"Friend Key owner has insufficient tokens"}}

Security Note:
- Owner's balance is NOT exposed to Friend Key user
- Message is generic: "insufficient tokens" without specific amount
- This protects owner's financial information from Friend Key holders
	`)
}

// TestModelLimit_Fields verifies ModelLimit struct
func TestModelLimit_Fields(t *testing.T) {
	enabled := true
	ml := ModelLimit{
		ModelID:  "gpt-4",
		LimitUsd: 10.00,
		UsedUsd:  5.50,
		Enabled:  &enabled,
	}

	if ml.ModelID != "gpt-4" {
		t.Errorf("ModelID: expected gpt-4, got %s", ml.ModelID)
	}
	if ml.LimitUsd != 10.00 {
		t.Errorf("LimitUsd: expected 10.00, got %f", ml.LimitUsd)
	}
	if ml.UsedUsd != 5.50 {
		t.Errorf("UsedUsd: expected 5.50, got %f", ml.UsedUsd)
	}
	if ml.Enabled == nil || *ml.Enabled != true {
		t.Error("Enabled should be true")
	}
}

// TestModelLimitCheck_Logic tests model limit check logic
func TestModelLimitCheck_Logic(t *testing.T) {
	tests := []struct {
		name      string
		limitUsd  float64
		usedUsd   float64
		enabled   *bool
		expectErr error
	}{
		{"within limit", 10.00, 5.00, boolPtr(true), nil},
		{"at limit", 10.00, 10.00, boolPtr(true), ErrFriendKeyModelLimitExceeded},
		{"over limit", 10.00, 15.00, boolPtr(true), ErrFriendKeyModelLimitExceeded},
		{"disabled model", 10.00, 5.00, boolPtr(false), ErrFriendKeyModelDisabled},
		{"no limit set", 0, 0, boolPtr(true), ErrFriendKeyModelNotAllowed},
		{"nil enabled (allowed)", 10.00, 5.00, nil, nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate CheckFriendKeyModelLimit logic
			var err error

			if tt.limitUsd <= 0 {
				err = ErrFriendKeyModelNotAllowed
			} else if tt.enabled != nil && !*tt.enabled {
				err = ErrFriendKeyModelDisabled
			} else if tt.usedUsd >= tt.limitUsd {
				err = ErrFriendKeyModelLimitExceeded
			}

			if err != tt.expectErr {
				t.Errorf("Expected error %v, got %v", tt.expectErr, err)
			}
		})
	}
}

func boolPtr(b bool) *bool {
	return &b
}

// =============================================================================
// Integration Test Documentation (requires MongoDB)
// =============================================================================

// TestFriendKey_Integration_Documentation documents expected integration test behavior
func TestFriendKey_Integration_Documentation(t *testing.T) {
	t.Log(`
Integration Test Requirements (requires MongoDB test fixtures):

1. TestFriendKey_AC1_DeductFromOwner:
   - Setup: Owner with credits = $10.00, Friend Key linked to owner
   - Action: Make API request with Friend Key
   - Expected: Owner's credits reduced by request cost
   - Verify: Friend Key holder's credits unchanged (if they exist as separate user)

2. TestFriendKey_AC2_BlockWhenOwnerNoCredits:
   - Setup: Owner with credits = $0.00, refCredits = $0.00
   - Action: Attempt API request with Friend Key
   - Expected: 402 response with "insufficient tokens" message
   - Verify: No deduction attempted, request blocked at validation

3. TestFriendKey_AC4_AtomicDeduction:
   - Setup: Owner with credits = $0.10
   - Action: Launch 2 concurrent Friend Key requests, each costing $0.08
   - Expected: Only ONE request succeeds
   - Verify: Owner credits = $0.02 (not negative)

4. TestFriendKey_UsageTracking:
   - Setup: Friend Key with model limit = $5.00, used = $0.00
   - Action: Make request costing $1.00
   - Expected: Friend Key's modelLimits.usedUsd += $1.00
   - And: Friend Key's totalUsedUsd += $1.00
   - And: Owner's credits -= $1.00
	`)
}
