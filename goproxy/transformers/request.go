package transformers

import (
	"strings"

	"github.com/google/uuid"
	"goproxy/config"
)

// OpenAIMessage represents an OpenAI format message
type OpenAIMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // Can be string or []ContentPart
}

// ContentPart represents a message content part
type ContentPart struct {
	Type     string                 `json:"type"`
	Text     string                 `json:"text,omitempty"`
	ImageURL map[string]interface{} `json:"image_url,omitempty"`
}

// OpenAIRequest represents OpenAI standard request format
type OpenAIRequest struct {
	Model            string          `json:"model"`
	Messages         []OpenAIMessage `json:"messages"`
	MaxTokens        int             `json:"max_tokens,omitempty"`
	Temperature      float64         `json:"temperature,omitempty"`
	TopP             float64         `json:"top_p,omitempty"`
	Stream           bool            `json:"stream,omitempty"`
	Tools            []interface{}   `json:"tools,omitempty"`
	PresencePenalty  float64         `json:"presence_penalty,omitempty"`
	FrequencyPenalty float64         `json:"frequency_penalty,omitempty"`
}

// AnthropicMessage represents an Anthropic format message
type AnthropicMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // Can be string or []map[string]interface{}
}

// AnthropicRequest represents Anthropic request format
type AnthropicRequest struct {
	Model       string                   `json:"model"`
	Messages    []AnthropicMessage       `json:"messages"`
	System      []map[string]interface{} `json:"system,omitempty"`
	MaxTokens   int                      `json:"max_tokens"`
	Temperature float64                  `json:"temperature,omitempty"`
	Stream      bool                     `json:"stream,omitempty"`
	Thinking    *ThinkingConfig          `json:"thinking,omitempty"`
	Tools       []interface{}            `json:"tools,omitempty"`
	ToolChoice  interface{}              `json:"tool_choice,omitempty"`
}

// ThinkingConfig represents Anthropic thinking configuration
type ThinkingConfig struct {
	Type         string `json:"type"`
	BudgetTokens int    `json:"budget_tokens"`
}

// TrollOpenAIMessage represents TrollLLM OpenAI format message
type TrollOpenAIMessage struct {
	Role    string                   `json:"role"`
	Content []map[string]interface{} `json:"content"`
}

// TrollOpenAIRequest represents TrollLLM OpenAI request format (for /v1/responses endpoint)
type TrollOpenAIRequest struct {
	Model             string               `json:"model"`
	Input             []TrollOpenAIMessage `json:"input"`
	Instructions      string               `json:"instructions,omitempty"`
	MaxOutputTokens   int                  `json:"max_output_tokens,omitempty"`
	Temperature       float64              `json:"temperature,omitempty"`
	TopP              float64              `json:"top_p,omitempty"`
	Stream            bool                 `json:"stream,omitempty"`
	Store             bool                 `json:"store"`
	Tools             []interface{}        `json:"tools,omitempty"`
	Reasoning         *ReasoningConfig     `json:"reasoning,omitempty"`
	PresencePenalty   float64              `json:"presence_penalty,omitempty"`
	FrequencyPenalty  float64              `json:"frequency_penalty,omitempty"`
	ParallelToolCalls bool                 `json:"parallel_tool_calls,omitempty"`
}

// ReasoningConfig represents OpenAI reasoning configuration
type ReasoningConfig struct {
	Effort  string `json:"effort"`
	Summary string `json:"summary"`
}

