package troll2

import (
	"bufio"
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/http2"
)

var (
	client     *http.Client
	clientOnce sync.Once

	// Configuration
	serverURL string
	apiKey    string
)

// Configure sets the MegaLLM server URL and API key
func Configure(url, key string) {
	serverURL = strings.TrimSuffix(url, "/")
	apiKey = key
	log.Printf("✅ [Troll-2] Configured: %s", serverURL)
}

// IsConfigured returns true if MegaLLM is configured
func IsConfigured() bool {
	return serverURL != "" && apiKey != ""
}

// GetServerURL returns the configured server URL
func GetServerURL() string {
	return serverURL
}

func getClient() *http.Client {
	clientOnce.Do(func() {
		tlsConfig := &tls.Config{
			MinVersion: tls.VersionTLS12,
			MaxVersion: tls.VersionTLS13,
		}
		transport := &http.Transport{
			TLSClientConfig:       tlsConfig,
			ForceAttemptHTTP2:     true,
			MaxIdleConns:          100,
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
		}
		http2.ConfigureTransport(transport)
		client = &http.Client{
			Transport: transport,
			Timeout:   0,
		}
	})
	return client
}

// ForwardRequest forwards request to MegaLLM and returns response
func ForwardRequest(originalBody []byte, isStreaming bool) (*http.Response, error) {
	if !IsConfigured() {
		return nil, fmt.Errorf("MegaLLM not configured")
	}

	endpoint := serverURL + "/v1/chat/completions"

	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(originalBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	if isStreaming {
		req.Header.Set("Accept", "text/event-stream")
	}

	log.Printf("📤 [Troll-2] POST %s", endpoint)

	return getClient().Do(req)
}

// sanitizeError returns a generic error message without revealing upstream details
func sanitizeError(statusCode int, originalError []byte) []byte {
	// Log original error for debugging
	log.Printf("🔒 [Troll-2] Original error (hidden): %s", string(originalError))
	
	// Return generic error based on status code
	switch statusCode {
	case 400:
		return []byte(`{"error":{"message":"Bad request","type":"invalid_request_error"}}`)
	case 401:
		return []byte(`{"error":{"message":"Authentication failed","type":"authentication_error"}}`)
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

// sanitizeAnthropicError returns a generic Anthropic-format error
func sanitizeAnthropicError(statusCode int, originalError []byte) []byte {
	log.Printf("🔒 [Troll-2] Original error (hidden): %s", string(originalError))
	
	switch statusCode {
	case 400:
		return []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"Bad request"}}`)
	case 401:
		return []byte(`{"type":"error","error":{"type":"authentication_error","message":"Authentication failed"}}`)
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

// HandleStreamResponse handles streaming response from MegaLLM
func HandleStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage func(input, output int64)) {
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [Troll-2] Error %d", resp.StatusCode)
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
	eventCount := 0

	for scanner.Scan() {
		line := scanner.Text()
		eventCount++

		// Extract usage from SSE events
		if strings.HasPrefix(line, "data: ") {
			dataStr := strings.TrimPrefix(line, "data: ")
			if dataStr != "[DONE]" {
				var event map[string]interface{}
				if json.Unmarshal([]byte(dataStr), &event) == nil {
					if usage, ok := event["usage"].(map[string]interface{}); ok {
						if v, ok := usage["prompt_tokens"].(float64); ok {
							totalInput = int64(v)
						}
						if v, ok := usage["completion_tokens"].(float64); ok {
							totalOutput = int64(v)
						}
					}
				}
			}
		}

		fmt.Fprintf(w, "%s\n", line)
		flusher.Flush()
	}

	if err := scanner.Err(); err != nil {
		log.Printf("❌ [Troll-2] Stream error: %v", err)
	} else {
		log.Printf("✅ [Troll-2] Stream completed: %d events", eventCount)
	}

	log.Printf("📊 [Troll-2] Final usage: input=%d, output=%d", totalInput, totalOutput)
	if onUsage != nil && (totalInput > 0 || totalOutput > 0) {
		onUsage(totalInput, totalOutput)
	}
}

// HandleNonStreamResponse handles non-streaming response from MegaLLM
func HandleNonStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage func(input, output int64)) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ [Troll-2] Read error: %v", err)
		http.Error(w, `{"error":"failed to read response"}`, http.StatusInternalServerError)
		return
	}

	// Debug: log raw response
	logLen := len(body)
	if logLen > 500 {
		logLen = 500
	}
	log.Printf("🔍 [Troll-2] Raw response (%d bytes): %s", len(body), string(body[:logLen]))

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ [Troll-2] Error %d", resp.StatusCode)
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
			log.Printf("📊 [Troll-2] Usage: input=%d, output=%d", input, output)
			if onUsage != nil {
				onUsage(input, output)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(body)
	log.Printf("✅ [Troll-2] Response: %d bytes", len(body))
}

// HandleStreamResponseAnthropic handles streaming response and transforms OpenAI -> Anthropic format
func HandleStreamResponseAnthropic(w http.ResponseWriter, resp *http.Response, modelID string, onUsage func(input, output int64)) {
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [Troll-2] Error %d", resp.StatusCode)
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

	var totalInput, totalOutput int64
	eventCount := 0
	messageID := fmt.Sprintf("msg_%d", time.Now().UnixNano())
	sentStart := false

	for scanner.Scan() {
		line := scanner.Text()

		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		dataStr := strings.TrimPrefix(line, "data: ")
		if dataStr == "[DONE]" {
			// Send content_block_stop
			stopEvent := map[string]interface{}{
				"type":  "content_block_stop",
				"index": 0,
			}
			stopJSON, _ := json.Marshal(stopEvent)
			fmt.Fprintf(w, "event: content_block_stop\ndata: %s\n\n", stopJSON)
			flusher.Flush()

			// Send message_delta with stop_reason
			deltaEvent := map[string]interface{}{
				"type": "message_delta",
				"delta": map[string]interface{}{
					"stop_reason":   "end_turn",
					"stop_sequence": nil,
				},
				"usage": map[string]interface{}{
					"output_tokens": totalOutput,
				},
			}
			deltaJSON, _ := json.Marshal(deltaEvent)
			fmt.Fprintf(w, "event: message_delta\ndata: %s\n\n", deltaJSON)
			flusher.Flush()

			// Send message_stop
			fmt.Fprintf(w, "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n")
			flusher.Flush()
			continue
		}

		var event map[string]interface{}
		if err := json.Unmarshal([]byte(dataStr), &event); err != nil {
			continue
		}

		eventCount++

		// Extract usage
		if usage, ok := event["usage"].(map[string]interface{}); ok {
			if v, ok := usage["prompt_tokens"].(float64); ok {
				totalInput = int64(v)
			}
			if v, ok := usage["completion_tokens"].(float64); ok {
				totalOutput = int64(v)
			}
		}

		// Send message_start on first event
		if !sentStart {
			startEvent := map[string]interface{}{
				"type": "message_start",
				"message": map[string]interface{}{
					"id":           messageID,
					"type":         "message",
					"role":         "assistant",
					"content":      []interface{}{},
					"model":        modelID,
					"stop_reason":  nil,
					"stop_sequence": nil,
					"usage": map[string]interface{}{
						"input_tokens":  totalInput,
						"output_tokens": 0,
					},
				},
			}
			startJSON, _ := json.Marshal(startEvent)
			fmt.Fprintf(w, "event: message_start\ndata: %s\n\n", startJSON)
			flusher.Flush()

			// Send content_block_start
			blockStart := map[string]interface{}{
				"type":          "content_block_start",
				"index":         0,
				"content_block": map[string]interface{}{"type": "text", "text": ""},
			}
			blockStartJSON, _ := json.Marshal(blockStart)
			fmt.Fprintf(w, "event: content_block_start\ndata: %s\n\n", blockStartJSON)
			flusher.Flush()

			sentStart = true
		}

		// Extract content from OpenAI format
		if choices, ok := event["choices"].([]interface{}); ok && len(choices) > 0 {
			if choice, ok := choices[0].(map[string]interface{}); ok {
				if delta, ok := choice["delta"].(map[string]interface{}); ok {
					if content, ok := delta["content"].(string); ok && content != "" {
						// Send content_block_delta
						deltaEvent := map[string]interface{}{
							"type":  "content_block_delta",
							"index": 0,
							"delta": map[string]interface{}{
								"type": "text_delta",
								"text": content,
							},
						}
						deltaJSON, _ := json.Marshal(deltaEvent)
						fmt.Fprintf(w, "event: content_block_delta\ndata: %s\n\n", deltaJSON)
						flusher.Flush()
					}
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("❌ [Troll-2] Stream error: %v", err)
	} else {
		log.Printf("✅ [Troll-2] Anthropic stream completed: %d events", eventCount)
	}

	log.Printf("📊 [Troll-2] Final usage: input=%d, output=%d", totalInput, totalOutput)
	if onUsage != nil && (totalInput > 0 || totalOutput > 0) {
		onUsage(totalInput, totalOutput)
	}
}

// HandleNonStreamResponseAnthropic handles non-streaming response and transforms OpenAI -> Anthropic format
func HandleNonStreamResponseAnthropic(w http.ResponseWriter, resp *http.Response, modelID string, onUsage func(input, output int64)) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ [Troll-2] Read error: %v", err)
		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"failed to read response"}}`, http.StatusInternalServerError)
		return
	}

	// Debug: log raw response
	logLen := len(body)
	if logLen > 500 {
		logLen = 500
	}
	log.Printf("🔍 [Troll-2-Anthropic] Raw response (%d bytes): %s", len(body), string(body[:logLen]))

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ [Troll-2] Error %d", resp.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(sanitizeAnthropicError(resp.StatusCode, body))
		return
	}

	// Parse OpenAI response
	var openaiResp map[string]interface{}
	if err := json.Unmarshal(body, &openaiResp); err != nil {
		log.Printf("❌ [Troll-2] Parse error: %v, body: %s", err, string(body[:logLen]))
		http.Error(w, `{"type":"error","error":{"type":"server_error","message":"failed to parse response"}}`, http.StatusInternalServerError)
		return
	}

	// Extract content from OpenAI format
	var content string
	if choices, ok := openaiResp["choices"].([]interface{}); ok && len(choices) > 0 {
		if choice, ok := choices[0].(map[string]interface{}); ok {
			if message, ok := choice["message"].(map[string]interface{}); ok {
				if c, ok := message["content"].(string); ok {
					content = c
				}
			}
		}
	}

	// Extract usage
	var inputTokens, outputTokens int64
	if usage, ok := openaiResp["usage"].(map[string]interface{}); ok {
		if v, ok := usage["prompt_tokens"].(float64); ok {
			inputTokens = int64(v)
		}
		if v, ok := usage["completion_tokens"].(float64); ok {
			outputTokens = int64(v)
		}
	}

	// Build Anthropic response
	anthropicResp := map[string]interface{}{
		"id":   fmt.Sprintf("msg_%d", time.Now().UnixNano()),
		"type": "message",
		"role": "assistant",
		"content": []map[string]interface{}{
			{"type": "text", "text": content},
		},
		"model":         modelID,
		"stop_reason":   "end_turn",
		"stop_sequence": nil,
		"usage": map[string]interface{}{
			"input_tokens":  inputTokens,
			"output_tokens": outputTokens,
		},
	}

	respJSON, _ := json.Marshal(anthropicResp)

	log.Printf("📊 [Troll-2] Usage: input=%d, output=%d", inputTokens, outputTokens)
	if onUsage != nil {
		onUsage(inputTokens, outputTokens)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(respJSON)
	log.Printf("✅ [Troll-2] Anthropic response: %d bytes", len(respJSON))
}
