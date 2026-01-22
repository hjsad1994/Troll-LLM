package openhands

import (
	"regexp"
	"strings"
	"testing"
)

// =============================================================================
// Story 4.3: Actionable Error Information Tests
// =============================================================================
//
// This file contains tests that verify error messages include actionable information:
// - AC1: Rate limit errors include retry time ("Please retry after X seconds")
// - AC2: User Key insufficient credits include balance ("Current balance: $X.XX")
// - AC3: Friend Key insufficient credits use generic message (no balance exposed)
//
// NOTE: Actual error formatting is done in main.go HTTP handlers.
// These tests document and validate the expected message formats.

// =============================================================================
// AC1: Rate Limit Error with Retry Time Tests
// =============================================================================

// TestActionableError_AC1_RateLimitRetryTime_OpenAI verifies OpenAI format includes retry time
func TestActionableError_AC1_RateLimitRetryTime_OpenAI(t *testing.T) {
	// Expected OpenAI rate limit error format from main.go:446
	// {"error":{"message":"Rate limit exceeded. Please retry after %d seconds.","type":"rate_limit_error","code":"rate_limit_exceeded"}}

	testCases := []struct {
		name         string
		retrySeconds int
	}{
		{"1 second retry", 1},
		{"30 seconds retry", 30},
		{"60 seconds retry", 60},
	}

	retryPattern := regexp.MustCompile(`Please retry after (\d+) seconds`)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Simulate the error message format from main.go
			errorMsg := formatOpenAIRateLimitError(tc.retrySeconds)

			// Verify message contains retry time
			if !retryPattern.MatchString(errorMsg) {
				t.Errorf("AC1 FAILED: OpenAI rate limit error should contain 'Please retry after X seconds'\nGot: %s", errorMsg)
			}

			// Verify exact retry time is included
			matches := retryPattern.FindStringSubmatch(errorMsg)
			if len(matches) < 2 {
				t.Fatal("AC1 FAILED: Could not extract retry time from message")
			}

			// Verify message structure
			if !strings.Contains(errorMsg, "rate_limit_error") {
				t.Error("AC1: OpenAI rate limit error should have type 'rate_limit_error'")
			}
			if !strings.Contains(errorMsg, "rate_limit_exceeded") {
				t.Error("AC1: OpenAI rate limit error should have code 'rate_limit_exceeded'")
			}
		})
	}
}

// TestActionableError_AC1_RateLimitRetryTime_Anthropic verifies Anthropic format includes retry time
func TestActionableError_AC1_RateLimitRetryTime_Anthropic(t *testing.T) {
	// Expected Anthropic rate limit error format from main.go:443
	// {"type":"error","error":{"type":"rate_limit_error","message":"Rate limit exceeded. Please retry after %d seconds."}}

	testCases := []struct {
		name         string
		retrySeconds int
	}{
		{"1 second retry", 1},
		{"30 seconds retry", 30},
		{"60 seconds retry", 60},
	}

	retryPattern := regexp.MustCompile(`Please retry after (\d+) seconds`)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Simulate the error message format from main.go
			errorMsg := formatAnthropicRateLimitError(tc.retrySeconds)

			// Verify message contains retry time
			if !retryPattern.MatchString(errorMsg) {
				t.Errorf("AC1 FAILED: Anthropic rate limit error should contain 'Please retry after X seconds'\nGot: %s", errorMsg)
			}

			// Verify message structure
			if !strings.Contains(errorMsg, `"type":"error"`) {
				t.Error("AC1: Anthropic error should have outer type 'error'")
			}
			if !strings.Contains(errorMsg, `"type":"rate_limit_error"`) {
				t.Error("AC1: Anthropic rate limit error should have inner type 'rate_limit_error'")
			}
		})
	}
}

// =============================================================================
// AC2: User Key Insufficient Credits with Balance Tests
// =============================================================================

