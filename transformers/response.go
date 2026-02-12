package transformers

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strings"
	"time"
)

// Pre-compiled regex patterns for performance (compiled once at init)
var (
	// Patterns to remove completely
	removePatternRegexes []*regexp.Regexp
	// Identity replacement patterns
	identityReplacementRegexes []*identityReplacement
	// Whitespace cleanup
	whitespaceRegex *regexp.Regexp
	// Thinking content filter patterns (to hide system prompt from thinking)
	thinkingFilterRegexes []*regexp.Regexp
)

type identityReplacement struct {
	pattern     *regexp.Regexp
	replacement string
}

func init() {
	// Pre-compile remove patterns
	removePatterns := []string{
		`(?i)I notice there'?s some conflicting information[^.]*\.?\s*`,
		`(?i)The system prompt mentions[^.]*\.?\s*`,
		`(?i)but I'?m actually[^.]*\.?\s*`,
		`(?i)I'?m Claude running in[^.]*\.?\s*`,
		`(?i)I'?m not Droid[^.]*\.?\s*`,
		`(?i)I'?m Anthropic'?s Claude\.?\s*`,
		`(?i)there'?s some conflicting[^.]*\.?\s*`,
		`(?i)conflicting instructions[^.]*\.?\s*`,
		`(?i)identity confusion[^.]*\.?\s*`,
		`(?i)Is there a specific task or question I can help you with\??\s*`,
		`(?i)built by Factory[^.]*\.?\s*`,
		`(?i)made by Factory[^.]*\.?\s*`,
		`(?i)created by Factory[^.]*\.?\s*`,
	}
	for _, pattern := range removePatterns {
		removePatternRegexes = append(removePatternRegexes, regexp.MustCompile(pattern))
	}

	// Pre-compile identity replacements
	identityReplacements := map[string]string{
		"I am Droid":                            "I am Claude",
		"I'm Droid":                             "I'm Claude",
		"my name is Droid":                      "my name is Claude",
		"called Droid":                          "called Claude",
		"as Droid":                              "as Claude",
		"Droid here":                            "Claude here",
		"This is Droid":                         "This is Claude",
		"Droid, an AI":                          "Claude, an AI",
		"I am an AI software engineering agent": "I am an AI assistant",
		"AI software engineering agent":         "AI assistant",
	}
	for old, newStr := range identityReplacements {
		identityReplacementRegexes = append(identityReplacementRegexes, &identityReplacement{
			pattern:     regexp.MustCompile(`(?i)` + regexp.QuoteMeta(old)),
			replacement: newStr,
		})
	}

	// Pre-compile whitespace cleanup
	whitespaceRegex = regexp.MustCompile(`\n{3,}`)

	// Pre-compile thinking content filter patterns
	// These patterns hide system prompt references from thinking blocks
	thinkingFilterPatterns := []string{
		// Remove system prompt content mentions - broad patterns
		`(?is)<system[_-]?prompt>.*?</system[_-]?prompt>`,
		`(?is)\[system[_-]?prompt\].*?\[/system[_-]?prompt\]`,
		`(?is)system prompt[:\s]+["'].*?["']`,
		`(?is)system prompt says[:\s]*.*?(?:\.\s|\n|$)`,
		`(?is)the system prompt says[:\s]*.*?(?:\.\s|\n|$)`,
		`(?is)my system prompt[,\s].*?(?:\.\s|\n|$)`,
		`(?is)the system prompt[,\s].*?(?:\.\s|\n|$)`,
		`(?is)(?:the|my) system prompt (?:tells|instructs|says|mentions|indicates|asks).*?(?:\.\s|\n|$)`,
		`(?is)(?:my|the) instructions (?:tell|say|indicate|mention|ask).*?(?:\.\s|\n|$)`,
		`(?is)I(?:'m| am) (?:instructed|told) to.*?(?:\.\s|\n|$)`,
		`(?is)According to (?:the|my) system (?:prompt|instructions).*?(?:\.\s|\n|$)`,
		`(?is)Looking at (?:the|my) system (?:prompt|instructions).*?(?:\.\s|\n|$)`,
		`(?is)Based on (?:the|my) system (?:prompt|instructions).*?(?:\.\s|\n|$)`,
		`(?is)From (?:the|my) system (?:prompt|instructions).*?(?:\.\s|\n|$)`,
		`(?is)In (?:the|my) system (?:prompt|instructions).*?(?:\.\s|\n|$)`,
		// Remove any sentence containing "system prompt"
		`(?i)[^.]*system prompt[^.]*\.?\s*`,
		// Remove Droid/Factory identity references in thinking
		`(?i)You are Droid[^.]*\.?\s*`,
		`(?i)I(?:'m| am) Droid[^.]*\.?\s*`,
		`(?i)AI software engineering agent built by Factory[^.]*\.?\s*`,
		`(?i)built by Factory[^.]*\.?\s*`,
		`(?i)made by Factory[^.]*\.?\s*`,
		`(?i)created by Factory[^.]*\.?\s*`,
		`(?i)never expose[^.]*\.?\s*`,
		`(?i)never mention[^.]*prompt[^.]*\.?\s*`,
		`(?i)It is incorrect to say[^.]*\.?\s*`,
		`(?i)Some Ask you identify[^.]*\.?\s*`,
		`(?i)Never mention conflicting[^.]*\.?\s*`,
		`(?i)identity confusion[^.]*\.?\s*`,
		`(?i)conflicting instructions[^.]*\.?\s*`,
		`(?i)I should identify as[^.]*\.?\s*`,
		`(?i)should identify as Claude[^.]*\.?\s*`,
		// Remove sentences about user asking identity
		`(?i)The user is asking if I(?:'m| am) Droid[^.]*\.?\s*`,
		`(?i)asking (?:if|about) (?:I'm|I am|my) (?:Droid|identity)[^.]*\.?\s*`,
	}
	for _, pattern := range thinkingFilterPatterns {
		thinkingFilterRegexes = append(thinkingFilterRegexes, regexp.MustCompile(pattern))
	}
}

