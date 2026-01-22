package transformers

import (
	"log"
	"strings"
)

// Token limits for different models
const (
	// Claude models context window
	DefaultMaxContextTokens = 200000
	// Safety margin - leave room for output tokens and overhead
	DefaultSafetyMargin = 10000
	// Default max tokens to target (200K - 10K safety = 190K)
	DefaultTargetMaxTokens = DefaultMaxContextTokens - DefaultSafetyMargin
)

// TruncationResult contains information about what was truncated
type TruncationResult struct {
	WasTruncated    bool
	OriginalTokens  int64
	FinalTokens     int64
	MessagesRemoved int
	TokensRemoved   int64
}

// EstimateOpenAITokens estimates token count for an OpenAI request
// Uses rough estimation: 1 token ≈ 4 characters (conservative)
func EstimateOpenAITokens(req *OpenAIRequest) int64 {
	var totalChars int64

	// Count characters in all messages
	for _, msg := range req.Messages {
		totalChars += estimateMessageTokens(&msg)
	}

	// Rough estimation: 1 token ≈ 4 chars
	estimatedTokens := totalChars / 4

	// Add overhead for message structure (rough estimate)
	estimatedTokens += int64(len(req.Messages) * 4)

	// Add overhead for tools if present
	if len(req.Tools) > 0 {
		estimatedTokens += int64(len(req.Tools) * 100) // rough estimate per tool
	}

	return estimatedTokens
}

// estimateMessageTokens estimates tokens for a single message
func estimateMessageTokens(msg *OpenAIMessage) int64 {
	var chars int64

	// Add role chars
	chars += int64(len(msg.Role))

	// Add content chars
	if content, ok := msg.Content.(string); ok {
		chars += int64(len(content))
	} else if parts, ok := msg.Content.([]interface{}); ok {
		for _, part := range parts {
			if partMap, ok := part.(map[string]interface{}); ok {
				if text, ok := partMap["text"].(string); ok {
					chars += int64(len(text))
				}
				// Images are roughly 85 tokens for low detail, 765+ for high detail
				if partMap["type"] == "image_url" {
					chars += 3000 // Conservative estimate (~750 tokens)
				}
			}
		}
	}

	// Add tool_calls overhead
	if msg.ToolCalls != nil {
		chars += 200 // rough estimate for tool call structure
	}

	return chars
}

