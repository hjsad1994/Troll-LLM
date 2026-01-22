package openhands

import (
	"testing"
)

func TestIsImageDimensionError(t *testing.T) {
	tests := []struct {
		name     string
		errorStr string
		expected bool
	}{
		{
			name:     "Image dimension exceed error",
			errorStr: `{"type":"error","error":{"type":"invalid_request_error","message":"messages.52.content.2.image.source.base64.data: At least one of the image dimensions exceed max allowed size: 8000 pixels"},"request_id":"req_011CX5uDfRKGCLDjdQNuZVNz"}`,
			expected: true,
		},
		{
			name:     "Image dimension exceed (case insensitive)",
			errorStr: `{"error":{"message":"Image Dimensions Exceed max size"}}`,
			expected: true,
		},
		{
			name:     "Exceed max allowed size",
			errorStr: `{"error":{"message":"The image exceed max allowed size of 8000 pixels"}}`,
			expected: true,
		},
		{
			name:     "Image.source.base64.data path",
			errorStr: `{"error":{"message":"messages.0.content.1.image.source.base64.data: validation failed"}}`,
			expected: true,
		},
		{
			name:     "Regular 400 error - invalid JSON",
			errorStr: `{"error":{"message":"Invalid JSON in request body"}}`,
			expected: false,
		},
		{
			name:     "Regular 400 error - missing field",
			errorStr: `{"error":{"message":"Missing required field: model"}}`,
			expected: false,
		},
		{
			name:     "Regular 400 error - invalid parameter",
			errorStr: `{"error":{"message":"Invalid value for parameter 'temperature'"}}`,
			expected: false,
		},
		{
			name:     "Empty error string",
			errorStr: "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isImageDimensionError(tt.errorStr)
			if result != tt.expected {
				t.Errorf("isImageDimensionError(%q) = %v, want %v", tt.errorStr, result, tt.expected)
			}
		})
	}
}

func TestSanitizeAnthropicError_ImageDimension(t *testing.T) {
	// Test that image dimension errors are preserved
	imageDimensionError := []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"messages.52.content.2.image.source.base64.data: At least one of the image dimensions exceed max allowed size: 8000 pixels"},"request_id":"req_011CX5uDfRKGCLDjdQNuZVNz"}`)
	result := SanitizeAnthropicError(400, imageDimensionError)

	// Should return the original error unchanged
	if string(result) != string(imageDimensionError) {
		t.Errorf("Image dimension error was not preserved. Got: %s", string(result))
	}
}

func TestSanitizeAnthropicError_RegularBadRequest(t *testing.T) {
	// Test that other 400 errors are still sanitized
	regularError := []byte(`{"error":{"message":"Invalid JSON in request body"}}`)
	result := SanitizeAnthropicError(400, regularError)

	expected := `{"type":"error","error":{"type":"invalid_request_error","message":"Bad request"}}`
	if string(result) != expected {
		t.Errorf("Regular 400 error was not sanitized. Got: %s, Want: %s", string(result), expected)
	}
}

func TestSanitizeAnthropicError_OtherStatusCodes(t *testing.T) {
	// Test that other status codes are unaffected
	tests := []struct {
		statusCode int
		expected   string
	}{
		{401, `{"type":"error","error":{"type":"authentication_error","message":"Authentication failed"}}`},
		{402, `{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Please purchase credits to continue."}}`},
		{403, `{"type":"error","error":{"type":"permission_error","message":"Access denied"}}`},
		{404, `{"type":"error","error":{"type":"not_found_error","message":"Resource not found"}}`},
		{429, `{"type":"error","error":{"type":"rate_limit_error","message":"Rate limit exceeded"}}`},
		{529, `{"type":"error","error":{"type":"overloaded_error","message":"The API is currently overloaded. Please retry your request after a brief wait."}}`},
		{500, `{"type":"error","error":{"type":"api_error","message":"Upstream service unavailable"}}`},
	}

	originalError := []byte(`{"error":{"message":"Some error"}}`)
	for _, tt := range tests {
		t.Run(string(rune(tt.statusCode)), func(t *testing.T) {
			result := SanitizeAnthropicError(tt.statusCode, originalError)
			if string(result) != tt.expected {
				t.Errorf("Status %d: Got: %s, Want: %s", tt.statusCode, string(result), tt.expected)
			}
		})
	}
}