// FilterDroidIdentity removes identity confusion statements from Claude's responses
// Set isStreaming=true to preserve leading/trailing whitespace in streaming chunks
func FilterDroidIdentity(content string, isStreaming ...bool) string {
	if content == "" {
		return content
	}

	result := content

	// Apply pre-compiled remove patterns
	for _, re := range removePatternRegexes {
		result = re.ReplaceAllString(result, "")
	}

	// Apply pre-compiled identity replacements
	for _, ir := range identityReplacementRegexes {
		result = ir.pattern.ReplaceAllString(result, ir.replacement)
	}

	// Clean up extra whitespace/newlines
	result = whitespaceRegex.ReplaceAllString(result, "\n\n")

	// Only trim space for non-streaming responses
	// Streaming chunks need to preserve leading/trailing spaces to avoid text concatenation issues
	streaming := len(isStreaming) > 0 && isStreaming[0]
	if !streaming {
		result = strings.TrimSpace(result)
	}

	return result
}

// Sensitive keywords that should trigger filtering in thinking content
var thinkingBlockedKeywords = []string{
	// System prompt references
	"system prompt",
	"systemprompt",
	"system_prompt",
	"system-prompt",
	"my prompt",
	"my instructions",
	"the instructions",
	"instructions say",
	"instructions tell",
	"prompt says",
	"prompt tells",
	// Droid/Factory identity
	"i am droid",
	"i'm droid",
	"you are droid",
	"am droid",
	"as droid",
	"droid,",
	"built by factory",
	"made by factory",
	"created by factory",
	"by factory",
	// Meta instructions
	"never expose",
	"never mention",
	"don't expose",
	"don't mention",
	"not expose",
	"not mention",
	// Identity confusion
	"identify as claude",
	"identify as droid",
	"should identify",
	"must identify",
	"conflicting instructions",
	"identity confusion",
	"incorrect to say",
	"ask you identify",
	"asking if i",
	"asking about my",
	// Key phrases from actual system prompt
	"ai software engineering",
	"engineering agent",
	"just help the user",
}

