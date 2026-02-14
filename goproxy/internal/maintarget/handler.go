package maintarget

import (
	"bufio"
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/http2"
)

var (
	client     *http.Client
	clientOnce sync.Once

	serverURL string
	apiKey    string
)

func rewriteOpenAIModelField(rawJSON string, modelID string) (string, bool) {
	if modelID == "" {
		return rawJSON, false
	}

	valueRanges, ok := findTopLevelJSONStringFieldValueRanges(rawJSON, "model")
	if !ok || len(valueRanges) == 0 {
		return rawJSON, false
	}

	encodedModel, err := json.Marshal(modelID)
	if err != nil {
		return rawJSON, false
	}

	rewritten := rawJSON
	for i := len(valueRanges) - 1; i >= 0; i-- {
		r := valueRanges[i]
		rewritten = rewritten[:r[0]] + string(encodedModel) + rewritten[r[1]:]
	}

	return rewritten, true
}

func findTopLevelJSONStringFieldValueRanges(rawJSON string, fieldName string) ([][2]int, bool) {
	b := []byte(rawJSON)
	i := skipJSONWhitespace(b, 0)
	if i >= len(b) || b[i] != '{' {
		return nil, false
	}
	i++
	valueRanges := make([][2]int, 0, 1)

	for i < len(b) {
		i = skipJSONWhitespace(b, i)
		if i >= len(b) || b[i] == '}' {
			return valueRanges, true
		}

		if b[i] != '"' {
			return nil, false
		}

		keyStart := i
		keyEnd, ok := scanJSONStringEnd(b, i)
		if !ok {
			return nil, false
		}

		key, err := strconv.Unquote(string(b[keyStart:keyEnd]))
		if err != nil {
			return nil, false
		}

		i = skipJSONWhitespace(b, keyEnd)
		if i >= len(b) || b[i] != ':' {
			return nil, false
		}

		i = skipJSONWhitespace(b, i+1)
		if i >= len(b) {
			return nil, false
		}

		if key == fieldName && b[i] == '"' {
			valueEnd, ok := scanJSONStringEnd(b, i)
			if !ok {
				return nil, false
			}
			valueRanges = append(valueRanges, [2]int{i, valueEnd})
		}

		next, ok := skipJSONValue(b, i)
		if !ok {
			return nil, false
		}
		i = skipJSONWhitespace(b, next)

		if i >= len(b) {
			return nil, false
		}

		if b[i] == ',' {
			i++
			continue
		}

		if b[i] == '}' {
			return valueRanges, true
		}

		return nil, false
	}

	return nil, false
}

func skipJSONValue(b []byte, i int) (int, bool) {
	if i >= len(b) {
		return 0, false
	}

	switch b[i] {
	case '"':
		return scanJSONStringEnd(b, i)
	case '{':
		return skipJSONContainer(b, i, '{', '}')
	case '[':
		return skipJSONContainer(b, i, '[', ']')
	default:
		j := i
		for j < len(b) {
			if isJSONWhitespace(b[j]) || b[j] == ',' || b[j] == ']' || b[j] == '}' {
				break
			}
			j++
		}
		if j == i {
			return 0, false
		}
		return j, true
	}
}

func skipJSONContainer(b []byte, i int, open byte, close byte) (int, bool) {
	depth := 0
	inString := false
	escaped := false

	for j := i; j < len(b); j++ {
		c := b[j]

		if inString {
			if escaped {
				escaped = false
				continue
			}
			if c == '\\' {
				escaped = true
				continue
			}
			if c == '"' {
				inString = false
			}
			continue
		}

		if c == '"' {
			inString = true
			continue
		}

		if c == open {
			depth++
			continue
		}

		if c == close {
			depth--
			if depth == 0 {
				return j + 1, true
			}
		}
	}

	return 0, false
}

func scanJSONStringEnd(b []byte, i int) (int, bool) {
	if i >= len(b) || b[i] != '"' {
		return 0, false
	}

	for j := i + 1; j < len(b); j++ {
		if b[j] == '\\' {
			j++
			continue
		}
		if b[j] == '"' {
			return j + 1, true
		}
	}

	return 0, false
}