// TransformToAnthropic converts OpenAI format to Anthropic format
func TransformToAnthropic(req *OpenAIRequest) *AnthropicRequest {
	anthropicReq := &AnthropicRequest{
		Model:    req.Model,
		Messages: []AnthropicMessage{},
		Stream:   req.Stream,
	}

	// Set max_tokens with reasonable defaults based on model limits
	// Claude Opus 4.1: Max 32,000 (actual limit)
	// Claude Sonnet 4: Max 64,000 (actual limit)
	// Claude Sonnet 4.5: Max 64,000 (actual limit)
	maxLimit := 64000 // Default max
	switch req.Model {
	case "claude-opus-4-1-20250805":
		maxLimit = 32000
	case "claude-sonnet-4-20250514", "claude-sonnet-4-5-20250929":
		maxLimit = 64000
	}

	if req.MaxTokens > 0 {
		// User specified max_tokens, limit to model maximum
		if req.MaxTokens > maxLimit {
			anthropicReq.MaxTokens = maxLimit
		} else {
			anthropicReq.MaxTokens = req.MaxTokens
		}
	} else {
		// Use model maximum as default when not specified
		anthropicReq.MaxTokens = maxLimit
	}

	// Set temperature
	if req.Temperature > 0 {
		anthropicReq.Temperature = req.Temperature
	}

	// Convert messages and extract system
	var userSystemMessages []string
	systemPrompt := config.GetSystemPrompt()

	for _, msg := range req.Messages {
		if msg.Role == "system" {
			// Extract system message
			if text, ok := msg.Content.(string); ok {
				userSystemMessages = append(userSystemMessages, text)
			}
			continue
		}

		// Convert user and assistant messages
		contentArray := []map[string]interface{}{}

		if text, ok := msg.Content.(string); ok {
			contentArray = append(contentArray, map[string]interface{}{
				"type": "text",
				"text": text,
			})
		} else if parts, ok := msg.Content.([]interface{}); ok {
			for _, part := range parts {
				if partMap, ok := part.(map[string]interface{}); ok {
					contentArray = append(contentArray, partMap)
				}
			}
		}

		anthropicMsg := AnthropicMessage{
			Role:    msg.Role,
			Content: contentArray,
		}

		anthropicReq.Messages = append(anthropicReq.Messages, anthropicMsg)
	}

	// Set system field (always enforce proxy system prompt only)
	if systemPrompt != "" {
		anthropicReq.System = []map[string]interface{}{
			{
				"type": "text",
				"text": systemPrompt,
			},
		}
	}

	// Move user-provided system instructions into the conversation
	if len(userSystemMessages) > 0 {
		combinedText := strings.Join(userSystemMessages, "\n\n")
		if combinedText != "" {
			prependMsg := AnthropicMessage{
				Role: "user",
				Content: []map[string]interface{}{
					{
						"type": "text",
						"text": combinedText,
					},
				},
			}
			anthropicReq.Messages = append([]AnthropicMessage{prependMsg}, anthropicReq.Messages...)
		}
	}

	// Handle thinking field
	reasoning := config.GetModelReasoning(req.Model)
	if reasoning != "" {
		budgetTokens := map[string]int{
			"low":    4096,
			"medium": 12288,
			"high":   24576,
		}

		// Ensure max_tokens is greater than budget_tokens
		requiredBudget := budgetTokens[reasoning]
		if anthropicReq.MaxTokens <= requiredBudget {
			// Increase max_tokens to meet requirement
			anthropicReq.MaxTokens = requiredBudget + 4000
		}

		anthropicReq.Thinking = &ThinkingConfig{
			Type:         "enabled",
			BudgetTokens: requiredBudget,
		}
	}

	return anthropicReq
}

// TransformToOpenAI converts Anthropic format to OpenAI format
func TransformToOpenAI(req *AnthropicRequest) *OpenAIRequest {
	openaiReq := &OpenAIRequest{
		Model:    req.Model,
		Messages: []OpenAIMessage{},
		Stream:   req.Stream,
	}

	// Convert max_tokens
	if req.MaxTokens > 0 {
		openaiReq.MaxTokens = req.MaxTokens
	} else {
		openaiReq.MaxTokens = 4096
	}

	// Convert temperature
	if req.Temperature > 0 {
		openaiReq.Temperature = req.Temperature
	}

	// Handle system messages
	if len(req.System) > 0 {
		var systemText string
		for _, sys := range req.System {
			if text, ok := sys["text"].(string); ok {
				if systemText != "" {
					systemText += "\n"
				}
				systemText += text
			}
		}
		if systemText != "" {
			openaiReq.Messages = append(openaiReq.Messages, OpenAIMessage{
				Role:    "system",
				Content: systemText,
			})
		}
	}

	// Convert messages
	for _, msg := range req.Messages {
		openaiMsg := OpenAIMessage{
			Role: msg.Role,
		}

		// Handle content conversion
		switch content := msg.Content.(type) {
		case string:
			openaiMsg.Content = content
		case []interface{}:
			// For array content, extract text parts
			var textParts []string
			for _, part := range content {
				if partMap, ok := part.(map[string]interface{}); ok {
					if partMap["type"] == "text" {
						if text, ok := partMap["text"].(string); ok {
							textParts = append(textParts, text)
						}
					}
				}
			}
			openaiMsg.Content = strings.Join(textParts, "")
		default:
			openaiMsg.Content = ""
		}

		openaiReq.Messages = append(openaiReq.Messages, openaiMsg)
	}

	return openaiReq
}

