package glm

import (
	"bufio"
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"goproxy/config"
	"goproxy/internal/openhands"

	"golang.org/x/net/http2"
)

const (
	GLMName        = "glm"
	DefaultGLMEndpoint = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
)

// GLMProvider implements Provider interface for GLM API
type GLMProvider struct {
	apiKey     string
	endpoint   string
	client     *http.Client
	mu         sync.Mutex
	originalModel string // Stores the original model name for rewriting responses
}

var glmInstance *GLMProvider
var glmOnce sync.Once

// GetGLM returns the singleton GLM provider instance
func GetGLM() *GLMProvider {
	glmOnce.Do(func() {
		glmInstance = &GLMProvider{}
	})
	return glmInstance
}

// ConfigureGLM initializes the GLM provider with environment variables
func ConfigureGLM() error {
	provider := GetGLM()
	provider.client = createGLMClient()

	apiKey := os.Getenv("GLM_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("GLM_API_KEY not set")
	}
	provider.apiKey = apiKey

	endpoint := os.Getenv("GLM_ENDPOINT")
	if endpoint == "" {
		endpoint = DefaultGLMEndpoint
	}
	provider.endpoint = endpoint

	log.Printf("✅ [GLM Provider] Initialized with endpoint: %s", endpoint)
	return nil
}

// Name returns the provider name
func (p *GLMProvider) Name() string {
	return GLMName
}

// IsConfigured returns true if the provider is configured
func (p *GLMProvider) IsConfigured() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.apiKey != "" && p.client != nil
}

// getEndpoint returns the configured endpoint
func (p *GLMProvider) getEndpoint() string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.endpoint
}

// getAPIKey returns the configured API key
func (p *GLMProvider) getAPIKey() string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.apiKey
}

// mapToGLMModel maps Claude model names to GLM model names
func mapToGLMModel(claudeModel string) string {
	// All Claude models map to glm-4.7
	return "glm-4.7"
}

// ForwardRequest forwards request to GLM API with model mapping
func (p *GLMProvider) ForwardRequest(body []byte, isStreaming bool, originalModel string) (*http.Response, error) {
	if !p.IsConfigured() {
		return nil, fmt.Errorf("GLM not configured")
	}

	// Store original model for response rewriting
	p.mu.Lock()
	p.originalModel = originalModel
	p.mu.Unlock()

	// Detect endpoint format
	endpoint := p.getEndpoint()
	isAnthropicFormat := strings.HasSuffix(endpoint, "/v1/messages")

	if isAnthropicFormat {
		// For Anthropic format endpoint, forward original body with model mapping
		log.Printf("🔍 [GLM Provider] Using Anthropic format endpoint")

		var req map[string]interface{}
		if err := json.Unmarshal(body, &req); err != nil {
			return nil, fmt.Errorf("failed to parse request body: %w", err)
		}

		// Map to GLM model
		req["model"] = mapToGLMModel(originalModel)

		// Filter out system messages - Z.ai API only accepts 'user' and 'assistant'
		if messages, ok := req["messages"].([]interface{}); ok {
			filteredMessages := make([]interface{}, 0)
			for _, msg := range messages {
				if msgMap, ok := msg.(map[string]interface{}); ok {
					role, _ := msgMap["role"].(string)
					// Skip system messages, only keep user and assistant
					if role == "user" || role == "assistant" {
						filteredMessages = append(filteredMessages, msg)
					} else {
						log.Printf("🔍 [GLM Provider] Filtered out %s message (Z.ai doesn't support it)", role)
					}
				}
			}
			req["messages"] = filteredMessages
		}

		// Handle system prompt - if exists, prepend to first user message
		if system, ok := req["system"].(string); ok && system != "" {
			if messages, ok := req["messages"].([]interface{}); ok && len(messages) > 0 {
				// Prepend system prompt to first user message
				if firstMsg, ok := messages[0].(map[string]interface{}); ok {
					if firstRole, _ := firstMsg["role"].(string); firstRole == "user" {
						if content, ok := firstMsg["content"].(string); ok {
							firstMsg["content"] = system + "\n\n" + content
							log.Printf("🔍 [GLM Provider] Prepended system prompt to first user message")
						}
					}
				}
			}
			// Remove system field from request
			delete(req, "system")
		}

		modifiedBody, err := json.Marshal(req)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal modified request: %w", err)
		}

		log.Printf("🔍 [GLM Provider] Anthropic format request: %s", string(modifiedBody))
		return p.forwardToEndpoint(endpoint, modifiedBody, isStreaming)
	}

	// OpenAI format endpoint
	log.Printf("🔍 [GLM Provider] Using OpenAI format endpoint")

	var req map[string]interface{}
	if err := json.Unmarshal(body, &req); err != nil {
		return nil, fmt.Errorf("failed to parse request body: %w", err)
	}

	// Map to GLM model
	req["model"] = mapToGLMModel(originalModel)

	// DEBUG: Log request body
	log.Printf("🔍 [GLM Provider] Original request body: %s", string(body))
	log.Printf("🔍 [GLM Provider] Modified request body: %s", req)

	// Marshal the modified request
	modifiedBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal modified request: %w", err)
	}

	log.Printf("🔍 [GLM Provider] Final JSON to send: %s", string(modifiedBody))

	return p.forwardToEndpoint(endpoint, modifiedBody, isStreaming)
}