func skipJSONWhitespace(b []byte, i int) int {
	for i < len(b) && isJSONWhitespace(b[i]) {
		i++
	}
	return i
}

func isJSONWhitespace(c byte) bool {
	return c == ' ' || c == '\n' || c == '\r' || c == '\t'
}

// Configure sets the main target server URL and API key
func Configure(url, key string) {
	serverURL = strings.TrimSuffix(url, "/")
	apiKey = key
	log.Printf("✅ [MainTarget] Configured: %s", serverURL)
}

// IsConfigured returns true if main target is configured
func IsConfigured() bool {
	return serverURL != "" && apiKey != ""
}

// GetServerURL returns the configured server URL
func GetServerURL() string {
	return serverURL
}

func getClient() *http.Client {
	clientOnce.Do(func() {
		transport := &http.Transport{
			TLSClientConfig:       &tls.Config{MinVersion: tls.VersionTLS12},
			ForceAttemptHTTP2:     true,
			MaxIdleConns:          200,               // Increased from 100
			MaxIdleConnsPerHost:   50,                // Added - keep connections to main target
			MaxConnsPerHost:       100,               // Added - limit concurrent connections
			IdleConnTimeout:       120 * time.Second, // Increased from 90s
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
			DisableCompression:    false, // Enable compression
		}
		http2.ConfigureTransport(transport)
		client = &http.Client{Transport: transport, Timeout: 0}
		log.Printf("✅ [MainTarget] HTTP client initialized with optimized connection pool")
	})
	return client
}