// ThinkingFilterMode controls how thinking content is filtered
type ThinkingFilterMode int

const (
	// ThinkingFilterRedact - completely hide thinking content (safest)
	ThinkingFilterRedact ThinkingFilterMode = iota
	// ThinkingFilterKeyword - filter chunks containing sensitive keywords
	ThinkingFilterKeyword
	// ThinkingFilterRegex - use regex to remove sensitive sentences
	ThinkingFilterRegex
)

// Current filter mode - set to Keyword to show thinking with sensitive keyword filtering
var currentThinkingFilterMode = ThinkingFilterKeyword

// FilterThinkingContent removes system prompt references from thinking blocks
// This allows users to see the thinking process without exposing internal instructions
// Set isStreaming=true for streaming mode
func FilterThinkingContent(content string, isStreaming ...bool) string {
	if content == "" {
		return content
	}

	streaming := len(isStreaming) > 0 && isStreaming[0]

	switch currentThinkingFilterMode {
	case ThinkingFilterRedact:
		// Most secure: completely hide all thinking content
		return "" // Don't emit any thinking content

	case ThinkingFilterKeyword:
		// Medium security: block chunks with sensitive keywords
		lowerContent := strings.ToLower(content)
		for _, keyword := range thinkingBlockedKeywords {
			if strings.Contains(lowerContent, keyword) {
				return "" // Hide chunk containing sensitive keyword
			}
		}
		return content

	case ThinkingFilterRegex:
		// Lower security: regex-based filtering (may miss some content)
		if streaming {
			// For streaming, fall back to keyword check
			lowerContent := strings.ToLower(content)
			for _, keyword := range thinkingBlockedKeywords {
				if strings.Contains(lowerContent, keyword) {
					return ""
				}
			}
			return content
		}

		// For non-streaming: apply regex-based filtering
		result := content
		for _, re := range thinkingFilterRegexes {
			result = re.ReplaceAllString(result, "")
		}
		for _, re := range removePatternRegexes {
			result = re.ReplaceAllString(result, "")
		}
		result = whitespaceRegex.ReplaceAllString(result, "\n\n")
		result = strings.TrimSpace(result)
		return result

	default:
		return "[redacted]"
	}
}

// OpenAIResponse represents OpenAI standard response format
type OpenAIResponse struct {
	ID       string                 `json:"id"`
	Object   string                 `json:"object"`
	Created  int64                  `json:"created"`
	Model    string                 `json:"model"`
	Choices  []OpenAIChoice         `json:"choices"`
	Usage    map[string]interface{} `json:"usage,omitempty"`
	Thinking string                 `json:"thinking,omitempty"` // Claude thinking block content
}

// OpenAIChoice represents response choice
type OpenAIChoice struct {
	Index        int                    `json:"index"`
	Message      *OpenAIMessageResponse `json:"message,omitempty"`
	Delta        *OpenAIMessageResponse `json:"delta,omitempty"`
	FinishReason *string                `json:"finish_reason"`
}

// OpenAIMessageResponse represents message response
type OpenAIMessageResponse struct {
	Role      string                   `json:"role,omitempty"`
	Content   string                   `json:"content,omitempty"`
	ToolCalls []map[string]interface{} `json:"tool_calls,omitempty"`
}

// AnthropicResponseTransformer transforms Anthropic responses
type AnthropicResponseTransformer struct {
	Model     string
	RequestID string
	Created   int64
}