// TransformToTrollOpenAI converts OpenAI format to TrollLLM OpenAI format
func TransformToTrollOpenAI(req *OpenAIRequest) *TrollOpenAIRequest {
	trollReq := &TrollOpenAIRequest{
		Model:  req.Model,
		Input:  []TrollOpenAIMessage{},
		Stream: req.Stream,
		Store:  false,
	}

	// Convert max_tokens
	// GPT-5: Max 128,000
	// GPT-5 Codex: Max 128,000
	maxLimit := 128000

	if req.MaxTokens > 0 {
		// User specified max_tokens, limit to model maximum
		if req.MaxTokens > maxLimit {
			trollReq.MaxOutputTokens = maxLimit
		} else {
			trollReq.MaxOutputTokens = req.MaxTokens
		}
	} else {
		// Use model maximum as default when not specified
		trollReq.MaxOutputTokens = maxLimit
	}

	// Convert other parameters
	if req.Temperature > 0 {
		trollReq.Temperature = req.Temperature
	}
	if req.TopP > 0 {
		trollReq.TopP = req.TopP
	}
	if req.PresencePenalty != 0 {
		trollReq.PresencePenalty = req.PresencePenalty
	}
	if req.FrequencyPenalty != 0 {
		trollReq.FrequencyPenalty = req.FrequencyPenalty
	}

	// Convert tools
	if len(req.Tools) > 0 {
		trollReq.Tools = req.Tools
	}

	// Extract system message as instructions
	systemPrompt := config.GetSystemPrompt()
	var userSystemMessages []string

	for _, msg := range req.Messages {
		if msg.Role == "system" {
			if text, ok := msg.Content.(string); ok {
				userSystemMessages = append(userSystemMessages, text)
			}
			continue
		}

		// Convert message content
		contentArray := []map[string]interface{}{}

		// Determine content type based on role
		textType := "input_text"
		imageType := "input_image"
		if msg.Role == "assistant" {
			textType = "output_text"
			imageType = "output_image"
		}

		if text, ok := msg.Content.(string); ok {
			contentArray = append(contentArray, map[string]interface{}{
				"type": textType,
				"text": text,
			})
		} else if parts, ok := msg.Content.([]interface{}); ok {
			for _, part := range parts {
				if partMap, ok := part.(map[string]interface{}); ok {
					partType, _ := partMap["type"].(string)
					if partType == "text" {
						contentArray = append(contentArray, map[string]interface{}{
							"type": textType,
							"text": partMap["text"],
						})
					} else if partType == "image_url" {
						contentArray = append(contentArray, map[string]interface{}{
							"type":      imageType,
							"image_url": partMap["image_url"],
						})
					} else {
						// Pass through other types directly
						contentArray = append(contentArray, partMap)
					}
				}
			}
		}

		trollMsg := TrollOpenAIMessage{
			Role:    msg.Role,
			Content: contentArray,
		}

		trollReq.Input = append(trollReq.Input, trollMsg)
	}

	// Set instructions
	if systemPrompt != "" || len(userSystemMessages) > 0 {
		instructions := systemPrompt
		for _, msg := range userSystemMessages {
			instructions += msg
		}
		trollReq.Instructions = instructions
	}

	// Handle reasoning field
	// Fix: GPT-5 and GPT-5.1 require reasoning parameter with valid value
	reasoning := config.GetModelReasoning(req.Model)

	// GPT-5 and GPT-5.1 must have reasoning (low/medium/high)
	if req.Model == "gpt-5-2025-08-07" || req.Model == "gpt-5.1-2025-11-13" {
		// Use config value, default to "medium" if off
		effort := reasoning
		if effort == "" || effort == "off" {
			effort = "medium" // TrollLLM default
		}
		trollReq.Reasoning = &ReasoningConfig{
			Effort:  effort,
			Summary: "auto",
		}
	} else if reasoning != "" {
		// Cho các models khác
		trollReq.Reasoning = &ReasoningConfig{
			Effort:  reasoning,
			Summary: "auto",
		}

		// If reasoning is needed, increase max_output_tokens to ensure enough space for output
		if trollReq.MaxOutputTokens == 0 {
			trollReq.MaxOutputTokens = 4000
		} else if trollReq.MaxOutputTokens < 1000 {
			// Ensure there are enough tokens for actual output
			trollReq.MaxOutputTokens = trollReq.MaxOutputTokens + 2000
		}
	}

	return trollReq
}