// TruncateOpenAIRequest truncates messages to fit within token limit
// Strategy:
// 1. ALWAYS preserve: system message (first), last user message
// 2. Remove oldest messages from the middle until under limit
// 3. Keep tool_call/tool pairs together (don't orphan them)
//
// Returns the modified request and truncation info
func TruncateOpenAIRequest(req *OpenAIRequest, maxTokens int64) (*OpenAIRequest, TruncationResult) {
	if maxTokens <= 0 {
		maxTokens = DefaultTargetMaxTokens
	}

	result := TruncationResult{
		OriginalTokens: EstimateOpenAITokens(req),
	}

	// If already under limit, no truncation needed
	if result.OriginalTokens <= maxTokens {
		result.FinalTokens = result.OriginalTokens
		return req, result
	}

	log.Printf("✂️ [Truncate] Starting truncation: %d tokens > %d max", result.OriginalTokens, maxTokens)

	// Clone messages to avoid modifying original
	messages := make([]OpenAIMessage, len(req.Messages))
	copy(messages, req.Messages)

	// Remove messages from oldest until under limit
	removedCount := 0
	removedTokens := int64(0)

	for EstimateOpenAIRequestTokens(messages) > maxTokens {
		// Rebuild protected indices and tool maps each iteration (indices change after removal)
		systemIndex := -1
		lastUserIndex := -1
		for i, msg := range messages {
			if msg.Role == "system" && systemIndex == -1 {
				systemIndex = i
			}
			if msg.Role == "user" {
				lastUserIndex = i
			}
		}

		// Build tool call maps fresh each iteration
		toolResultMap := make(map[string]int)        // tool_call_id -> message index
		assistantToolCalls := make(map[int][]string) // assistant index -> tool_call_ids

		for i, msg := range messages {
			if msg.Role == "tool" && msg.ToolCallID != "" {
				toolResultMap[msg.ToolCallID] = i
			}
			if msg.Role == "assistant" && msg.ToolCalls != nil {
				if toolCalls, ok := msg.ToolCalls.([]interface{}); ok {
					var ids []string
					for _, tc := range toolCalls {
						if tcMap, ok := tc.(map[string]interface{}); ok {
							if id, ok := tcMap["id"].(string); ok && id != "" {
								ids = append(ids, id)
							}
						}
					}
					if len(ids) > 0 {
						assistantToolCalls[i] = ids
					}
				}
			}
		}

		// Find the oldest removable message
		removeIndex := -1
		for i := range messages {
			// Skip protected messages
			if i == systemIndex {
				continue
			}
			if i == lastUserIndex {
				continue
			}
			// Skip if this is within the last 2 messages (keep recent context)
			if i >= len(messages)-2 {
				continue
			}

			// Found a removable message
			removeIndex = i
			break
		}

		if removeIndex == -1 {
			// No more messages can be removed
			log.Printf("⚠️ [Truncate] Cannot truncate further - only protected messages remain")
			break
		}

		// Mark indices to remove (tool pairs should be removed together)
		markedForRemoval := make(map[int]bool)
		markedForRemoval[removeIndex] = true

		msg := messages[removeIndex]

		// If it's an assistant with tool_calls, also mark tool results for removal
		if ids, ok := assistantToolCalls[removeIndex]; ok {
			for _, id := range ids {
				if resultIdx, exists := toolResultMap[id]; exists {
					markedForRemoval[resultIdx] = true
				}
			}
		}

		// If it's a tool result, also mark the corresponding assistant for removal
		if msg.Role == "tool" && msg.ToolCallID != "" {
			for assistIdx, ids := range assistantToolCalls {
				for _, id := range ids {
					if id == msg.ToolCallID {
						markedForRemoval[assistIdx] = true
						// Also mark all other tool results for this assistant
						for _, otherId := range ids {
							if resultIdx, exists := toolResultMap[otherId]; exists {
								markedForRemoval[resultIdx] = true
							}
						}
						break
					}
				}
			}
		}

		// Convert marked indices to sorted list (descending for safe removal)
		indicesToRemove := make([]int, 0, len(markedForRemoval))
		for idx := range markedForRemoval {
			indicesToRemove = append(indicesToRemove, idx)
		}
		indicesToRemove = uniqueSortedDesc(indicesToRemove)

		// Calculate tokens being removed and remove messages
		for _, idx := range indicesToRemove {
			if idx < len(messages) {
				removedTokens += estimateMessageTokens(&messages[idx]) / 4
				messages = append(messages[:idx], messages[idx+1:]...)
				removedCount++
			}
		}
	}

	// Create new request with truncated messages
	truncatedReq := &OpenAIRequest{
		Model:            req.Model,
		Messages:         messages,
		MaxTokens:        req.MaxTokens,
		Temperature:      req.Temperature,
		TopP:             req.TopP,
		Stream:           req.Stream,
		Tools:            req.Tools,
		PresencePenalty:  req.PresencePenalty,
		FrequencyPenalty: req.FrequencyPenalty,
	}

	result.WasTruncated = removedCount > 0
	result.FinalTokens = EstimateOpenAITokens(truncatedReq)
	result.MessagesRemoved = removedCount
	result.TokensRemoved = removedTokens

	if result.WasTruncated {
		log.Printf("✂️ [Truncate] Completed: removed %d messages (~%d tokens), %d -> %d tokens",
			removedCount, removedTokens, result.OriginalTokens, result.FinalTokens)
	}

	return truncatedReq, result
}

// EstimateOpenAIRequestTokens estimates tokens for a slice of messages
func EstimateOpenAIRequestTokens(messages []OpenAIMessage) int64 {
	var totalChars int64
	for _, msg := range messages {
		totalChars += estimateMessageTokens(&msg)
	}
	return totalChars/4 + int64(len(messages)*4)
}

// EstimateAnthropicTokens estimates token count for an Anthropic request
func EstimateAnthropicTokens(req *AnthropicRequest) int64 {
	var totalChars int64

	// Count system prompt chars
	if req.System != nil {
		if systemArray, ok := req.System.([]interface{}); ok {
			for _, item := range systemArray {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if text, ok := itemMap["text"].(string); ok {
						totalChars += int64(len(text))
					}
				}
			}
		} else if systemStr, ok := req.System.(string); ok {
			totalChars += int64(len(systemStr))
		}
	}

	// Count characters in all messages
	for _, msg := range req.Messages {
		totalChars += int64(len(msg.Role))

		if content, ok := msg.Content.(string); ok {
			totalChars += int64(len(content))
		} else if contentArray, ok := msg.Content.([]interface{}); ok {
			for _, item := range contentArray {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if text, ok := itemMap["text"].(string); ok {
						totalChars += int64(len(text))
					}
					// Images
					if itemMap["type"] == "image" {
						totalChars += 3000
					}
				}
			}
		}
	}

	estimatedTokens := totalChars / 4
	estimatedTokens += int64(len(req.Messages) * 4)

	return estimatedTokens
}