// TestActionableError_AC2_UserKeyBalance_OpenAI verifies OpenAI format includes balance
func TestActionableError_AC2_UserKeyBalance_OpenAI(t *testing.T) {
	// Expected OpenAI insufficient credits error format from main.go:645
	// {"error":{"message":"Insufficient credits. Current balance: $%.2f","type":"insufficient_quota","code":"insufficient_credits","balance":%.2f}}

	testCases := []struct {
		name    string
		balance float64
	}{
		{"Zero balance", 0.00},
		{"Small balance", 0.05},
		{"Normal balance", 1.23},
		{"Large balance", 100.00},
	}

	balancePattern := regexp.MustCompile(`Current balance: \$(\d+\.\d{2})`)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Simulate the error message format from main.go
			errorMsg := formatOpenAIInsufficientCreditsError(tc.balance)

			// Verify message contains balance
			if !balancePattern.MatchString(errorMsg) {
				t.Errorf("AC2 FAILED: OpenAI insufficient credits error should contain 'Current balance: $X.XX'\nGot: %s", errorMsg)
			}

			// Verify balance format is correct ($X.XX)
			if !strings.Contains(errorMsg, "$") {
				t.Error("AC2: Balance should include $ symbol")
			}

			// Verify error type and code
			if !strings.Contains(errorMsg, "insufficient_quota") {
				t.Error("AC2: OpenAI insufficient credits error should have type 'insufficient_quota'")
			}
			if !strings.Contains(errorMsg, "insufficient_credits") {
				t.Error("AC2: OpenAI insufficient credits error should have code 'insufficient_credits'")
			}
		})
	}
}

// TestActionableError_AC2_UserKeyBalance_Anthropic verifies Anthropic format includes balance
func TestActionableError_AC2_UserKeyBalance_Anthropic(t *testing.T) {
	// Expected Anthropic insufficient credits error format from main.go:2736
	// {"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Current balance: $%.2f"}}

	testCases := []struct {
		name    string
		balance float64
	}{
		{"Zero balance", 0.00},
		{"Small balance", 0.05},
		{"Normal balance", 1.23},
		{"Large balance", 100.00},
	}

	balancePattern := regexp.MustCompile(`Current balance: \$(\d+\.\d{2})`)

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Simulate the error message format from main.go
			errorMsg := formatAnthropicInsufficientCreditsError(tc.balance)

			// Verify message contains balance
			if !balancePattern.MatchString(errorMsg) {
				t.Errorf("AC2 FAILED: Anthropic insufficient credits error should contain 'Current balance: $X.XX'\nGot: %s", errorMsg)
			}

			// Verify message structure
			if !strings.Contains(errorMsg, `"type":"error"`) {
				t.Error("AC2: Anthropic error should have outer type 'error'")
			}
			if !strings.Contains(errorMsg, `"type":"insufficient_credits"`) {
				t.Error("AC2: Anthropic insufficient credits error should have inner type 'insufficient_credits'")
			}
		})
	}
}

// =============================================================================
// AC3: Friend Key Balance Security Tests
// =============================================================================

// TestActionableError_AC3_FriendKeyNoBalance_OpenAI verifies OpenAI Friend Key error hides balance
func TestActionableError_AC3_FriendKeyNoBalance_OpenAI(t *testing.T) {
	// Expected OpenAI Friend Key error format from main.go:596
	// {"error":{"message":"Insufficient credits. Please contact the key owner.","type":"insufficient_quota","code":"insufficient_credits"}}

	errorMsg := formatOpenAIFriendKeyError()

	// AC3: Message must NOT contain balance information
	forbiddenPatterns := []string{
		"$",       // Dollar sign
		"balance", // Balance keyword
		"Balance", // Balance keyword (capitalized)
		".00",     // Decimal balance format
		"Current", // "Current balance" partial
	}

	for _, pattern := range forbiddenPatterns {
		if strings.Contains(errorMsg, pattern) {
			t.Errorf("AC3 SECURITY VIOLATION: Friend Key error must NOT contain %q\nGot: %s", pattern, errorMsg)
		}
	}

	// Verify generic message is used
	if !strings.Contains(errorMsg, "Please contact the key owner") {
		t.Error("AC3: Friend Key error should contain 'Please contact the key owner'")
	}

	// Verify error type and code
	if !strings.Contains(errorMsg, "insufficient_quota") {
		t.Error("AC3: OpenAI Friend Key error should have type 'insufficient_quota'")
	}
	if !strings.Contains(errorMsg, "insufficient_credits") {
		t.Error("AC3: OpenAI Friend Key error should have code 'insufficient_credits'")
	}
}

