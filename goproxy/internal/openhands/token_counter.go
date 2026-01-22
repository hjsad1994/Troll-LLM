package openhands

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const (
	// OpenHands API base URL
	OpenHandsBaseURL = "https://llm-proxy.app.all-hands.dev"
	// OpenHands token counting endpoint (new /utils/token_counter)
	TokenCountEndpoint = "/utils/token_counter"
	// Legacy endpoint (kept for backwards compatibility)
	LegacyTokenCountEndpoint = "/v1/messages/count_tokens"
	// Timeout for token counting API calls
	TokenCountTimeout = 10 * time.Second
)

// TokenCountRequest represents the request body for /utils/token_counter API
// Based on: POST /utils/token_counter
//
//	{
//	  "model": "string",
//	  "prompt": "string",
//	  "messages": [{"additionalProp1": {}}],
//	  "contents": [{"additionalProp1": {}}]
//	}
type TokenCountRequest struct {
	Model    string                   `json:"model"`
	Prompt   string                   `json:"prompt,omitempty"`
	Messages []map[string]interface{} `json:"messages,omitempty"`
	Contents []map[string]interface{} `json:"contents,omitempty"`
}

// TokenCountResponse represents the response from /utils/token_counter API
//
//	{
//	  "total_tokens": 0,
//	  "request_model": "string",
//	  "model_used": "string",
//	  "tokenizer_type": "string",
//	  "original_response": {"additionalProp1": {}}
//	}
type TokenCountResponse struct {
	TotalTokens      int64                  `json:"total_tokens"`
	RequestModel     string                 `json:"request_model"`
	ModelUsed        string                 `json:"model_used"`
	TokenizerType    string                 `json:"tokenizer_type"`
	OriginalResponse map[string]interface{} `json:"original_response,omitempty"`
	// Legacy field for backwards compatibility
	InputTokens int64 `json:"input_tokens,omitempty"`
}

