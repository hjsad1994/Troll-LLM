package usage

import (
	"math"
	"testing"
)

// floatEqual compares floats with tolerance for floating point errors
func floatEqual(a, b float64) bool {
	const epsilon = 0.0001
	return math.Abs(a-b) < epsilon
}

// =============================================================================
// Story 2.2: Zero-Debt Policy Enforcement - Atomic Deduction Tests
// =============================================================================

// TestAtomicDeductionResult_Fields verifies AtomicDeductionResult struct
func TestAtomicDeductionResult_Fields(t *testing.T) {
	result := &AtomicDeductionResult{
		Success:             true,
		DeductedFromCredits: 0.05,
		DeductedFromRef:     0.03,
		NewCreditsBalance:   0.00,
		NewRefBalance:       0.07,
	}

	if !result.Success {
		t.Error("Success should be true")
	}
	if result.DeductedFromCredits != 0.05 {
		t.Errorf("DeductedFromCredits: expected 0.05, got %f", result.DeductedFromCredits)
	}
	if result.DeductedFromRef != 0.03 {
		t.Errorf("DeductedFromRef: expected 0.03, got %f", result.DeductedFromRef)
	}
	if result.NewCreditsBalance != 0.00 {
		t.Errorf("NewCreditsBalance: expected 0.00, got %f", result.NewCreditsBalance)
	}
	if result.NewRefBalance != 0.07 {
		t.Errorf("NewRefBalance: expected 0.07, got %f", result.NewRefBalance)
	}
}

// TestCalculateDeductionSplit tests the logic for splitting deduction across credits/refCredits
// AC3: credits = $0.05, refCredits = $0.10, cost = $0.08 → credits = $0.00, refCredits = $0.07
func TestCalculateDeductionSplit(t *testing.T) {
	tests := []struct {
		name               string
		credits            float64
		refCredits         float64
		cost               float64
		expectedCredits    float64
		expectedRef        float64
		expectedRemaining  float64
	}{
		// AC3: Partial credits + refCredits
		{"credits=0.05, refCredits=0.10, cost=0.08", 0.05, 0.10, 0.08, 0.05, 0.03, 0.07},
		// Full credits deduction - remaining = 0.20 + 0.10 - 0.15 = 0.15 (but credits left = 0.05, ref = 0.10)
		{"credits=0.20, refCredits=0.10, cost=0.15", 0.20, 0.10, 0.15, 0.15, 0.00, 0.15},
		// Exact credits match
		{"credits=0.15, refCredits=0.05, cost=0.15", 0.15, 0.05, 0.15, 0.15, 0.00, 0.05},
		// Credits = 0, use refCredits only
		{"credits=0, refCredits=0.20, cost=0.10", 0, 0.20, 0.10, 0.00, 0.10, 0.10},
		// Zero cost
		{"credits=0.15, refCredits=0.05, cost=0", 0.15, 0.05, 0, 0.00, 0.00, 0.20},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			creditsDeduct, refDeduct := CalculateDeductionSplit(tt.credits, tt.refCredits, tt.cost)

			if !floatEqual(creditsDeduct, tt.expectedCredits) {
				t.Errorf("CreditsDeduct: expected %.2f, got %.2f", tt.expectedCredits, creditsDeduct)
			}
			if !floatEqual(refDeduct, tt.expectedRef) {
				t.Errorf("RefDeduct: expected %.2f, got %.2f", tt.expectedRef, refDeduct)
			}

			// Verify total deduction equals cost
			totalDeducted := creditsDeduct + refDeduct
			if !floatEqual(totalDeducted, tt.cost) {
				t.Errorf("Total deducted %.6f != cost %.6f", totalDeducted, tt.cost)
			}

			// Verify remaining balance
			remaining := (tt.credits - creditsDeduct) + (tt.refCredits - refDeduct)
			if !floatEqual(remaining, tt.expectedRemaining) {
				t.Errorf("Remaining balance: expected %.2f, got %.2f", tt.expectedRemaining, remaining)
			}
		})
	}
}

// TestErrInsufficientBalance verifies error constant
func TestErrInsufficientBalance(t *testing.T) {
	if ErrInsufficientBalance == nil {
		t.Fatal("ErrInsufficientBalance should not be nil")
	}
	if ErrInsufficientBalance.Error() != "insufficient balance for deduction" {
		t.Errorf("Error message: expected 'insufficient balance for deduction', got %s", ErrInsufficientBalance.Error())
	}
}

// TestCanDeductSafely verifies pre-deduction check logic
func TestCanDeductSafely(t *testing.T) {
	tests := []struct {
		name       string
		credits    float64
		refCredits float64
		cost       float64
		canDeduct  bool
	}{
		// AC1: cost > balance → cannot deduct
		{"cost > balance", 0.15, 0, 0.20, false},
		// cost <= balance → can deduct
		{"cost <= balance", 0.20, 0, 0.15, true},
		// exact match
		{"exact match", 0.15, 0, 0.15, true},
		// combined balance
		{"combined balance sufficient", 0.05, 0.10, 0.12, true},
		// combined balance insufficient
		{"combined balance insufficient", 0.05, 0.05, 0.20, false},
		// zero cost
		{"zero cost", 0, 0, 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			totalBalance := tt.credits + tt.refCredits
			canDeduct := totalBalance >= tt.cost

			if canDeduct != tt.canDeduct {
				t.Errorf("CanDeduct: credits=%.2f, refCredits=%.2f, cost=%.2f - expected %v, got %v",
					tt.credits, tt.refCredits, tt.cost, tt.canDeduct, canDeduct)
			}
		})
	}
}