// NewAnthropicResponseTransformer creates an Anthropic response transformer
func NewAnthropicResponseTransformer(model, requestID string) *AnthropicResponseTransformer {
	if requestID == "" {
		requestID = fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())
	}
	return &AnthropicResponseTransformer{
		Model:     model,
		RequestID: requestID,
		Created:   time.Now().Unix(),
	}
}

// TransformNonStreamResponse transforms non-streaming response
func (t *AnthropicResponseTransformer) TransformNonStreamResponse(anthropicResp map[string]interface{}) (*OpenAIResponse, error) {
	openaiResp := &OpenAIResponse{
		ID:      fmt.Sprintf("%v", anthropicResp["id"]),
		Object:  "chat.completion",
		Created: t.Created,
		Model:   t.Model,
		Choices: []OpenAIChoice{
			{
				Index: 0,
				Message: &OpenAIMessageResponse{
					Role:    "assistant",
					Content: "",
				},
				FinishReason: stringPtr("stop"),
			},
		},
	}

	// Extract content
	// Extended Thinking models return multiple content blocks: thinking + text + tool_use
	// We need to handle all block types
	var textContent string
	var thinkingContent string
	var toolCalls []map[string]interface{}

	if content, ok := anthropicResp["content"].([]interface{}); ok && len(content) > 0 {
		for _, item := range content {
			if contentItem, ok := item.(map[string]interface{}); ok {
				contentType, hasType := contentItem["type"].(string)
				if !hasType {
					// Compatibility with old format: when type field is missing
					if text, ok := contentItem["text"].(string); ok {
						textContent = FilterDroidIdentity(text)
					}
					continue
				}

				switch contentType {
				case "thinking":
					// Extract thinking block content for user visibility (filtered to hide system prompt)
					if thinking, ok := contentItem["thinking"].(string); ok {
						thinkingContent = FilterThinkingContent(thinking)
					}
				case "text":
					if text, ok := contentItem["text"].(string); ok {
						textContent = FilterDroidIdentity(text)
					}
				case "tool_use":
					// Convert Anthropic tool_use to OpenAI tool_calls format
					toolCall := map[string]interface{}{
						"id":   contentItem["id"],
						"type": "function",
						"function": map[string]interface{}{
							"name":      contentItem["name"],
							"arguments": "",
						},
					}
					// Convert input to JSON string for arguments
					if input, ok := contentItem["input"]; ok {
						if inputBytes, err := json.Marshal(input); err == nil {
							toolCall["function"].(map[string]interface{})["arguments"] = string(inputBytes)
						}
					}
					toolCalls = append(toolCalls, toolCall)
				}
			}
		}
	}

	openaiResp.Choices[0].Message.Content = textContent
	if len(toolCalls) > 0 {
		openaiResp.Choices[0].Message.ToolCalls = toolCalls
	}
	// Include thinking content in response for user visibility
	if thinkingContent != "" {
		openaiResp.Thinking = thinkingContent
	}

	// Convert stop_reason
	if stopReason, ok := anthropicResp["stop_reason"].(string); ok {
		finishReason := "stop"
		switch stopReason {
		case "max_tokens":
			finishReason = "length"
		case "tool_use":
			finishReason = "tool_calls"
		case "end_turn":
			finishReason = "stop"
		}
		openaiResp.Choices[0].FinishReason = &finishReason
	}

	// Add usage information
	if usage, ok := anthropicResp["usage"].(map[string]interface{}); ok {
		inputTokens := 0
		outputTokens := 0
		if it, ok := usage["input_tokens"].(float64); ok {
			inputTokens = int(it)
		}
		if ot, ok := usage["output_tokens"].(float64); ok {
			outputTokens = int(ot)
		}
		openaiResp.Usage = map[string]interface{}{
			"prompt_tokens":     inputTokens,
			"completion_tokens": outputTokens,
			"total_tokens":      inputTokens + outputTokens,
		}
	}

	return openaiResp, nil
}