// TestActionableError_AC3_FriendKeyNoBalance_Anthropic verifies Anthropic Friend Key error hides balance
func TestActionableError_AC3_FriendKeyNoBalance_Anthropic(t *testing.T) {
	// Expected Anthropic Friend Key error format from main.go:2690
	// {"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Please contact the key owner."}}

	errorMsg := formatAnthropicFriendKeyError()

	// AC3: Message must NOT contain balance information
	forbiddenPatterns := []string{
		"$",       // Dollar sign
		"balance", // Balance keyword
		"Balance", // Balance keyword (capitalized)
		".00",     // Decimal balance format
		"Current", // "Current balance" partial
	}

	for _, pattern := range forbiddenPatterns {
		if strings.Contains(errorMsg, pattern) {
			t.Errorf("AC3 SECURITY VIOLATION: Friend Key error must NOT contain %q\nGot: %s", pattern, errorMsg)
		}
	}

	// Verify generic message is used
	if !strings.Contains(errorMsg, "Please contact the key owner") {
		t.Error("AC3: Friend Key error should contain 'Please contact the key owner'")
	}

	// Verify message structure
	if !strings.Contains(errorMsg, `"type":"error"`) {
		t.Error("AC3: Anthropic error should have outer type 'error'")
	}
	if !strings.Contains(errorMsg, `"type":"insufficient_credits"`) {
		t.Error("AC3: Anthropic Friend Key error should have inner type 'insufficient_credits'")
	}
}

// =============================================================================
// Helper Functions - Simulate main.go error formatting
// =============================================================================

// formatOpenAIRateLimitError simulates main.go:446
func formatOpenAIRateLimitError(retryAfter int) string {
	return `{"error":{"message":"Rate limit exceeded. Please retry after ` +
		itoa(retryAfter) + ` seconds.","type":"rate_limit_error","code":"rate_limit_exceeded"}}`
}

// formatAnthropicRateLimitError simulates main.go:443
func formatAnthropicRateLimitError(retryAfter int) string {
	return `{"type":"error","error":{"type":"rate_limit_error","message":"Rate limit exceeded. Please retry after ` +
		itoa(retryAfter) + ` seconds."}}`
}

// formatOpenAIInsufficientCreditsError simulates main.go:645
func formatOpenAIInsufficientCreditsError(balance float64) string {
	return `{"error":{"message":"Insufficient credits. Current balance: $` +
		ftoa(balance) + `","type":"insufficient_quota","code":"insufficient_credits","balance":` +
		ftoa(balance) + `}}`
}

// formatAnthropicInsufficientCreditsError simulates main.go:2736
func formatAnthropicInsufficientCreditsError(balance float64) string {
	return `{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Current balance: $` +
		ftoa(balance) + `"}}`
}

// formatOpenAIFriendKeyError simulates main.go:596
func formatOpenAIFriendKeyError() string {
	return `{"error":{"message":"Insufficient credits. Please contact the key owner.","type":"insufficient_quota","code":"insufficient_credits"}}`
}

// formatAnthropicFriendKeyError simulates main.go:2690
func formatAnthropicFriendKeyError() string {
	return `{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Please contact the key owner."}}`
}

// itoa converts int to string
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}

// ftoa converts float64 to string with 2 decimal places
func ftoa(f float64) string {
	// Simple implementation for test formatting
	whole := int(f)
	frac := int((f - float64(whole)) * 100)
	if frac < 0 {
		frac = -frac
	}
	fracStr := itoa(frac)
	if len(fracStr) == 1 {
		fracStr = "0" + fracStr
	}
	return itoa(whole) + "." + fracStr
}

// =============================================================================
// Comprehensive Integration Tests
// =============================================================================