// TruncateAnthropicRequest truncates Anthropic messages to fit within token limit
// Strategy:
// 1. ALWAYS preserve: last user message
// 2. Remove oldest messages from the beginning until under limit
// 3. Handle tool_use/tool_result content blocks - remove pairs together
//
// Note: In Anthropic format, tool_use appears in assistant messages and tool_result in user messages
// as content blocks, not separate message roles like OpenAI format.
func TruncateAnthropicRequest(req *AnthropicRequest, maxTokens int64) (*AnthropicRequest, TruncationResult) {
	if maxTokens <= 0 {
		maxTokens = DefaultTargetMaxTokens
	}

	result := TruncationResult{
		OriginalTokens: EstimateAnthropicTokens(req),
	}

	if result.OriginalTokens <= maxTokens {
		result.FinalTokens = result.OriginalTokens
		return req, result
	}

	log.Printf("✂️ [Truncate-Anthropic] Starting truncation: %d tokens > %d max", result.OriginalTokens, maxTokens)

	// Clone messages
	messages := make([]AnthropicMessage, len(req.Messages))
	copy(messages, req.Messages)

	// Remove oldest messages (keep system in req.System, not in messages)
	removedCount := 0
	removedTokens := int64(0)

	for EstimateAnthropicMessagesTokens(messages) > maxTokens-estimateSystemTokens(req.System) {
		// Rebuild lastUserIndex each iteration
		lastUserIndex := -1
		for i, msg := range messages {
			if msg.Role == "user" {
				lastUserIndex = i
			}
		}

		// Build tool_use ID maps fresh each iteration
		// In Anthropic format:
		// - tool_use blocks appear in assistant messages with "id" field
		// - tool_result blocks appear in user messages with "tool_use_id" field
		toolUseMap := make(map[string]int)    // tool_use id -> assistant message index
		toolResultMap := make(map[string]int) // tool_use_id -> user message index

		for i, msg := range messages {
			if contentArray, ok := msg.Content.([]interface{}); ok {
				for _, item := range contentArray {
					if itemMap, ok := item.(map[string]interface{}); ok {
						blockType, _ := itemMap["type"].(string)
						if blockType == "tool_use" {
							if id, ok := itemMap["id"].(string); ok && id != "" {
								toolUseMap[id] = i
							}
						} else if blockType == "tool_result" {
							if toolUseID, ok := itemMap["tool_use_id"].(string); ok && toolUseID != "" {
								toolResultMap[toolUseID] = i
							}
						}
					}
				}
			}
		}

		// Find oldest removable message
		removeIndex := -1
		for i := range messages {
			if i == lastUserIndex {
				continue
			}
			if i >= len(messages)-2 {
				continue
			}
			removeIndex = i
			break
		}

		if removeIndex == -1 {
			log.Printf("⚠️ [Truncate-Anthropic] Cannot truncate further")
			break
		}

		// Mark indices to remove (tool pairs should be removed together)
		markedForRemoval := make(map[int]bool)
		markedForRemoval[removeIndex] = true

		// Check if this message contains tool_use or tool_result blocks
		msg := messages[removeIndex]
		if contentArray, ok := msg.Content.([]interface{}); ok {
			for _, item := range contentArray {
				if itemMap, ok := item.(map[string]interface{}); ok {
					blockType, _ := itemMap["type"].(string)

					// If assistant message has tool_use, mark corresponding tool_result message
					if blockType == "tool_use" {
						if id, ok := itemMap["id"].(string); ok && id != "" {
							if resultIdx, exists := toolResultMap[id]; exists {
								markedForRemoval[resultIdx] = true
							}
						}
					}

					// If user message has tool_result, mark corresponding tool_use message
					if blockType == "tool_result" {
						if toolUseID, ok := itemMap["tool_use_id"].(string); ok && toolUseID != "" {
							if useIdx, exists := toolUseMap[toolUseID]; exists {
								markedForRemoval[useIdx] = true
							}
						}
					}
				}
			}
		}

		// Convert marked indices to sorted list (descending for safe removal)
		indicesToRemove := make([]int, 0, len(markedForRemoval))
		for idx := range markedForRemoval {
			indicesToRemove = append(indicesToRemove, idx)
		}
		indicesToRemove = uniqueSortedDesc(indicesToRemove)

		// Calculate tokens being removed and remove messages
		for _, idx := range indicesToRemove {
			if idx < len(messages) {
				removedTokens += estimateAnthropicMessageTokens(&messages[idx]) / 4
				messages = append(messages[:idx], messages[idx+1:]...)
				removedCount++
			}
		}
	}

	// Create truncated request
	truncatedReq := &AnthropicRequest{
		Model:       req.Model,
		Messages:    messages,
		System:      req.System,
		MaxTokens:   req.MaxTokens,
		Temperature: req.Temperature,
		Stream:      req.Stream,
		Thinking:    req.Thinking,
		Tools:       req.Tools,
		ToolChoice:  req.ToolChoice,
	}

	result.WasTruncated = removedCount > 0
	result.FinalTokens = EstimateAnthropicTokens(truncatedReq)
	result.MessagesRemoved = removedCount
	result.TokensRemoved = removedTokens

	if result.WasTruncated {
		log.Printf("✂️ [Truncate-Anthropic] Completed: removed %d messages (~%d tokens), %d -> %d tokens",
			removedCount, removedTokens, result.OriginalTokens, result.FinalTokens)
	}

	return truncatedReq, result
}