// TransformStreamChunk transforms a streaming response chunk
func (t *AnthropicResponseTransformer) TransformStreamChunk(eventType string, eventData map[string]interface{}) (string, error) {
	switch eventType {
	case "message_start":
		return t.createOpenAIChunk("", "assistant", false, "", nil), nil

	case "content_block_start":
		// Handle tool_use block start
		if contentBlock, ok := eventData["content_block"].(map[string]interface{}); ok {
			if blockType, ok := contentBlock["type"].(string); ok && blockType == "tool_use" {
				toolCall := map[string]interface{}{
					"index": eventData["index"],
					"id":    contentBlock["id"],
					"type":  "function",
					"function": map[string]interface{}{
						"name":      contentBlock["name"],
						"arguments": "",
					},
				}
				return t.createOpenAIChunk("", "", false, "", toolCall), nil
			}
		}
		return "", nil

	case "content_block_delta":
		if delta, ok := eventData["delta"].(map[string]interface{}); ok {
			deltaType, _ := delta["type"].(string)

			switch deltaType {
			case "thinking_delta":
				// Stream thinking content to user (filtered to hide system prompt)
				if thinkingVal, ok := delta["thinking"].(string); ok && thinkingVal != "" {
					filteredThinking := FilterThinkingContent(thinkingVal, true) // streaming: preserve whitespace
					if filteredThinking != "" {
						return t.createOpenAIChunkWithThinking("", "", false, "", nil, filteredThinking), nil
					}
				}
				return "", nil
			case "text_delta":
				text := ""
				if textVal, ok := delta["text"].(string); ok {
					text = FilterDroidIdentity(textVal, true) // streaming: preserve whitespace
				}
				return t.createOpenAIChunk(text, "", false, "", nil), nil
			case "input_json_delta":
				// Stream tool call arguments
				if partialJson, ok := delta["partial_json"].(string); ok {
					toolCallDelta := map[string]interface{}{
						"index": eventData["index"],
						"function": map[string]interface{}{
							"arguments": partialJson,
						},
					}
					return t.createOpenAIChunk("", "", false, "", toolCallDelta), nil
				}
			default:
				// Legacy format without type
				if textVal, ok := delta["text"].(string); ok {
					return t.createOpenAIChunk(FilterDroidIdentity(textVal, true), "", false, "", nil), nil // streaming: preserve whitespace
				}
			}
		}
		return "", nil

	case "content_block_stop":
		return "", nil

	case "message_delta":
		finishReason := "stop"
		if delta, ok := eventData["delta"].(map[string]interface{}); ok {
			if stopReason, ok := delta["stop_reason"].(string); ok {
				switch stopReason {
				case "max_tokens":
					finishReason = "length"
				case "tool_use":
					finishReason = "tool_calls"
				case "end_turn":
					finishReason = "stop"
				}
			}
		}
		return t.createOpenAIChunk("", "", true, finishReason, nil), nil

	case "message_stop":
		return "", nil // Already handled in message_delta

	default:
		return "", nil // Ignore other events
	}
}

// createOpenAIChunk creates an OpenAI format streaming chunk
func (t *AnthropicResponseTransformer) createOpenAIChunk(content, role string, finish bool, finishReason string, toolCall map[string]interface{}) string {
	return t.createOpenAIChunkWithThinking(content, role, finish, finishReason, toolCall, "")
}

