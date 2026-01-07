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
		return []byte(`{"error":{"message":"Bad request","type":"invalid_request_error","code":"invalid_request_error"}}`)
	case 401:
		return []byte(`{"error":{"message":"Authentication failed","type":"authentication_error","code":"invalid_api_key"}}`)
	case 402:
		return []byte(`{"error":{"message":"Upstream service error. Please try again.","type":"upstream_error","code":"upstream_error"}}`)
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
	switch statusCode {
	case 400:
		return []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"Bad request"}}`)
	case 401:
		return []byte(`{"type":"error","error":{"type":"authentication_error","message":"Authentication failed"}}`)
	case 402:
		return []byte(`{"type":"error","error":{"type":"upstream_error","message":"Upstream service error. Please try again."}}`)
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