func TestSanitizeError_OpenAIFormat529(t *testing.T) {
	// Test that 529 errors return proper OpenAI format with code field
	originalError := []byte(`{"error":{"message":"Overloaded","type":"overloaded_error","code":"529"}}`)
	result := SanitizeError(529, originalError)

	expected := `{"error":{"message":"The API is currently overloaded. Please retry your request after a brief wait.","type":"overloaded_error","code":"service_overloaded"}}`
	if string(result) != expected {
		t.Errorf("529 error format incorrect.\nGot:  %s\nWant: %s", string(result), expected)
	}
}

// =============================================================================
// Thinking Budget Token Error Tests
// =============================================================================

func TestIsThinkingBudgetError(t *testing.T) {
	tests := []struct {
		name     string
		errorStr string
		expected bool
	}{
		{
			name:     "Exact Anthropic error message",
			errorStr: `{"type":"error","error":{"type":"invalid_request_error","message":"\u0060max_tokens\u0060 must be greater than \u0060thinking.budget_tokens\u0060. Please consult our documentation at https://docs.claude.com/en/docs/build-with-claude/extended-thinking#max-tokens-and-context-window-size"},"request_id":"req_011CXEojawrctJ4tTo7bmsCF"}`,
			expected: true,
		},
		{
			name:     "Simple max_tokens and budget_tokens",
			errorStr: "max_tokens must be greater than budget_tokens",
			expected: true,
		},
		{
			name:     "Contains thinking.budget_tokens",
			errorStr: "thinking.budget_tokens is too high",
			expected: true,
		},
		{
			name:     "Case insensitive Max_Tokens and Budget_Tokens",
			errorStr: "Max_Tokens should be larger than Budget_Tokens",
			expected: true,
		},
		{
			name:     "Only max_tokens without budget_tokens",
			errorStr: "max_tokens is too large",
			expected: false,
		},
		{
			name:     "Only budget_tokens without max_tokens",
			errorStr: "budget_tokens value is invalid",
			expected: false,
		},
		{
			name:     "Image dimension error - should not match",
			errorStr: "image dimensions exceed max allowed size: 8000 pixels",
			expected: false,
		},
		{
			name:     "Generic invalid request error",
			errorStr: "Invalid request format",
			expected: false,
		},
		{
			name:     "Empty string",
			errorStr: "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isThinkingBudgetError(tt.errorStr)
			if result != tt.expected {
				t.Errorf("isThinkingBudgetError(%q) = %v, want %v", tt.errorStr, result, tt.expected)
			}
		})
	}
}

func TestSanitizeAnthropicError_ThinkingBudget(t *testing.T) {
	// Test that thinking budget errors return a clean, user-friendly message
	// (not the raw error which may contain internal routing/fallback details)
	thinkingBudgetError := []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"max_tokens must be greater than thinking.budget_tokens. Please consult our documentation."},"request_id":"req_test"}`)
	result := SanitizeAnthropicError(400, thinkingBudgetError)

	// Should return a clean user-friendly error
	expected := `{"type":"error","error":{"type":"invalid_request_error","message":"max_tokens must be greater than thinking.budget_tokens. Please increase max_tokens or decrease thinking.budget_tokens in your extended thinking configuration. See: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking"}}`
	if string(result) != expected {
		t.Errorf("Thinking budget error was not properly sanitized.\nGot:  %s\nWant: %s", string(result), expected)
	}
}

func TestSanitizeAnthropicError_ThinkingBudgetWithBackticks(t *testing.T) {
	// Test with unicode escaped backticks (as seen in real API errors)
	// Should still return the clean user-friendly message
	thinkingBudgetError := []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"\u0060max_tokens\u0060 must be greater than \u0060thinking.budget_tokens\u0060. Please consult our documentation at https://docs.claude.com/en/docs/build-with-claude/extended-thinking#max-tokens-and-context-window-size"},"request_id":"req_011CXEojawrctJ4tTo7bmsCF"}`)
	result := SanitizeAnthropicError(400, thinkingBudgetError)

	// Should return a clean user-friendly error (hiding request_id and other internal details)
	expected := `{"type":"error","error":{"type":"invalid_request_error","message":"max_tokens must be greater than thinking.budget_tokens. Please increase max_tokens or decrease thinking.budget_tokens in your extended thinking configuration. See: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking"}}`
	if string(result) != expected {
		t.Errorf("Thinking budget error with backticks was not properly sanitized.\nGot:  %s\nWant: %s", string(result), expected)
	}
}