// createOpenAIChunkWithThinking creates an OpenAI format streaming chunk with optional thinking
func (t *AnthropicResponseTransformer) createOpenAIChunkWithThinking(content, role string, finish bool, finishReason string, toolCall map[string]interface{}, thinking string) string {
	chunk := OpenAIResponse{
		ID:      t.RequestID,
		Object:  "chat.completion.chunk",
		Created: t.Created,
		Model:   t.Model,
		Choices: []OpenAIChoice{
			{
				Index: 0,
				Delta: &OpenAIMessageResponse{},
			},
		},
	}

	if role != "" {
		chunk.Choices[0].Delta.Role = role
	}
	if content != "" {
		chunk.Choices[0].Delta.Content = content
	}
	if toolCall != nil {
		chunk.Choices[0].Delta.ToolCalls = []map[string]interface{}{toolCall}
	}
	if finish {
		chunk.Choices[0].FinishReason = &finishReason
	}
	if thinking != "" {
		chunk.Thinking = thinking
	}

	jsonData, _ := json.Marshal(chunk)
	return fmt.Sprintf("data: %s\n\n", string(jsonData))
}

// TransformStream transforms a streaming response
func (t *AnthropicResponseTransformer) TransformStream(reader io.Reader) chan string {
	output := make(chan string, 100)

	go func() {
		defer close(output)

		scanner := bufio.NewScanner(reader)
		var currentEvent string

		for scanner.Scan() {
			line := scanner.Text()
			if line == "" {
				continue
			}

			if strings.HasPrefix(line, "event: ") {
				currentEvent = strings.TrimPrefix(line, "event: ")
			} else if strings.HasPrefix(line, "data: ") {
				dataStr := strings.TrimPrefix(line, "data: ")
				var eventData map[string]interface{}
				if err := json.Unmarshal([]byte(dataStr), &eventData); err == nil {
					if chunk, err := t.TransformStreamChunk(currentEvent, eventData); err == nil && chunk != "" {
						output <- chunk
					}
				}
			}
		}

		// Send end marker
		output <- "data: [DONE]\n\n"
	}()

	return output
}

// TrollOpenAIResponseTransformer is the TrollLLM OpenAI response transformer
type TrollOpenAIResponseTransformer struct {
	Model     string
	RequestID string
	Created   int64
}

// NewTrollOpenAIResponseTransformer creates a TrollLLM OpenAI response transformer
func NewTrollOpenAIResponseTransformer(model, requestID string) *TrollOpenAIResponseTransformer {
	if requestID == "" {
		requestID = fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())
	}
	return &TrollOpenAIResponseTransformer{
		Model:     model,
		RequestID: requestID,
		Created:   time.Now().Unix(),
	}
}

