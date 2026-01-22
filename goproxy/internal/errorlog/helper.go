package errorlog

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// sensitiveFields contains keys that should be redacted from logs
var sensitiveFields = []string{
	"password", "token", "apikey", "secret", "authorization",
	"api_key", "accesstoken", "refreshtoken", "credential",
	"privatekey", "private_key", "sessiontoken", "session_token",
}

// SanitizeBody recursively sanitizes sensitive fields from request/response body
func SanitizeBody(body interface{}) interface{} {
	return sanitizeBodyRecursive(body, 0)
}

func sanitizeBodyRecursive(body interface{}, depth int) interface{} {
	if body == nil || depth > 3 {
		return body
	}

	switch v := body.(type) {
	case map[string]interface{}:
		sanitized := make(map[string]interface{})
		for key, value := range v {
			lowerKey := strings.ToLower(key)
			if isSensitiveKey(lowerKey) {
				sanitized[key] = "[REDACTED]"
			} else {
				sanitized[key] = sanitizeBodyRecursive(value, depth+1)
			}
		}
		return sanitized
	case []interface{}:
		sanitized := make([]interface{}, len(v))
		for i, item := range v {
			sanitized[i] = sanitizeBodyRecursive(item, depth+1)
		}
		return sanitized
	default:
		return body
	}
}

func isSensitiveKey(key string) bool {
	for _, sensitive := range sensitiveFields {
		if strings.Contains(key, sensitive) {
			return true
		}
	}
	return false
}

// HTTPError writes an error response and logs it to MongoDB
// This is a drop-in replacement for http.Error with logging
func HTTPError(w http.ResponseWriter, r *http.Request, body string, statusCode int) {
	// Write the error response
	http.Error(w, body, statusCode)

	// Extract error message from body (try to parse JSON)
	errorMsg := extractErrorMessage(body)

	// Log asynchronously
	LogError(LogErrorParams{
		Request:      r,
		StatusCode:   statusCode,
		ErrorMessage: errorMsg,
	})
}

// HTTPErrorWithUser writes an error response with user context and logs it
func HTTPErrorWithUser(w http.ResponseWriter, r *http.Request, body string, statusCode int, userID, userKeyID string) {
	// Write the error response
	http.Error(w, body, statusCode)

	// Extract error message from body
	errorMsg := extractErrorMessage(body)

	// Log asynchronously with user context
	LogError(LogErrorParams{
		Request:      r,
		StatusCode:   statusCode,
		ErrorMessage: errorMsg,
		UserID:       userID,
		UserKeyID:    userKeyID,
	})
}

// HTTPErrorWithContext writes an error response with full context and logs it
func HTTPErrorWithContext(w http.ResponseWriter, r *http.Request, body string, statusCode int,
	userID, userKeyID string, requestBody interface{}, startTime time.Time) {

	// Write the error response
	http.Error(w, body, statusCode)

	// Extract error message from body
	errorMsg := extractErrorMessage(body)

	// Log asynchronously with full context (sanitize request body)
	LogError(LogErrorParams{
		Request:      r,
		StatusCode:   statusCode,
		ErrorMessage: errorMsg,
		UserID:       userID,
		UserKeyID:    userKeyID,
		RequestBody:  SanitizeBody(requestBody),
		LatencyMs:    time.Since(startTime).Milliseconds(),
	})
}

// JSONError writes a JSON error response and logs it to MongoDB
// Use this when you need to set Content-Type header before writing
func JSONError(w http.ResponseWriter, r *http.Request, body string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	w.Write([]byte(body))

	// Extract error message and log
	errorMsg := extractErrorMessage(body)
	LogError(LogErrorParams{
		Request:      r,
		StatusCode:   statusCode,
		ErrorMessage: errorMsg,
	})
}

// JSONErrorWithUser writes a JSON error response with user context and logs it
func JSONErrorWithUser(w http.ResponseWriter, r *http.Request, body string, statusCode int, userID, userKeyID string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	w.Write([]byte(body))

	// Extract error message and log with user context
	errorMsg := extractErrorMessage(body)
	LogError(LogErrorParams{
		Request:      r,
		StatusCode:   statusCode,
		ErrorMessage: errorMsg,
		UserID:       userID,
		UserKeyID:    userKeyID,
	})
}

// extractErrorMessage extracts error message from JSON body
func extractErrorMessage(body string) string {
	// Try to parse as JSON and extract error message
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(body), &parsed); err == nil {
		// OpenAI/Anthropic format: {"error": {"message": "..."}}
		if errObj, ok := parsed["error"].(map[string]interface{}); ok {
			if msg, ok := errObj["message"].(string); ok {
				return msg
			}
		}
		// Simple format: {"error": "..."}
		if errStr, ok := parsed["error"].(string); ok {
			return errStr
		}
		// Message format: {"message": "..."}
		if msg, ok := parsed["message"].(string); ok {
			return msg
		}
	}
	// Return original body if not parseable
	return body
}