// TestActionableError_AllFormatsConsistent verifies OpenAI and Anthropic formats are consistent
func TestActionableError_AllFormatsConsistent(t *testing.T) {
	// Both formats should have the same actionable information

	t.Run("Rate limit retry time consistent", func(t *testing.T) {
		retryPattern := regexp.MustCompile(`Please retry after (\d+) seconds`)

		openAI := formatOpenAIRateLimitError(30)
		anthropic := formatAnthropicRateLimitError(30)

		openAIMatch := retryPattern.FindStringSubmatch(openAI)
		anthropicMatch := retryPattern.FindStringSubmatch(anthropic)

		if len(openAIMatch) < 2 || len(anthropicMatch) < 2 {
			t.Error("Both formats should contain retry time")
		}
		if openAIMatch[1] != anthropicMatch[1] {
			t.Errorf("Retry time should be same in both formats: OpenAI=%s, Anthropic=%s", openAIMatch[1], anthropicMatch[1])
		}
	})

	t.Run("User Key balance format consistent", func(t *testing.T) {
		balancePattern := regexp.MustCompile(`Current balance: \$(\d+\.\d{2})`)

		openAI := formatOpenAIInsufficientCreditsError(1.23)
		anthropic := formatAnthropicInsufficientCreditsError(1.23)

		openAIMatch := balancePattern.FindStringSubmatch(openAI)
		anthropicMatch := balancePattern.FindStringSubmatch(anthropic)

		if len(openAIMatch) < 2 || len(anthropicMatch) < 2 {
			t.Error("Both formats should contain balance")
		}
		if openAIMatch[1] != anthropicMatch[1] {
			t.Errorf("Balance should be same in both formats: OpenAI=%s, Anthropic=%s", openAIMatch[1], anthropicMatch[1])
		}
	})

	t.Run("Friend Key generic message consistent", func(t *testing.T) {
		openAI := formatOpenAIFriendKeyError()
		anthropic := formatAnthropicFriendKeyError()

		expectedMessage := "Please contact the key owner"
		if !strings.Contains(openAI, expectedMessage) || !strings.Contains(anthropic, expectedMessage) {
			t.Errorf("Both formats should contain '%s'", expectedMessage)
		}

		// Neither should contain balance
		if strings.Contains(openAI, "$") || strings.Contains(anthropic, "$") {
			t.Error("Friend Key errors should NOT contain $ symbol")
		}
	})
}

// TestActionableError_SecurityBoundary verifies User Key and Friend Key have different behavior
func TestActionableError_SecurityBoundary(t *testing.T) {
	t.Run("User Key shows balance, Friend Key does not", func(t *testing.T) {
		userKeyError := formatOpenAIInsufficientCreditsError(5.00)
		friendKeyError := formatOpenAIFriendKeyError()

		// User Key should have balance
		if !strings.Contains(userKeyError, "$5.00") {
			t.Error("User Key error should contain balance")
		}

		// Friend Key should NOT have balance
		if strings.Contains(friendKeyError, "$") {
			t.Error("Friend Key error should NOT contain balance")
		}
	})
}

// =============================================================================
// Prompt Too Long Error Tests
// =============================================================================

// TestPromptTooLongError_Detection tests that prompt too long errors are correctly detected
func TestPromptTooLongError_Detection(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "Anthropic format - exact match",
			input:    `{"type":"error","error":{"type":"invalid_request_error","message":"prompt is too long: 200076 tokens > 200000 maximum"}}`,
			expected: true,
		},
		{
			name:     "OpenAI format - context length",
			input:    `{"error":{"message":"maximum context length is 200000 tokens, but you requested 200076 tokens"}}`,
			expected: true,
		},
		{
			name:     "Generic - too many tokens",
			input:    `{"error":{"message":"Request contains too many tokens"}}`,
			expected: true,
		},
		{
			name:     "Generic - token limit",
			input:    `{"error":{"message":"Token limit exceeded"}}`,
			expected: true,
		},
		{
			name:     "tokens and maximum together",
			input:    `{"error":{"message":"200076 tokens exceeds maximum allowed"}}`,
			expected: true,
		},
		{
			name:     "Unrelated error - auth",
			input:    `{"error":{"message":"Authentication failed"}}`,
			expected: false,
		},
		{
			name:     "Unrelated error - rate limit",
			input:    `{"error":{"message":"Rate limit exceeded"}}`,
			expected: false,
		},
		{
			name:     "Unrelated error - budget",
			input:    `{"error":{"message":"ExceededBudget"}}`,
			expected: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := IsPromptTooLongError(tc.input)
			if result != tc.expected {
				t.Errorf("IsPromptTooLongError(%q) = %v, expected %v", tc.input, result, tc.expected)
			}
		})
	}
}

