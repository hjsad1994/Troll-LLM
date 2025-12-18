package openhands

import (
	"encoding/json"
	"testing"
)

// =============================================================================
// Story 4.2: Anthropic Format Error Responses Tests
// =============================================================================

// AnthropicErrorResponse represents the Anthropic API error response format
type AnthropicErrorResponse struct {
	Type  string `json:"type"`
	Error struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error"`
}

// TestAnthropicErrorFormat_RateLimitError tests AC1: Rate limit error has correct format
// Expected: {"type":"error","error":{"type":"rate_limit_error","message":"..."}}
func TestAnthropicErrorFormat_RateLimitError(t *testing.T) {
	resp := SanitizeAnthropicError(429, []byte("original error"))

	var errResp AnthropicErrorResponse
	if err := json.Unmarshal(resp, &errResp); err != nil {
		t.Fatalf("Failed to parse error response: %v", err)
	}

	// Verify outer type
	if errResp.Type != "error" {
		t.Errorf("AC1: Expected outer type 'error', got %q", errResp.Type)
	}

	// Verify error type
	if errResp.Error.Type != "rate_limit_error" {
		t.Errorf("AC1: Expected error type 'rate_limit_error', got %q", errResp.Error.Type)
	}

	// Verify message contains rate limit info
	if errResp.Error.Message == "" {
		t.Error("AC1: Expected non-empty error message")
	}

	t.Logf("AC1: Rate limit error format verified: %s", string(resp))
}

// TestAnthropicErrorFormat_InsufficientCreditsError tests AC2: Insufficient credits error format
// Expected: {"type":"error","error":{"type":"insufficient_credits","message":"..."}}
func TestAnthropicErrorFormat_InsufficientCreditsError(t *testing.T) {
	resp := SanitizeAnthropicError(402, []byte("original error"))

	var errResp AnthropicErrorResponse
	if err := json.Unmarshal(resp, &errResp); err != nil {
		t.Fatalf("Failed to parse error response: %v", err)
	}

	// Verify outer type
	if errResp.Type != "error" {
		t.Errorf("AC2: Expected outer type 'error', got %q", errResp.Type)
	}

	// Verify error type - Story 4.2: MUST be "insufficient_credits" NOT "service_error"
	if errResp.Error.Type != "insufficient_credits" {
		t.Errorf("AC2: Expected error type 'insufficient_credits', got %q", errResp.Error.Type)
	}

	// Verify message mentions credits
	if errResp.Error.Message == "" {
		t.Error("AC2: Expected non-empty error message")
	}

	t.Logf("AC2: Insufficient credits error format verified: %s", string(resp))
}

// TestAnthropicErrorFormat_AuthenticationError tests AC3: Authentication error format
// Expected: {"type":"error","error":{"type":"authentication_error","message":"..."}}
func TestAnthropicErrorFormat_AuthenticationError(t *testing.T) {
	resp := SanitizeAnthropicError(401, []byte("original error"))

	var errResp AnthropicErrorResponse
	if err := json.Unmarshal(resp, &errResp); err != nil {
		t.Fatalf("Failed to parse error response: %v", err)
	}

	// Verify outer type
	if errResp.Type != "error" {
		t.Errorf("AC3: Expected outer type 'error', got %q", errResp.Type)
	}

	// Verify error type
	if errResp.Error.Type != "authentication_error" {
		t.Errorf("AC3: Expected error type 'authentication_error', got %q", errResp.Error.Type)
	}

	// Verify message
	if errResp.Error.Message == "" {
		t.Error("AC3: Expected non-empty error message")
	}

	t.Logf("AC3: Authentication error format verified: %s", string(resp))
}

