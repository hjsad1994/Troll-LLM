package openhands

import (
	"log"
	"net/http"
	"strings"
)

// UsageCallback is called after a request completes with token usage data (with cache support)
type UsageCallback func(input, output, cacheWrite, cacheHit int64)

// Provider interface for upstream providers
type Provider interface {
	Name() string
	IsConfigured() bool
	ForwardRequest(body []byte, isStreaming bool) (*http.Response, error)
	HandleStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, onUsage UsageCallback)
	HandleNonStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, onUsage UsageCallback)
}

// sanitizeError returns a generic error message (OpenAI format)
// Story 4.1: Added "code" field to all error responses for OpenAI SDK compatibility
func SanitizeError(statusCode int, originalError []byte) []byte {
	log.Printf("🔒 [TrollProxy] Original error (hidden): %s", string(originalError))
	switch statusCode {
	case 400:
		return []byte(`{"error":{"message":"Bad request","type":"invalid_request_error","code":"invalid_request_error"}}`)
	case 401:
		return []byte(`{"error":{"message":"Authentication failed","type":"authentication_error","code":"invalid_api_key"}}`)
	case 402:
		return []byte(`{"error":{"message":"Insufficient credits. Please purchase credits to continue.","type":"insufficient_quota","code":"insufficient_credits"}}`)
	case 403:
		return []byte(`{"error":{"message":"Access denied","type":"permission_error","code":"permission_denied"}}`)
	case 404:
		return []byte(`{"error":{"message":"Resource not found","type":"not_found_error","code":"not_found"}}`)
	case 429:
		return []byte(`{"error":{"message":"Rate limit exceeded","type":"rate_limit_error","code":"rate_limit_exceeded"}}`)
	case 500, 502, 503, 504:
		return []byte(`{"error":{"message":"Upstream service unavailable","type":"server_error","code":"server_error"}}`)
	default:
		return []byte(`{"error":{"message":"Request failed","type":"api_error","code":"api_error"}}`)
	}
}

// SanitizeAnthropicError returns a generic error message (Anthropic format)
func SanitizeAnthropicError(statusCode int, originalError []byte) []byte {
	log.Printf("🔒 [TrollProxy] Original error (hidden): %s", string(originalError))

	// Special handling for 400 errors: check if it's an image dimension error
	if statusCode == 400 && isImageDimensionError(string(originalError)) {
		// Preserve the original error message for image dimension errors
		// These are actionable user errors that don't expose implementation details
		return originalError
	}

	switch statusCode {
	case 400:
		return []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"Bad request"}}`)
	case 401:
		return []byte(`{"type":"error","error":{"type":"authentication_error","message":"Authentication failed"}}`)
	case 402:
		// Story 4.2: Use insufficient_credits type for payment required errors
		return []byte(`{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Please purchase credits to continue."}}`)
	case 403:
		return []byte(`{"type":"error","error":{"type":"permission_error","message":"Access denied"}}`)
	case 404:
		return []byte(`{"type":"error","error":{"type":"not_found_error","message":"Resource not found"}}`)
	case 429:
		return []byte(`{"type":"error","error":{"type":"rate_limit_error","message":"Rate limit exceeded"}}`)
	case 500, 502, 503, 504:
		return []byte(`{"type":"error","error":{"type":"api_error","message":"Upstream service unavailable"}}`)
	default:
		return []byte(`{"type":"error","error":{"type":"api_error","message":"Request failed"}}`)
	}
}

// isImageDimensionError checks if a 400 error is related to image dimension validation
// Returns true if the error indicates an image exceeded maximum dimensions (8000 pixels)
func isImageDimensionError(errorStr string) bool {
	errorLower := strings.ToLower(errorStr)

	// Check for image dimension validation error indicators
	// These patterns match Anthropic's error format for oversized images
	return strings.Contains(errorLower, "image dimensions exceed") ||
		strings.Contains(errorLower, "exceed max allowed size") ||
		strings.Contains(errorLower, "image.source.base64.data")
}