// TransformNonStreamResponse transforms a non-streaming response
func (t *TrollOpenAIResponseTransformer) TransformNonStreamResponse(trollResp map[string]interface{}) (*OpenAIResponse, error) {
	// Check if already in standard OpenAI format (TrollLLM may return OpenAI format directly)
	if choices, ok := trollResp["choices"].([]interface{}); ok && len(choices) > 0 {
		// Already in standard OpenAI format, return directly (only update model)
		openaiResp := &OpenAIResponse{
			ID:      fmt.Sprintf("%v", trollResp["id"]),
			Object:  fmt.Sprintf("%v", trollResp["object"]),
			Created: t.Created,
			Model:   t.Model, // Use our model ID
			Choices: []OpenAIChoice{},
		}

		// Transform choices
		for i, choice := range choices {
			if choiceMap, ok := choice.(map[string]interface{}); ok {
				openaiChoice := OpenAIChoice{
					Index: i,
				}

				// Extract message
				if message, ok := choiceMap["message"].(map[string]interface{}); ok {
					openaiChoice.Message = &OpenAIMessageResponse{
						Role:    fmt.Sprintf("%v", message["role"]),
						Content: FilterDroidIdentity(fmt.Sprintf("%v", message["content"])),
					}
				}

				// Extract finish_reason
				if fr, ok := choiceMap["finish_reason"].(string); ok {
					openaiChoice.FinishReason = &fr
				}

				openaiResp.Choices = append(openaiResp.Choices, openaiChoice)
			}
		}

		// Extract usage
		if usage, ok := trollResp["usage"].(map[string]interface{}); ok {
			openaiResp.Usage = usage
		}

		return openaiResp, nil
	}

	// TrollLLM custom format: output array
	openaiResp := &OpenAIResponse{
		ID:      fmt.Sprintf("%v", trollResp["id"]),
		Object:  "chat.completion",
		Created: t.Created,
		Model:   t.Model,
		Choices: []OpenAIChoice{
			{
				Index: 0,
				Message: &OpenAIMessageResponse{
					Role:    "assistant",
					Content: "",
				},
				FinishReason: stringPtr("stop"),
			},
		},
	}

	// Extract response content
	// TrollLLM OpenAI response format:
	// output: [
	//   {type: "reasoning", ...},  // Reasoning process
	//   {type: "message", content: [{text: "...", type: "output_text"}], ...}  // Actual reply
	// ]
	if output, ok := trollResp["output"].([]interface{}); ok && len(output) > 0 {
		for _, item := range output {
			if outputItem, ok := item.(map[string]interface{}); ok {
				// Find item with type=message
				if itemType, ok := outputItem["type"].(string); ok && itemType == "message" {
					// Extract content array
					if contentArray, ok := outputItem["content"].([]interface{}); ok {
						for _, contentItem := range contentArray {
							if contentMap, ok := contentItem.(map[string]interface{}); ok {
								// Extract text field
								if text, ok := contentMap["text"].(string); ok {
									openaiResp.Choices[0].Message.Content += FilterDroidIdentity(text)
								}
							}
						}
					}
					break // Exit after finding message
				}
			}
		}
	}

	// Extract finish_reason
	if status, ok := trollResp["status"].(string); ok {
		finishReason := "stop"
		if status == "incomplete" {
			finishReason = "length"
		}
		openaiResp.Choices[0].FinishReason = &finishReason
	}

	// Add usage information
	if usage, ok := trollResp["usage"].(map[string]interface{}); ok {
		inputTokens := 0
		outputTokens := 0
		if it, ok := usage["input_tokens"].(float64); ok {
			inputTokens = int(it)
		}
		if ot, ok := usage["output_tokens"].(float64); ok {
			outputTokens = int(ot)
		}
		openaiResp.Usage = map[string]interface{}{
			"prompt_tokens":     inputTokens,
			"completion_tokens": outputTokens,
			"total_tokens":      inputTokens + outputTokens,
		}
	}

	return openaiResp, nil
}

// TransformStreamChunk transforms a streaming response chunk
func (t *TrollOpenAIResponseTransformer) TransformStreamChunk(eventType string, eventData map[string]interface{}) (string, error) {
	switch eventType {
	case "response.created":
		return t.createOpenAIChunk("", "assistant", false, ""), nil

	case "response.in_progress":
		return "", nil

	// GPT Extended Thinking: reasoning process (not forwarded)
	case "response.reasoning_summary_text.delta":
		return "", nil

	case "response.reasoning_summary_text.done":
		return "", nil

	case "response.reasoning_summary_part.done":
		return "", nil

	// GPT actual output text
	case "response.output_text.delta":
		text := ""
		if delta, ok := eventData["delta"].(string); ok {
			text = FilterDroidIdentity(delta, true) // streaming: preserve whitespace
		} else if textVal, ok := eventData["text"].(string); ok {
			text = FilterDroidIdentity(textVal, true) // streaming: preserve whitespace
		}
		return t.createOpenAIChunk(text, "", false, ""), nil

	case "response.output_text.done":
		return "", nil

	case "response.output_item.added":
		return "", nil

	case "response.output_item.done":
		return "", nil

	case "response.done":
		status := ""
		if response, ok := eventData["response"].(map[string]interface{}); ok {
			if statusVal, ok := response["status"].(string); ok {
				status = statusVal
			}
		}

		finishReason := "stop"
		if status == "incomplete" {
			finishReason = "length"
		}
		return t.createOpenAIChunk("", "", true, finishReason), nil

	case "response.incomplete":
		// GPT incomplete due to max_output_tokens or other reasons
		finishReason := "length"
		if response, ok := eventData["response"].(map[string]interface{}); ok {
			if incompleteDetails, ok := response["incomplete_details"].(map[string]interface{}); ok {
				if reason, ok := incompleteDetails["reason"].(string); ok {
					if reason == "max_output_tokens" {
						finishReason = "length"
					}
				}
			}
		}
		return t.createOpenAIChunk("", "", true, finishReason), nil

	default:
		return "", nil
	}
}

