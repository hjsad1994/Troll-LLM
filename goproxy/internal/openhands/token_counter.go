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
	// OpenHands token counting endpoint
	TokenCountEndpoint = "/v1/messages/count_tokens"
	// Timeout for token counting API calls
	TokenCountTimeout = 5 * time.Second
)

// TokenCountRequest represents the request body for count_tokens API
type TokenCountRequest struct {
	Model    string        `json:"model"`
	Messages []interface{} `json:"messages"`
	System   interface{}   `json:"system,omitempty"`
	Tools    []interface{} `json:"tools,omitempty"`
}

// TokenCountResponse represents the response from count_tokens API
type TokenCountResponse struct {
	InputTokens int64 `json:"input_tokens"`
}

// CountTokensViaAPI calls OpenHands /v1/messages/count_tokens endpoint to get exact token count
// This is more accurate than local estimation but adds network latency
//
// Parameters:
//   - baseURL: OpenHands API base URL (e.g., "https://llm-proxy.app.all-hands.dev")
//   - apiKey: API key for authentication
//   - model: Model ID (e.g., "claude-sonnet-4-20250514")
//   - messages: Array of messages in Anthropic format
//   - system: Optional system prompt
//   - tools: Optional tools array
//
// Returns:
//   - input_tokens count from API
//   - error if API call fails
func CountTokensViaAPI(baseURL string, apiKey string, model string, messages []interface{}, system interface{}, tools []interface{}) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), TokenCountTimeout)
	defer cancel()

	// Build request body
	reqBody := TokenCountRequest{
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
		return 0, fmt.Errorf("failed to marshal token count request: %w", err)
	}

	// Create HTTP request
	url := baseURL + TokenCountEndpoint + "?beta=true"
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return 0, fmt.Errorf("failed to create token count request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

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

	log.Printf("📊 [TokenCount] API returned %d input tokens for model %s", tokenResp.InputTokens, model)
	return tokenResp.InputTokens, nil
}

// CountTokensViaAPIWithFallback tries API-based counting first, falls back to estimation on error
// This provides the best of both worlds: accuracy when possible, availability always
//
// Parameters:
//   - baseURL: OpenHands API base URL
//   - apiKey: API key for authentication
//   - model: Model ID
//   - messages: Array of messages
//   - system: Optional system prompt
//   - tools: Optional tools array
//   - estimatedTokens: Fallback estimation if API fails
//
// Returns:
//   - token count (from API or estimation)
//   - bool indicating if API was used (true) or fallback (false)
func CountTokensViaAPIWithFallback(baseURL string, apiKey string, model string, messages []interface{}, system interface{}, tools []interface{}, estimatedTokens int64) (int64, bool) {
	tokens, err := CountTokensViaAPI(baseURL, apiKey, model, messages, system, tools)
	if err != nil {
		log.Printf("⚠️ [TokenCount] API failed, using estimation: %v", err)
		return estimatedTokens, false
	}
	return tokens, true
}

// ConvertOpenAIMessagesToAnthropic converts OpenAI format messages to Anthropic format for token counting
// This is needed because count_tokens API uses Anthropic message format
func ConvertOpenAIMessagesToAnthropic(messages []map[string]interface{}) []interface{} {
	result := make([]interface{}, 0, len(messages))

	for _, msg := range messages {
		role, _ := msg["role"].(string)

		// Skip system messages (handled separately in Anthropic format)
		if role == "system" {
			continue
		}

		// Convert role: tool -> user (with tool_result wrapper)
		anthropicRole := role
		if role == "tool" {
			anthropicRole = "user"
		}

		anthropicMsg := map[string]interface{}{
			"role": anthropicRole,
		}

		// Handle content
		if content, ok := msg["content"].(string); ok {
			if role == "tool" {
				// Wrap tool result in Anthropic format
				toolCallID, _ := msg["tool_call_id"].(string)
				anthropicMsg["content"] = []map[string]interface{}{
					{
						"type":        "tool_result",
						"tool_use_id": toolCallID,
						"content":     content,
					},
				}
			} else {
				anthropicMsg["content"] = content
			}
		} else if contentArray, ok := msg["content"].([]interface{}); ok {
			anthropicMsg["content"] = contentArray
		}

		// Handle tool_calls (assistant messages)
		if toolCalls, ok := msg["tool_calls"].([]interface{}); ok && len(toolCalls) > 0 {
			contentBlocks := make([]interface{}, 0)

			// Add existing text content if any
			if text, ok := msg["content"].(string); ok && text != "" {
				contentBlocks = append(contentBlocks, map[string]interface{}{
					"type": "text",
					"text": text,
				})
			}

			// Convert tool_calls to tool_use blocks
			for _, tc := range toolCalls {
				if tcMap, ok := tc.(map[string]interface{}); ok {
					toolUse := map[string]interface{}{
						"type": "tool_use",
					}
					if id, ok := tcMap["id"].(string); ok {
						toolUse["id"] = id
					}
					if fn, ok := tcMap["function"].(map[string]interface{}); ok {
						if name, ok := fn["name"].(string); ok {
							toolUse["name"] = name
						}
						if args, ok := fn["arguments"].(string); ok {
							// Parse arguments JSON
							var argsMap map[string]interface{}
							if json.Unmarshal([]byte(args), &argsMap) == nil {
								toolUse["input"] = argsMap
							} else {
								toolUse["input"] = map[string]interface{}{}
							}
						}
					}
					contentBlocks = append(contentBlocks, toolUse)
				}
			}

			if len(contentBlocks) > 0 {
				anthropicMsg["content"] = contentBlocks
			}
		}

		result = append(result, anthropicMsg)
	}

	return result
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