// GetAnthropicHeaders returns Anthropic request headers
func GetAnthropicHeaders(authHeader string, clientHeaders map[string]string, isStreaming bool, modelID string) map[string]string {
	headers := map[string]string{
		"content-type":      "application/json",
		"authorization":     authHeader,
		"anthropic-version": "2023-06-01", // Anthropic API version identifier (recommended stable version)
		"user-agent":        config.GetUserAgent(),
	}

	if isStreaming {
		headers["accept"] = "text/event-stream"
	} else {
		headers["accept"] = "application/json"
	}

	// Factory upstream only trusts the CLI client identifier
	headers["x-factory-client"] = "cli"

	if sessionID, ok := clientHeaders["x-session-id"]; ok {
		headers["x-session-id"] = sessionID
	}

	if msgID, ok := clientHeaders["x-assistant-message-id"]; ok {
		headers["x-assistant-message-id"] = msgID
	}

	return headers
}

// GetMainTargetHeaders returns headers for Main Target Server
// Sends both x-api-key and Authorization Bearer for compatibility
func GetMainTargetHeaders(apiKey string, clientHeaders map[string]string, isStreaming bool) map[string]string {
	headers := map[string]string{
		"content-type":         "application/json",
		"x-api-key":            apiKey,
		"authorization":        "Bearer " + apiKey,
		"anthropic-version":    "2023-06-01",
	}

	if isStreaming {
		headers["accept"] = "text/event-stream"
	} else {
		headers["accept"] = "application/json"
	}

	return headers
}

// GetTrollOpenAIHeaders returns TrollLLM OpenAI request headers
func GetTrollOpenAIHeaders(authHeader string, clientHeaders map[string]string) map[string]string {
	// Generate unique ID
	sessionID := clientHeaders["x-session-id"]
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	messageID := clientHeaders["x-assistant-message-id"]
	if messageID == "" {
		messageID = uuid.New().String()
	}

	headers := map[string]string{
		"content-type":                "application/json",
		"authorization":               authHeader,
		"x-api-provider":              "azure_openai",
		"x-factory-client":            "cli",
		"x-session-id":                sessionID,
		"x-assistant-message-id":      messageID,
		"user-agent":                  config.GetUserAgent(),
		"accept":                      "application/json, text/event-stream",
		"accept-encoding":             "gzip, deflate, br",
		"accept-language":             "en-US,en;q=0.9",
		"connection":                  "keep-alive",
		"origin":                      "https://app.factory.ai",
		"referer":                     "https://app.factory.ai/",
		"sec-fetch-dest":              "empty",
		"sec-fetch-mode":              "cors",
		"sec-fetch-site":              "same-origin",
		"x-stainless-arch":            "x64",
		"x-stainless-lang":            "js",
		"x-stainless-os":              "MacOS",
		"x-stainless-runtime":         "node",
		"x-stainless-retry-count":     "0",
		"x-stainless-package-version": "5.23.2",
		"x-stainless-runtime-version": "v24.3.0",
	}

	// Override allowed fields from client headers
	for key, value := range clientHeaders {
		if key == "x-session-id" || key == "x-assistant-message-id" {
			headers[key] = value
		}
	}

	return headers
}
