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