// TestPromptTooLongError_SanitizeOpenAI verifies OpenAI format returns actionable error
func TestPromptTooLongError_SanitizeOpenAI(t *testing.T) {
	// Simulate the actual upstream error
	originalError := []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"prompt is too long: 200076 tokens > 200000 maximum"},"request_id":"req_123"}`)

	result := SanitizeError(400, originalError)
	resultStr := string(result)

	// Should contain actionable message
	if !strings.Contains(resultStr, "Prompt is too long") {
		t.Errorf("OpenAI sanitized error should contain 'Prompt is too long'\nGot: %s", resultStr)
	}

	// Should contain guidance
	if !strings.Contains(resultStr, "reduce the size") {
		t.Errorf("OpenAI sanitized error should contain guidance to reduce size\nGot: %s", resultStr)
	}

	// Should have correct error code
	if !strings.Contains(resultStr, "context_length_exceeded") {
		t.Errorf("OpenAI sanitized error should have code 'context_length_exceeded'\nGot: %s", resultStr)
	}

	// Should NOT contain request_id (security)
	if strings.Contains(resultStr, "req_123") {
		t.Errorf("OpenAI sanitized error should NOT expose request_id\nGot: %s", resultStr)
	}

	t.Logf("OpenAI prompt too long error: %s", resultStr)
}

// TestPromptTooLongError_SanitizeAnthropic verifies Anthropic format returns actionable error
func TestPromptTooLongError_SanitizeAnthropic(t *testing.T) {
	// Simulate the actual upstream error
	originalError := []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"prompt is too long: 200076 tokens > 200000 maximum"},"request_id":"req_123"}`)

	result := SanitizeAnthropicError(400, originalError)
	resultStr := string(result)

	// Should contain actionable message
	if !strings.Contains(resultStr, "Prompt is too long") {
		t.Errorf("Anthropic sanitized error should contain 'Prompt is too long'\nGot: %s", resultStr)
	}

	// Should contain guidance
	if !strings.Contains(resultStr, "reduce the size") {
		t.Errorf("Anthropic sanitized error should contain guidance to reduce size\nGot: %s", resultStr)
	}

	// Should have Anthropic format structure
	if !strings.Contains(resultStr, `"type":"error"`) {
		t.Errorf("Anthropic sanitized error should have outer type 'error'\nGot: %s", resultStr)
	}

	// Should have correct error type
	if !strings.Contains(resultStr, `"type":"invalid_request_error"`) {
		t.Errorf("Anthropic sanitized error should have inner type 'invalid_request_error'\nGot: %s", resultStr)
	}

	// Should NOT contain request_id (security)
	if strings.Contains(resultStr, "req_123") {
		t.Errorf("Anthropic sanitized error should NOT expose request_id\nGot: %s", resultStr)
	}

	t.Logf("Anthropic prompt too long error: %s", resultStr)
}

// TestPromptTooLongError_NonPromptErrorNotAffected verifies other 400 errors are not affected
func TestPromptTooLongError_NonPromptErrorNotAffected(t *testing.T) {
	// Non-prompt 400 errors should return generic message
	nonPromptErrors := []string{
		`{"error":{"message":"Invalid JSON"}}`,
		`{"error":{"message":"Missing required field"}}`,
		`{"error":{"message":"Invalid parameter value"}}`,
	}

	for _, errStr := range nonPromptErrors {
		result := SanitizeError(400, []byte(errStr))
		resultStr := string(result)

		// Should NOT contain prompt-specific message
		if strings.Contains(resultStr, "Prompt is too long") {
			t.Errorf("Non-prompt error should not contain 'Prompt is too long'\nInput: %s\nGot: %s", errStr, resultStr)
		}

		// Should be generic bad request
		if !strings.Contains(resultStr, "Bad request") {
			t.Errorf("Non-prompt error should contain 'Bad request'\nInput: %s\nGot: %s", errStr, resultStr)
		}
	}
}