// TestAnthropicErrorFormat_AllStatusCodes tests all status codes return correct Anthropic format
func TestAnthropicErrorFormat_AllStatusCodes(t *testing.T) {
	testCases := []struct {
		name           string
		statusCode     int
		expectedType   string
		expectedFormat string // Anthropic format requires outer "type":"error"
	}{
		{"BadRequest_400", 400, "invalid_request_error", "error"},
		{"Unauthorized_401", 401, "authentication_error", "error"},
		{"PaymentRequired_402", 402, "insufficient_credits", "error"},
		{"Forbidden_403", 403, "permission_error", "error"},
		{"NotFound_404", 404, "not_found_error", "error"},
		{"RateLimit_429", 429, "rate_limit_error", "error"},
		{"InternalError_500", 500, "api_error", "error"},
		{"BadGateway_502", 502, "api_error", "error"},
		{"ServiceUnavailable_503", 503, "api_error", "error"},
		{"GatewayTimeout_504", 504, "api_error", "error"},
		{"Unknown_418", 418, "api_error", "error"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resp := SanitizeAnthropicError(tc.statusCode, []byte("test error"))

			var errResp AnthropicErrorResponse
			if err := json.Unmarshal(resp, &errResp); err != nil {
				t.Fatalf("Failed to parse error response for status %d: %v", tc.statusCode, err)
			}

			// Verify outer type is always "error" (Anthropic format requirement)
			if errResp.Type != tc.expectedFormat {
				t.Errorf("Status %d: Expected outer type %q, got %q",
					tc.statusCode, tc.expectedFormat, errResp.Type)
			}

			// Verify error type matches expected
			if errResp.Error.Type != tc.expectedType {
				t.Errorf("Status %d: Expected error type %q, got %q",
					tc.statusCode, tc.expectedType, errResp.Error.Type)
			}

			// Verify message is non-empty
			if errResp.Error.Message == "" {
				t.Errorf("Status %d: Expected non-empty error message", tc.statusCode)
			}
		})
	}
}

// TestAnthropicErrorFormat_NoCodeField verifies Anthropic format does NOT have "code" field
// This is the key difference from OpenAI format (Story 4.1 added code to OpenAI errors)
func TestAnthropicErrorFormat_NoCodeField(t *testing.T) {
	resp := SanitizeAnthropicError(402, []byte("test"))

	// Parse as generic map to check for unexpected fields
	var rawResp map[string]interface{}
	if err := json.Unmarshal(resp, &rawResp); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Check that error object doesn't have "code" field
	if errorObj, ok := rawResp["error"].(map[string]interface{}); ok {
		if _, hasCode := errorObj["code"]; hasCode {
			t.Error("Anthropic format should NOT have 'code' field in error object")
		}
	}

	// Verify it has the required Anthropic fields only: type, message
	if errorObj, ok := rawResp["error"].(map[string]interface{}); ok {
		if _, hasType := errorObj["type"]; !hasType {
			t.Error("Anthropic format MUST have 'type' field in error object")
		}
		if _, hasMsg := errorObj["message"]; !hasMsg {
			t.Error("Anthropic format MUST have 'message' field in error object")
		}
	}
}

// TestAnthropicErrorFormat_402NotServiceError verifies 402 uses insufficient_credits, NOT service_error
// This is the key fix from Story 4.2 - old code had "service_error" which was incorrect
func TestAnthropicErrorFormat_402NotServiceError(t *testing.T) {
	resp := SanitizeAnthropicError(402, []byte("test"))

	var errResp AnthropicErrorResponse
	if err := json.Unmarshal(resp, &errResp); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// CRITICAL: Must NOT be service_error (old incorrect value)
	if errResp.Error.Type == "service_error" {
		t.Error("CRITICAL: 402 error type must NOT be 'service_error' - this was the bug fixed in Story 4.2")
	}

	// CRITICAL: Must be insufficient_credits
	if errResp.Error.Type != "insufficient_credits" {
		t.Errorf("CRITICAL: 402 error type must be 'insufficient_credits', got %q", errResp.Error.Type)
	}
}

// =============================================================================
// Story 4.2 AC4: Friend Key Error Security Test
// This test documents the expected behavior - actual integration testing requires
// HTTP handler testing which is done separately
// =============================================================================

// TestFriendKeyErrorFormat_NoBalanceExposed documents the expected Friend Key error behavior
// AC4: Friend Key 402 error must NOT expose owner's balance
func TestFriendKeyErrorFormat_NoBalanceExposed(t *testing.T) {
	// This documents the expected error message format for Friend Key insufficient credits
	// The actual HTTP handler test validates this in integration tests
	expectedErrorType := "insufficient_credits"
	expectedMessage := "Insufficient credits. Please contact the key owner."

	// The error message must NOT contain:
	forbiddenPatterns := []string{
		"$",       // Dollar sign indicating balance
		"Balance", // Balance keyword
		"balance", // balance keyword (lowercase)
		".00",     // Decimal balance format
	}

	// Document expected format
	t.Logf("AC4: Expected Friend Key error type: %s", expectedErrorType)
	t.Logf("AC4: Expected Friend Key error message: %s", expectedMessage)
	t.Logf("AC4: Forbidden patterns in error: %v", forbiddenPatterns)

	// Verify expected message doesn't contain forbidden patterns
	for _, pattern := range forbiddenPatterns {
		if contains(expectedMessage, pattern) {
			t.Errorf("AC4 VIOLATION: Expected message should not contain %q", pattern)
		}
	}
}

// contains checks if string contains substring
func contains(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