// forwardToEndpoint forwards request to GLM API endpoint
func (p *GLMProvider) forwardToEndpoint(endpoint string, body []byte, isStreaming bool) (*http.Response, error) {
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.getAPIKey())

	// Add User-Agent from config
	if userAgent := config.GetUserAgent(); userAgent != "" {
		req.Header.Set("User-Agent", userAgent)
	}

	// Add common headers
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	if isStreaming {
		req.Header.Set("Accept", "text/event-stream")
	} else {
		req.Header.Set("Accept", "application/json")
	}

	log.Printf("📤 [GLM Provider] POST %s (stream=%v)", endpoint, isStreaming)

	startTime := time.Now()
	resp, err := p.client.Do(req)
	elapsed := time.Since(startTime)
	if err != nil {
		log.Printf("⏱️ [GLM Provider] Request failed after %v: %v", elapsed, err)
		return nil, err
	}

	// Check for HTTP errors
	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [GLM Provider] Error %d: %s", resp.StatusCode, string(bodyBytes))
		// Return sanitized error response
		resp.Body = io.NopCloser(bytes.NewReader(openhands.SanitizeError(resp.StatusCode, bodyBytes)))
	}

	return resp, nil
}

// HandleStreamResponse handles streaming response from GLM with model name rewriting
func (p *GLMProvider) HandleStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, onUsage openhands.UsageCallback) {
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [GLM Provider] Error %d", resp.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(openhands.SanitizeError(resp.StatusCode, body))
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

	var totalInput, totalOutput, cacheCreation, cacheRead int64

	for scanner.Scan() {
		line := scanner.Text()

		// Extract usage from data lines
		if strings.HasPrefix(line, "data: ") {
			dataStr := strings.TrimPrefix(line, "data: ")
			if dataStr != "[DONE]" {
				var event map[string]interface{}
				if json.Unmarshal([]byte(dataStr), &event) == nil {
					// Rewrite model name in response
					p.mu.Lock()
					originalModel := p.originalModel
					p.mu.Unlock()

					if originalModel != "" {
						event["model"] = originalModel
					}

					// Extract usage
					if usage, ok := event["usage"].(map[string]interface{}); ok {
						if v, ok := usage["prompt_tokens"].(float64); ok {
							totalInput = int64(v)
						}
						if v, ok := usage["completion_tokens"].(float64); ok {
							totalOutput = int64(v)
						}
					}

					// Marshal back to JSON with rewritten model name
					modifiedData, _ := json.Marshal(event)
					line = "data: " + string(modifiedData)
				}
			}
		}

		fmt.Fprintf(w, "%s\n", line)
		flusher.Flush()
	}

	if err := scanner.Err(); err != nil {
		log.Printf("⚠️ [GLM Provider] Scanner error: %v", err)
	}

	log.Printf("📊 [GLM Provider] Usage: in=%d out=%d", totalInput, totalOutput)
	if onUsage != nil && (totalInput > 0 || totalOutput > 0) {
		onUsage(totalInput, totalOutput, cacheCreation, cacheRead)
	}
}

// HandleNonStreamResponse handles non-streaming response from GLM with model name rewriting
func (p *GLMProvider) HandleNonStreamResponse(w http.ResponseWriter, resp *http.Response, modelID string, onUsage openhands.UsageCallback) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read response"}`, http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ [GLM Provider] Error %d", resp.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(openhands.SanitizeError(resp.StatusCode, body))
		return
	}

	// Parse and rewrite model name in response
	var response map[string]interface{}
	if json.Unmarshal(body, &response) == nil {
		p.mu.Lock()
		originalModel := p.originalModel
		p.mu.Unlock()

		if originalModel != "" {
			response["model"] = originalModel
		}

		// Extract usage
		if usage, ok := response["usage"].(map[string]interface{}); ok {
			var input, output int64
			if v, ok := usage["prompt_tokens"].(float64); ok {
				input = int64(v)
			}
			if v, ok := usage["completion_tokens"].(float64); ok {
				output = int64(v)
			}

			log.Printf("📊 [GLM Provider] Usage: in=%d out=%d", input, output)
			if onUsage != nil && (input > 0 || output > 0) {
				onUsage(input, output, 0, 0)
			}
		}

		// Marshal back with rewritten model name
		body, _ = json.Marshal(response)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(body)
}

func createGLMClient() *http.Client {
	transport := &http.Transport{
		TLSClientConfig:       &tls.Config{MinVersion: tls.VersionTLS12},
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          200,
		MaxIdleConnsPerHost:   50,
		MaxConnsPerHost:       100,
		IdleConnTimeout:       120 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		DisableCompression:    false,
	}
	http2.ConfigureTransport(transport)
	return &http.Client{Transport: transport, Timeout: 0}
}