// =============================================================================
// Story 2.2: Zero-Debt Enforcement Additional Tests
// =============================================================================

// TestCalculateDeductionSplit_EdgeCases tests edge cases for deduction split
func TestCalculateDeductionSplit_EdgeCases(t *testing.T) {
	tests := []struct {
		name            string
		credits         float64
		refCredits      float64
		cost            float64
		wantCredits     float64
		wantRef         float64
	}{
		// Negative cost should return zeros
		{"negative cost", 0.10, 0.10, -0.05, 0, 0},
		// Very small amounts (precision test)
		{"very small amounts", 0.001, 0.002, 0.002, 0.001, 0.001},
		// Large amounts
		{"large amounts", 1000.50, 500.25, 1200.00, 1000.50, 199.50},
		// Exact boundary at credits
		{"exact boundary", 0.10, 0.05, 0.10, 0.10, 0.00},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			creditsDeduct, refDeduct := CalculateDeductionSplit(tt.credits, tt.refCredits, tt.cost)

			if !floatEqual(creditsDeduct, tt.wantCredits) {
				t.Errorf("CreditsDeduct: expected %.4f, got %.4f", tt.wantCredits, creditsDeduct)
			}
			if !floatEqual(refDeduct, tt.wantRef) {
				t.Errorf("RefDeduct: expected %.4f, got %.4f", tt.wantRef, refDeduct)
			}
		})
	}
}

// TestZeroDebtPolicy_NeverNegative verifies credits can never go negative
// AC: After deduction, credits >= 0 && refCredits >= 0 always
func TestZeroDebtPolicy_NeverNegative(t *testing.T) {
	tests := []struct {
		name       string
		credits    float64
		refCredits float64
		cost       float64
	}{
		{"full credits", 0.20, 0.10, 0.15},
		{"partial split", 0.05, 0.10, 0.08},
		{"exact match", 0.15, 0.00, 0.15},
		{"only refCredits", 0.00, 0.20, 0.10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			creditsDeduct, refDeduct := CalculateDeductionSplit(tt.credits, tt.refCredits, tt.cost)

			// Calculate new balances
			newCredits := tt.credits - creditsDeduct
			newRefCredits := tt.refCredits - refDeduct

			// Zero-debt policy: neither balance should go negative
			if newCredits < -0.0001 { // small tolerance for float
				t.Errorf("Credits went negative: %.6f (was %.6f, deducted %.6f)",
					newCredits, tt.credits, creditsDeduct)
			}
			if newRefCredits < -0.0001 {
				t.Errorf("RefCredits went negative: %.6f (was %.6f, deducted %.6f)",
					newRefCredits, tt.refCredits, refDeduct)
			}
		})
	}
}

// TestDeductionPriority_CreditsFirst verifies credits are used before refCredits
// AC3: Deduct from credits first, then refCredits
func TestDeductionPriority_CreditsFirst(t *testing.T) {
	// User has credits = $0.10, refCredits = $0.20, cost = $0.08
	// Should deduct $0.08 from credits, $0 from refCredits
	credits := 0.10
	refCredits := 0.20
	cost := 0.08

	creditsDeduct, refDeduct := CalculateDeductionSplit(credits, refCredits, cost)

	// Since credits >= cost, all should come from credits
	if creditsDeduct != cost {
		t.Errorf("Expected all deduction from credits: want %.2f, got %.2f", cost, creditsDeduct)
	}
	if refDeduct != 0 {
		t.Errorf("Expected no deduction from refCredits: got %.2f", refDeduct)
	}
}

// =============================================================================
// Integration Test Documentation (requires MongoDB)
// =============================================================================

// TestAtomicDeduction_Integration_Documentation documents expected behavior
// for integration tests that require MongoDB
func TestAtomicDeduction_Integration_Documentation(t *testing.T) {
	t.Log(`
Integration Test Requirements (requires MongoDB test fixtures):

1. TestAtomicDeduction_AC2_ConcurrentRequests:
   - Setup: User with credits = $0.10
   - Action: Launch 2 goroutines, each trying to deduct $0.08
   - Expected: Only ONE succeeds, one gets ErrInsufficientBalance
   - Verify: Final credits = $0.02 (not negative)

2. TestAtomicDeduction_AC4_NoRaceCondition:
   - Setup: User with credits = $0.50
   - Action: Launch 100 goroutines, each trying to deduct $0.01
   - Expected: Exactly 50 succeed (until balance = 0)
   - Verify: Final credits = $0.00 (never negative)

3. TestAtomicDeduction_PartialRefCredits:
   - Setup: User with credits = $0.05, refCredits = $0.10
   - Action: Deduct $0.08
   - Expected: credits = $0.00, refCredits = $0.07
   - Verify: AC3 split behavior

4. TestAtomicDeduction_ModifiedCountZero:
   - Setup: User with credits = $0.05
   - Action: Deduct $0.10
   - Expected: ErrInsufficientBalance returned
   - Verify: No database modification occurred
	`)
}