// sanitizeError returns a generic error message (OpenAI format)
// Story 4.1: Added "code" field to all error responses for OpenAI SDK compatibility
func sanitizeError(statusCode int, originalError []byte) []byte {
	log.Printf("🔒 [MainTarget] Original error (hidden): %s", string(originalError))
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

// sanitizeAnthropicError returns a generic error message (Anthropic format)
func sanitizeAnthropicError(statusCode int, originalError []byte) []byte {
	log.Printf("🔒 [MainTarget] Original error (hidden): %s", string(originalError))
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

// ForwardRequest forwards Anthropic request to /v1/messages
func ForwardRequest(originalBody []byte, isStreaming bool) (*http.Response, error) {
	if !IsConfigured() {
		return nil, fmt.Errorf("main target not configured")
	}

	endpoint := serverURL + "/v1/messages"
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(originalBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	if isStreaming {
		req.Header.Set("Accept", "text/event-stream")
	}

	log.Printf("📤 [MainTarget] POST %s", endpoint)
	return getClient().Do(req)
}

// ForwardOpenAIRequest forwards OpenAI request to /v1/chat/completions
func ForwardOpenAIRequest(originalBody []byte, isStreaming bool) (*http.Response, error) {
	if !IsConfigured() {
		return nil, fmt.Errorf("main target not configured")
	}

	endpoint := serverURL + "/v1/chat/completions"
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(originalBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("x-api-key", apiKey)
	if isStreaming {
		req.Header.Set("Accept", "text/event-stream")
	}

	log.Printf("📤 [MainTarget-OpenAI] POST %s", endpoint)
	return getClient().Do(req)
}

// HandleStreamResponse handles Anthropic streaming response (passthrough)
func HandleStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage func(input, output, cacheWrite, cacheHit int64)) {
	HandleStreamResponseWithPrefix(w, resp, onUsage, "MainTarget")
}

// HandleStreamResponseWithPrefix handles Anthropic streaming response with custom log prefix
func HandleStreamResponseWithPrefix(w http.ResponseWriter, resp *http.Response, onUsage func(input, output, cacheWrite, cacheHit int64), logPrefix string) {
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [%s] Error %d", logPrefix, resp.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(sanitizeAnthropicError(resp.StatusCode, body))
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"streaming not supported"}}`, http.StatusInternalServerError)
		return
	}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 1024*1024), 10*1024*1024)

	var totalInput, totalOutput, totalCacheWrite, totalCacheHit int64
	var eventCount int64
	var lastEventType string

	for scanner.Scan() {
		eventCount++
		line := scanner.Text()

		// Extract usage from events
		if strings.HasPrefix(line, "data: ") {
			dataStr := strings.TrimPrefix(line, "data: ")
			var event map[string]interface{}
			if json.Unmarshal([]byte(dataStr), &event) == nil {
				eventType, _ := event["type"].(string)
				if eventType != "" {
					lastEventType = eventType
				}

				// message_start may contain input tokens and cache tokens (standard Anthropic)
				if eventType == "message_start" {
					if message, ok := event["message"].(map[string]interface{}); ok {
						if usage, ok := message["usage"].(map[string]interface{}); ok {
							if v, ok := usage["input_tokens"].(float64); ok && v > 0 {
								totalInput = int64(v)
							}
							if v, ok := usage["cache_creation_input_tokens"].(float64); ok {
								totalCacheWrite = int64(v)
							}
							if v, ok := usage["cache_read_input_tokens"].(float64); ok {
								totalCacheHit = int64(v)
							}
						}
					}
				}

				// message_delta contains output tokens and may contain all usage (MainTarget format)
				if eventType == "message_delta" {
					if usage, ok := event["usage"].(map[string]interface{}); ok {
						if v, ok := usage["input_tokens"].(float64); ok && v > 0 {
							totalInput = int64(v)
						}
						if v, ok := usage["output_tokens"].(float64); ok {
							totalOutput = int64(v)
						}
						if v, ok := usage["cache_creation_input_tokens"].(float64); ok {
							totalCacheWrite = int64(v)
						}
						if v, ok := usage["cache_read_input_tokens"].(float64); ok {
							totalCacheHit = int64(v)
						}
					}
				}
			}
		}

		fmt.Fprintf(w, "%s\n", line)
		flusher.Flush()
	}

	// Check for scanner errors (connection issues, truncation, etc)
	if err := scanner.Err(); err != nil {
		log.Printf("❌ [%s] Scanner error: %v (in=%d out=%d, events=%d, lastEvent=%s)", logPrefix, err, totalInput, totalOutput, eventCount, lastEventType)
		// Send generic error event to client (don't expose internal error)
		errorEvent := `event: error
data: {"type":"error","error":{"type":"stream_error","message":"Stream interrupted"}}

`
		fmt.Fprint(w, errorEvent)
		flusher.Flush()
		return
	}

	log.Printf("📊 [%s] Stream completed: events=%d lastEvent=%s", logPrefix, eventCount, lastEventType)
	log.Printf("📊 [%s] Usage: in=%d out=%d cacheW=%d cacheH=%d", logPrefix, totalInput, totalOutput, totalCacheWrite, totalCacheHit)
	if onUsage != nil && (totalInput > 0 || totalOutput > 0) {
		onUsage(totalInput, totalOutput, totalCacheWrite, totalCacheHit)
	}
}

// HandleNonStreamResponse handles Anthropic non-streaming response (passthrough)
func HandleNonStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage func(input, output, cacheWrite, cacheHit int64)) {
	HandleNonStreamResponseWithPrefix(w, resp, onUsage, "MainTarget")
}

// HandleNonStreamResponseWithPrefix handles Anthropic non-streaming response with custom log prefix
func HandleNonStreamResponseWithPrefix(w http.ResponseWriter, resp *http.Response, onUsage func(input, output, cacheWrite, cacheHit int64), logPrefix string) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"failed to read response"}}`, http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ [%s] Error %d", logPrefix, resp.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(sanitizeAnthropicError(resp.StatusCode, body))
		return
	}

	// Extract usage
	var response map[string]interface{}
	if json.Unmarshal(body, &response) == nil {
		if usage, ok := response["usage"].(map[string]interface{}); ok {
			var input, output, cacheWrite, cacheHit int64
			if v, ok := usage["input_tokens"].(float64); ok {
				input = int64(v)
			}
			if v, ok := usage["output_tokens"].(float64); ok {
				output = int64(v)
			}
			if v, ok := usage["cache_creation_input_tokens"].(float64); ok {
				cacheWrite = int64(v)
			}
			if v, ok := usage["cache_read_input_tokens"].(float64); ok {
				cacheHit = int64(v)
			}
			log.Printf("📊 [%s] Usage: in=%d out=%d cacheW=%d cacheH=%d", logPrefix, input, output, cacheWrite, cacheHit)
			if onUsage != nil {
				onUsage(input, output, cacheWrite, cacheHit)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(body)
}

// HandleOpenAIStreamResponse handles OpenAI streaming response (passthrough)
func HandleOpenAIStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, onUsage func(input, output, cacheWrite, cacheHit int64)) {
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [MainTarget-OpenAI] Error %d", resp.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(sanitizeError(resp.StatusCode, body))
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, `{"error":"streaming not supported"}`, http.StatusInternalServerError)
		return
	}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 1024*1024), 10*1024*1024)

	var totalInput, totalOutput int64
	var estimatedOutputChars int64 // Count output characters for estimation

	for scanner.Scan() {
		line := scanner.Text()

		// Extract usage from events
		if strings.HasPrefix(line, "data: ") {
			dataStr := strings.TrimPrefix(line, "data: ")
			if dataStr != "[DONE]" {
				var event map[string]interface{}
				if json.Unmarshal([]byte(dataStr), &event) == nil {
					// Check if this event contains usage
					if usage, ok := event["usage"].(map[string]interface{}); ok {
						if v, ok := usage["prompt_tokens"].(float64); ok {
							totalInput = int64(v)
						}
						if v, ok := usage["completion_tokens"].(float64); ok {
							totalOutput = int64(v)
						}
					}

					// Count output characters from delta content (for estimation)
					if choices, ok := event["choices"].([]interface{}); ok && len(choices) > 0 {
						if choice, ok := choices[0].(map[string]interface{}); ok {
							if delta, ok := choice["delta"].(map[string]interface{}); ok {
								if content, ok := delta["content"].(string); ok {
									estimatedOutputChars += int64(len(content))
								}
							}
						}
					}

					if modelID != "" {
						if rewritten, ok := rewriteOpenAIModelField(dataStr, modelID); ok {
							line = "data: " + rewritten
						}
					}
				}
			}
		}

		fmt.Fprintf(w, "%s\n", line)
		flusher.Flush()
	}

	// Check for scanner errors (connection issues, truncation, etc)
	if err := scanner.Err(); err != nil {
		log.Printf("❌ [MainTarget-OpenAI] Scanner error detected: %v", err)
		// Send error event to client
		errorEvent := fmt.Sprintf("data: {\"error\":{\"message\":\"Stream interrupted: %v\",\"type\":\"stream_error\"}}\n\n", err)
		fmt.Fprint(w, errorEvent)
		flusher.Flush()
		return
	}

	// If no usage data from stream, estimate output tokens from content
	if totalOutput == 0 && estimatedOutputChars > 0 {
		totalOutput = estimatedOutputChars / 4 // Rough: 1 token ≈ 4 chars
		if totalOutput < 1 {
			totalOutput = 1
		}
		log.Printf("⚠️ [MainTarget-OpenAI] Estimated output tokens: %d (from %d chars)", totalOutput, estimatedOutputChars)
	}

	log.Printf("📊 [MainTarget-OpenAI] Stream completed: in=%d out=%d", totalInput, totalOutput)
	if onUsage != nil {
		onUsage(totalInput, totalOutput, 0, 0)
	}
}

// HandleOpenAINonStreamResponse handles OpenAI non-streaming response (passthrough)
func HandleOpenAINonStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, onUsage func(input, output, cacheWrite, cacheHit int64)) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read response"}`, http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ [MainTarget-OpenAI] Error %d", resp.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(sanitizeError(resp.StatusCode, body))
		return
	}

	// Extract usage
	var response map[string]interface{}
	if json.Unmarshal(body, &response) == nil {
		if usage, ok := response["usage"].(map[string]interface{}); ok {
			var input, output int64
			if v, ok := usage["prompt_tokens"].(float64); ok {
				input = int64(v)
			}
			if v, ok := usage["completion_tokens"].(float64); ok {
				output = int64(v)
			}
			log.Printf("📊 [MainTarget-OpenAI] Usage: in=%d out=%d", input, output)
			if onUsage != nil {
				onUsage(input, output, 0, 0)
			}
		}

		if modelID != "" {
			if rewritten, ok := rewriteOpenAIModelField(string(body), modelID); ok {
				body = []byte(rewritten)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(body)
}
