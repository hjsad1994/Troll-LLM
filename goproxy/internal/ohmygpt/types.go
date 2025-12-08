package ohmygpt

import (
	"log"
	"net/http"
)

// UsageCallback is called after a request completes with token usage data (with cache support)
type UsageCallback func(input, output, cacheWrite, cacheHit int64)

// Provider interface for upstream providers
type Provider interface {
	Name() string
	IsConfigured() bool
	ForwardRequest(body []byte, isStreaming bool) (*http.Response, error)
	HandleStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage UsageCallback)
	HandleNonStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage UsageCallback)
}

// sanitizeError returns a generic error message (OpenAI format)
func SanitizeError(statusCode int, originalError []byte) []byte {
	log.Printf("🔒 [TrollProxy] Original error (hidden): %s", string(originalError))
	switch statusCode {
	case 400:
		return []byte(`{"error":{"message":"Bad request","type":"invalid_request_error"}}`)
	case 401:
		return []byte(`{"error":{"message":"Authentication failed","type":"authentication_error"}}`)
	case 402:
		return []byte(`{"error":{"message":"Service temporarily unavailable. Please contact admin.","type":"service_error"}}`)
	case 403:
		return []byte(`{"error":{"message":"Access denied","type":"permission_error"}}`)
	case 404:
		return []byte(`{"error":{"message":"Resource not found","type":"not_found_error"}}`)
	case 429:
		return []byte(`{"error":{"message":"Rate limit exceeded","type":"rate_limit_error"}}`)
	case 500, 502, 503, 504:
		return []byte(`{"error":{"message":"Upstream service unavailable","type":"server_error"}}`)
	default:
		return []byte(`{"error":{"message":"Request failed","type":"api_error"}}`)
	}
}

// SanitizeAnthropicError returns a generic error message (Anthropic format)
func SanitizeAnthropicError(statusCode int, originalError []byte) []byte {
	log.Printf("🔒 [TrollProxy] Original error (hidden): %s", string(originalError))
	switch statusCode {
	case 400:
		return []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"Bad request"}}`)
	case 401:
		return []byte(`{"type":"error","error":{"type":"authentication_error","message":"Authentication failed"}}`)
	case 402:
		return []byte(`{"type":"error","error":{"type":"service_error","message":"Service temporarily unavailable. Please contact admin."}}`)
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