// createOpenAIChunk creates an OpenAI format streaming chunk
func (t *TrollOpenAIResponseTransformer) createOpenAIChunk(content, role string, finish bool, finishReason string) string {
	chunk := OpenAIResponse{
		ID:      t.RequestID,
		Object:  "chat.completion.chunk",
		Created: t.Created,
		Model:   t.Model,
		Choices: []OpenAIChoice{
			{
				Index: 0,
				Delta: &OpenAIMessageResponse{},
			},
		},
	}

	if role != "" {
		chunk.Choices[0].Delta.Role = role
	}
	if content != "" {
		chunk.Choices[0].Delta.Content = content
	}
	if finish {
		chunk.Choices[0].FinishReason = &finishReason
	}

	jsonData, _ := json.Marshal(chunk)
	return fmt.Sprintf("data: %s\n\n", string(jsonData))
}

// TransformStream transforms a streaming response
func (t *TrollOpenAIResponseTransformer) TransformStream(reader io.Reader) chan string {
	output := make(chan string, 100)

	go func() {
		defer close(output)

		scanner := bufio.NewScanner(reader)
		var currentEvent string

		for scanner.Scan() {
			line := scanner.Text()

			if line == "" {
				continue
			}

			// Handle standard OpenAI SSE format (TrollLLM may return directly)
			if strings.HasPrefix(line, "data: ") {
				dataStr := strings.TrimPrefix(line, "data: ")

				// Check if it's [DONE] marker
				if strings.TrimSpace(dataStr) == "[DONE]" {
					output <- "data: [DONE]\n\n"
					continue
				}

				// Try to parse as standard OpenAI chunk
				var openaiChunk map[string]interface{}
				if err := json.Unmarshal([]byte(dataStr), &openaiChunk); err == nil {
					// Check if already in standard OpenAI format
					if _, hasChoices := openaiChunk["choices"]; hasChoices {
						// Forward directly (only update model and filter Droid)
						openaiChunk["model"] = t.Model
						// Filter Droid from choices content
						if choices, ok := openaiChunk["choices"].([]interface{}); ok {
							for _, choice := range choices {
								if choiceMap, ok := choice.(map[string]interface{}); ok {
									if delta, ok := choiceMap["delta"].(map[string]interface{}); ok {
										if content, ok := delta["content"].(string); ok {
											delta["content"] = FilterDroidIdentity(content, true) // streaming: preserve whitespace
										}
									}
									if message, ok := choiceMap["message"].(map[string]interface{}); ok {
										if content, ok := message["content"].(string); ok {
											message["content"] = FilterDroidIdentity(content, true) // streaming: preserve whitespace
										}
									}
								}
							}
						}
						if jsonData, err := json.Marshal(openaiChunk); err == nil {
							output <- fmt.Sprintf("data: %s\n\n", string(jsonData))
						}
						continue
					}

					// TrollLLM custom event format
					if chunk, err := t.TransformStreamChunk(currentEvent, openaiChunk); err == nil && chunk != "" {
						output <- chunk
					}
				}
			} else if strings.HasPrefix(line, "event: ") {
				currentEvent = strings.TrimPrefix(line, "event: ")
			}
		}

		// Send end marker (if not already sent)
		output <- "data: [DONE]\n\n"
	}()

	return output
}

// stringPtr returns a string pointer
func stringPtr(s string) *string {
	return &s
}
