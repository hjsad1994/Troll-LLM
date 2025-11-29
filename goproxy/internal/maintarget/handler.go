package maintarget

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/andybalholm/brotli"
	"golang.org/x/net/http2"
)

var (
	client     *http.Client
	clientOnce sync.Once
	
	// Configuration
	serverURL string
	apiKey    string
)

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
			Timeout:   0, // No timeout for streaming
		}
	})
	return client
}

// Model name mapping: TrollLLM model ID -> Main target model name
var modelMapping = map[string]string{
	"claude-sonnet-4-5-20250929": "claude-sonnet-4.5",
	"claude-haiku-4-5-20251001":  "claude-haiku-4.5",
}

// ForwardRequest forwards request to main target and returns response
// Maps model names to main target format
func ForwardRequest(originalBody []byte, isStreaming bool) (*http.Response, error) {
	if !IsConfigured() {
		return nil, fmt.Errorf("main target not configured")
	}

	// Map model name if needed
	var reqData map[string]interface{}
	if err := json.Unmarshal(originalBody, &reqData); err == nil {
		if model, ok := reqData["model"].(string); ok {
			if mappedModel, exists := modelMapping[model]; exists {
				reqData["model"] = mappedModel
				log.Printf("🔄 [MainTarget] Model mapped: %s -> %s", model, mappedModel)
				originalBody, _ = json.Marshal(reqData)
			}
		}
	}

	endpoint := serverURL + "/v1/messages"
	
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(originalBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers for Anthropic API
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	if isStreaming {
		req.Header.Set("Accept", "text/event-stream")
	} else {
		req.Header.Set("Accept", "application/json")
	}

	log.Printf("📤 [MainTarget] POST %s", endpoint)
	log.Printf("📤 [MainTarget] Headers: x-api-key=%s..., anthropic-version=2023-06-01", apiKey[:min(8, len(apiKey))])
	// Log request body (truncated for large requests)
	if len(originalBody) < 1000 {
		log.Printf("📤 [MainTarget] Body: %s", string(originalBody))
	} else {
		log.Printf("📤 [MainTarget] Body (truncated): %s...", string(originalBody[:1000]))
	}
	
	return getClient().Do(req)
}

// HandleStreamResponse handles streaming response from main target
func HandleStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage func(input, output, cacheWrite, cacheHit int64)) {
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [MainTarget] Error %d: %s", resp.StatusCode, string(body))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
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
	
	var totalInput, totalOutput, totalCacheWrite, totalCacheHit int64
	eventCount := 0

	for scanner.Scan() {
		line := scanner.Text()
		eventCount++
		
		// Extract usage from SSE events
		if strings.HasPrefix(line, "data: ") {
			dataStr := strings.TrimPrefix(line, "data: ")
			var event map[string]interface{}
			if json.Unmarshal([]byte(dataStr), &event) == nil {
				eventType, _ := event["type"].(string)
				
				// Capture usage from message_start
				if eventType == "message_start" {
					if msg, ok := event["message"].(map[string]interface{}); ok {
						if usage, ok := msg["usage"].(map[string]interface{}); ok {
							log.Printf("📊 [MainTarget] message_start usage: %+v", usage)
							if v, ok := usage["input_tokens"].(float64); ok {
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
				
				// Capture usage from message_delta (main target sends all usage here)
				if eventType == "message_delta" {
					if usage, ok := event["usage"].(map[string]interface{}); ok {
						log.Printf("📊 [MainTarget] message_delta usage: %+v", usage)
						if v, ok := usage["input_tokens"].(float64); ok {
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

	if err := scanner.Err(); err != nil {
		log.Printf("❌ [MainTarget] Stream error: %v", err)
	} else {
		log.Printf("✅ [MainTarget] Stream completed: %d events", eventCount)
	}

	// Report usage
	log.Printf("📊 [MainTarget] Final usage: input=%d, output=%d, cacheWrite=%d, cacheHit=%d", 
		totalInput, totalOutput, totalCacheWrite, totalCacheHit)
	if onUsage != nil && (totalInput > 0 || totalOutput > 0) {
		onUsage(totalInput, totalOutput, totalCacheWrite, totalCacheHit)
	}
}

// HandleNonStreamResponse handles non-streaming response from main target
func HandleNonStreamResponse(w http.ResponseWriter, resp *http.Response, onUsage func(input, output, cacheWrite, cacheHit int64)) {
	body, err := readResponseBody(resp)
	if err != nil {
		log.Printf("❌ [MainTarget] Read error: %v", err)
		http.Error(w, `{"error":"failed to read response"}`, http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ [MainTarget] Error %d: %s", resp.StatusCode, string(body))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
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
			if onUsage != nil {
				onUsage(input, output, cacheWrite, cacheHit)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
	log.Printf("✅ [MainTarget] Response: %d bytes", len(body))
}

func readResponseBody(resp *http.Response) ([]byte, error) {
	var reader io.Reader = resp.Body
	switch resp.Header.Get("Content-Encoding") {
	case "gzip":
		gr, err := gzip.NewReader(resp.Body)
		if err != nil {
			return nil, err
		}
		defer gr.Close()
		reader = gr
	case "br":
		reader = brotli.NewReader(resp.Body)
	}
	return io.ReadAll(reader)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
