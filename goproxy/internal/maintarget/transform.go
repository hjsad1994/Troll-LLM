package maintarget

import (
	"encoding/json"
)

// OpenAIRequest represents incoming OpenAI format request
type OpenAIRequest struct {
	Model       string                   `json:"model"`
	Messages    []map[string]interface{} `json:"messages"`
	MaxTokens   int                      `json:"max_tokens,omitempty"`
	Temperature float64                  `json:"temperature,omitempty"`
	TopP        float64                  `json:"top_p,omitempty"`
	Stream      bool                     `json:"stream,omitempty"`
	Tools       []interface{}            `json:"tools,omitempty"`
}

// AnthropicRequest represents Anthropic format for main target
type AnthropicRequest struct {
	Model       string                   `json:"model"`
	Messages    []map[string]interface{} `json:"messages"`
	System      string                   `json:"system,omitempty"`
	MaxTokens   int                      `json:"max_tokens"`
	Temperature float64                  `json:"temperature,omitempty"`
	TopP        float64                  `json:"top_p,omitempty"`
	Stream      bool                     `json:"stream,omitempty"`
	Tools       []interface{}            `json:"tools,omitempty"`
}

// TransformOpenAIToAnthropic converts OpenAI format to Anthropic format
// Minimal transformation - no thinking, no custom system prompt
func TransformOpenAIToAnthropic(openaiBody []byte) ([]byte, bool, error) {
	var req OpenAIRequest
	if err := json.Unmarshal(openaiBody, &req); err != nil {
		return nil, false, err
	}

	// Extract system messages and convert to Anthropic format
	var systemText string
	var messages []map[string]interface{}

	for _, msg := range req.Messages {
		role, _ := msg["role"].(string)
		content := msg["content"]

		if role == "system" {
			// Collect system messages
			if text, ok := content.(string); ok {
				if systemText != "" {
					systemText += "\n\n"
				}
				systemText += text
			}
			continue
		}

		// Convert message content to Anthropic format
		var anthropicContent interface{}
		switch c := content.(type) {
		case string:
			anthropicContent = c
		case []interface{}:
			// Already array format, keep as-is
			anthropicContent = c
		default:
			anthropicContent = content
		}

		messages = append(messages, map[string]interface{}{
			"role":    role,
			"content": anthropicContent,
		})
	}

	// Set max_tokens with defaults
	maxTokens := req.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 8192 // Default
	}

	// Build Anthropic request
	anthropicReq := AnthropicRequest{
		Model:     req.Model,
		Messages:  messages,
		MaxTokens: maxTokens,
		Stream:    req.Stream,
	}

	if systemText != "" {
		anthropicReq.System = systemText
	}
	if req.Temperature > 0 {
		anthropicReq.Temperature = req.Temperature
	}
	if req.TopP > 0 {
		anthropicReq.TopP = req.TopP
	}
	if len(req.Tools) > 0 {
		anthropicReq.Tools = req.Tools
	}

	body, err := json.Marshal(anthropicReq)
	return body, req.Stream, err
}