// CountTokensViaAPI calls OpenHands /utils/token_counter endpoint to get exact token count
// This uses the official token counting endpoint which can call provider APIs (Anthropic, Google, etc.)
//
// Parameters:
//   - baseURL: OpenHands API base URL (e.g., "https://llm-proxy.app.all-hands.dev")
//   - apiKey: API key for authentication
//   - model: Model ID (e.g., "claude-sonnet-4-20250514")
//   - messages: Array of messages (OpenAI format or raw maps)
//   - callEndpoint: When true, calls the actual provider's token counting API for accurate count
//
// Returns:
//   - total_tokens count from API
//   - error if API call fails
func CountTokensViaAPI(baseURL string, apiKey string, model string, messages []map[string]interface{}, callEndpoint bool) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), TokenCountTimeout)
	defer cancel()

	// Build request body
	reqBody := TokenCountRequest{
		Model:    model,
		Messages: messages,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal token count request: %w", err)
	}

	// Create HTTP request with call_endpoint query parameter
	url := baseURL + TokenCountEndpoint
	if callEndpoint {
		url += "?call_endpoint=true"
	} else {
		url += "?call_endpoint=false"
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return 0, fmt.Errorf("failed to create token count request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// Execute request
	client := &http.Client{Timeout: TokenCountTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("token count API call failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read token count response: %w", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("token count API returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var tokenResp TokenCountResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return 0, fmt.Errorf("failed to parse token count response: %w", err)
	}

	// Use total_tokens from new API, fallback to input_tokens for legacy
	tokens := tokenResp.TotalTokens
	if tokens == 0 && tokenResp.InputTokens > 0 {
		tokens = tokenResp.InputTokens
	}

	log.Printf("📊 [TokenCount] API returned %d tokens for model %s (tokenizer: %s, call_endpoint: %v)",
		tokens, model, tokenResp.TokenizerType, callEndpoint)
	return tokens, nil
}

// CountTokensViaAPIWithCallEndpoint is the recommended method for accurate token counting
// It calls the actual provider's token counting API (Anthropic, Google AI Studio, etc.)
//
// Parameters:
//   - baseURL: OpenHands API base URL
//   - apiKey: API key for authentication
//   - model: Model ID
//   - messages: Array of messages
//
// Returns:
//   - token count from provider's API
//   - error if API call fails
func CountTokensViaAPIWithCallEndpoint(baseURL string, apiKey string, model string, messages []map[string]interface{}) (int64, error) {
	return CountTokensViaAPI(baseURL, apiKey, model, messages, true)
}

// CountTokensViaAPIWithFallback tries API-based counting first, falls back to estimation on error
// This provides the best of both worlds: accuracy when possible, availability always
//
// Parameters:
//   - baseURL: OpenHands API base URL
//   - apiKey: API key for authentication
//   - model: Model ID
//   - messages: Array of messages
//   - callEndpoint: Whether to call provider's API for accurate count
//   - estimatedTokens: Fallback estimation if API fails
//
// Returns:
//   - token count (from API or estimation)
//   - bool indicating if API was used (true) or fallback (false)
func CountTokensViaAPIWithFallback(baseURL string, apiKey string, model string, messages []map[string]interface{}, callEndpoint bool, estimatedTokens int64) (int64, bool) {
	tokens, err := CountTokensViaAPI(baseURL, apiKey, model, messages, callEndpoint)
	if err != nil {
		log.Printf("⚠️ [TokenCount] API failed, using estimation: %v", err)
		return estimatedTokens, false
	}
	return tokens, true
}

// CountTokensForTruncation counts tokens specifically for truncation decisions
// Uses call_endpoint=true for accurate provider-based counting
// Falls back to estimation if API fails
//
// Parameters:
//   - baseURL: OpenHands API base URL
//   - apiKey: API key for authentication
//   - model: Model ID
//   - messages: Array of messages in OpenAI format
//   - estimatedTokens: Fallback estimation if API fails
//
// Returns:
//   - accurate token count (from provider API or estimation)
//   - bool indicating if provider API was used
func CountTokensForTruncation(baseURL string, apiKey string, model string, messages []map[string]interface{}, estimatedTokens int64) (int64, bool) {
	// Always use call_endpoint=true for truncation decisions to get accurate count
	return CountTokensViaAPIWithFallback(baseURL, apiKey, model, messages, true, estimatedTokens)
}

// ConvertOpenAIMessagesToMaps converts OpenAI format messages to map format for token counting API
func ConvertOpenAIMessagesToMaps(messages []interface{}) []map[string]interface{} {
	result := make([]map[string]interface{}, 0, len(messages))
	for _, msg := range messages {
		if msgMap, ok := msg.(map[string]interface{}); ok {
			result = append(result, msgMap)
		}
	}
	return result
}

// ConvertAnthropicMessagesToMaps converts Anthropic format messages to map format for token counting API
// This includes handling system prompt separately
func ConvertAnthropicMessagesToMaps(messages []interface{}, system interface{}) []map[string]interface{} {
	result := make([]map[string]interface{}, 0, len(messages)+1)

	// Add system as first message if present
	if system != nil {
		var systemContent string
		if systemStr, ok := system.(string); ok {
			systemContent = systemStr
		} else if systemArray, ok := system.([]interface{}); ok {
			for _, item := range systemArray {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if text, ok := itemMap["text"].(string); ok {
						systemContent += text
					}
				}
			}
		}
		if systemContent != "" {
			result = append(result, map[string]interface{}{
				"role":    "system",
				"content": systemContent,
			})
		}
	}

	// Add remaining messages
	for _, msg := range messages {
		if msgMap, ok := msg.(map[string]interface{}); ok {
			result = append(result, msgMap)
		}
	}

	return result
}

// ConvertAnthropicRequestToMaps converts transformers.AnthropicRequest messages to map format
// This is a convenience function for use in main.go truncation logic
func ConvertAnthropicRequestToMaps(messages interface{}, system interface{}) []map[string]interface{} {
	result := make([]map[string]interface{}, 0)

	// Add system as first message if present
	if system != nil {
		var systemContent string
		if systemStr, ok := system.(string); ok {
			systemContent = systemStr
		} else if systemArray, ok := system.([]interface{}); ok {
			for _, item := range systemArray {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if text, ok := itemMap["text"].(string); ok {
						systemContent += text
					}
				}
			}
		} else if systemArray, ok := system.([]map[string]interface{}); ok {
			for _, item := range systemArray {
				if text, ok := item["text"].(string); ok {
					systemContent += text
				}
			}
		}
		if systemContent != "" {
			result = append(result, map[string]interface{}{
				"role":    "system",
				"content": systemContent,
			})
		}
	}

	// Handle messages based on type
	switch msgs := messages.(type) {
	case []interface{}:
		for _, msg := range msgs {
			if msgMap, ok := msg.(map[string]interface{}); ok {
				result = append(result, msgMap)
			}
		}
	case []map[string]interface{}:
		result = append(result, msgs...)
	}

	return result
}

// CountTokensForAnthropicRequest counts tokens for an Anthropic request using API
// Returns token count and error
func CountTokensForAnthropicRequest(apiKey string, model string, messages interface{}, system interface{}) (int64, error) {
	messagesForCount := ConvertAnthropicRequestToMaps(messages, system)
	return CountTokensViaAPI(OpenHandsBaseURL, apiKey, model, messagesForCount, true)
}

// CountTokensForOpenAIMessages counts tokens for OpenAI format messages using API
// Returns token count and error
func CountTokensForOpenAIMessages(apiKey string, model string, messages []map[string]interface{}) (int64, error) {
	return CountTokensViaAPI(OpenHandsBaseURL, apiKey, model, messages, true)
}

// Legacy functions for backwards compatibility

// LegacyCountTokensViaAPI calls the old /v1/messages/count_tokens endpoint
// Deprecated: Use CountTokensViaAPI with the new /utils/token_counter endpoint
func LegacyCountTokensViaAPI(baseURL string, apiKey string, model string, messages []interface{}, system interface{}, tools []interface{}) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), TokenCountTimeout)
	defer cancel()

	// Build legacy request body
	type LegacyRequest struct {
		Model    string        `json:"model"`
		Messages []interface{} `json:"messages"`
		System   interface{}   `json:"system,omitempty"`
		Tools    []interface{} `json:"tools,omitempty"`
	}

	reqBody := LegacyRequest{
		Model:    model,
		Messages: messages,
	}
	if system != nil {
		reqBody.System = system
	}
	if len(tools) > 0 {
		reqBody.Tools = tools
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal legacy token count request: %w", err)
	}

	// Create HTTP request
	url := baseURL + LegacyTokenCountEndpoint + "?beta=true"
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return 0, fmt.Errorf("failed to create legacy token count request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	// Execute request
	client := &http.Client{Timeout: TokenCountTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("legacy token count API call failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read legacy token count response: %w", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("legacy token count API returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	type LegacyResponse struct {
		InputTokens int64 `json:"input_tokens"`
	}
	var tokenResp LegacyResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return 0, fmt.Errorf("failed to parse legacy token count response: %w", err)
	}

	log.Printf("📊 [TokenCount-Legacy] API returned %d input tokens for model %s", tokenResp.InputTokens, model)
	return tokenResp.InputTokens, nil
}

// ExtractSystemPrompt extracts system prompt from OpenAI messages
func ExtractSystemPrompt(messages []map[string]interface{}) string {
	for _, msg := range messages {
		if role, ok := msg["role"].(string); ok && role == "system" {
			if content, ok := msg["content"].(string); ok {
				return content
			}
		}
	}
	return ""
}