// estimateAnthropicMessageTokens estimates tokens for a single Anthropic message
func estimateAnthropicMessageTokens(msg *AnthropicMessage) int64 {
	var chars int64
	chars += int64(len(msg.Role))

	if content, ok := msg.Content.(string); ok {
		chars += int64(len(content))
	} else if contentArray, ok := msg.Content.([]interface{}); ok {
		for _, item := range contentArray {
			if itemMap, ok := item.(map[string]interface{}); ok {
				if text, ok := itemMap["text"].(string); ok {
					chars += int64(len(text))
				}
				// Images
				if itemMap["type"] == "image" {
					chars += 3000
				}
			}
		}
	}

	return chars
}

// EstimateAnthropicMessagesTokens estimates tokens for Anthropic messages
func EstimateAnthropicMessagesTokens(messages []AnthropicMessage) int64 {
	var totalChars int64
	for _, msg := range messages {
		totalChars += int64(len(msg.Role))
		if content, ok := msg.Content.(string); ok {
			totalChars += int64(len(content))
		} else if contentArray, ok := msg.Content.([]interface{}); ok {
			for _, item := range contentArray {
				if itemMap, ok := item.(map[string]interface{}); ok {
					if text, ok := itemMap["text"].(string); ok {
						totalChars += int64(len(text))
					}
				}
			}
		}
	}
	return totalChars/4 + int64(len(messages)*4)
}

// estimateSystemTokens estimates tokens for system prompt
func estimateSystemTokens(system interface{}) int64 {
	if system == nil {
		return 0
	}
	var chars int64
	if systemArray, ok := system.([]interface{}); ok {
		for _, item := range systemArray {
			if itemMap, ok := item.(map[string]interface{}); ok {
				if text, ok := itemMap["text"].(string); ok {
					chars += int64(len(text))
				}
			}
		}
	} else if systemStr, ok := system.(string); ok {
		chars += int64(len(systemStr))
	}
	return chars / 4
}

// uniqueSortedDesc returns unique indices sorted in descending order
func uniqueSortedDesc(indices []int) []int {
	if len(indices) == 0 {
		return indices
	}

	// Deduplicate
	seen := make(map[int]bool)
	unique := make([]int, 0, len(indices))
	for _, idx := range indices {
		if !seen[idx] {
			seen[idx] = true
			unique = append(unique, idx)
		}
	}

	// Sort descending (simple bubble sort for small arrays)
	for i := 0; i < len(unique)-1; i++ {
		for j := i + 1; j < len(unique); j++ {
			if unique[i] < unique[j] {
				unique[i], unique[j] = unique[j], unique[i]
			}
		}
	}

	return unique
}

// AddTruncationNotice adds a notice to the system prompt that messages were truncated
func AddTruncationNotice(systemPrompt string, removedCount int) string {
	notice := "\n\n[Note: " + itoa(removedCount) + " older messages were removed to fit within context limit. Recent conversation preserved.]"
	return systemPrompt + notice
}

// itoa converts int to string without importing strconv
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	negative := n < 0
	if negative {
		n = -n
	}
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	if negative {
		s = "-" + s
	}
	return s
}

// ShouldTruncate checks if a request needs truncation
func ShouldTruncate(estimatedTokens int64, maxTokens int64) bool {
	if maxTokens <= 0 {
		maxTokens = DefaultTargetMaxTokens
	}
	return estimatedTokens > maxTokens
}

// GetModelMaxTokens returns the max context tokens for a model
// Can be extended to support different models with different limits
func GetModelMaxTokens(modelID string) int64 {
	modelLower := strings.ToLower(modelID)

	// Claude 3.5 Sonnet, Claude 3 Opus, etc. have 200K context
	if strings.Contains(modelLower, "claude") {
		return DefaultTargetMaxTokens
	}

	// GPT-4 Turbo has 128K
	if strings.Contains(modelLower, "gpt-4-turbo") || strings.Contains(modelLower, "gpt-4-1106") {
		return 120000 // 128K - 8K safety
	}

	// GPT-4 has 8K or 32K depending on variant
	if strings.Contains(modelLower, "gpt-4-32k") {
		return 30000
	}
	if strings.Contains(modelLower, "gpt-4") {
		return 7000
	}

	// Default to Claude's limit
	return DefaultTargetMaxTokens
}
