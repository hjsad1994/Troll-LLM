package transformers

import (
	"testing"
)

// =============================================================================
// Token Estimation Tests
// =============================================================================

func TestEstimateOpenAITokens_SimpleMessage(t *testing.T) {
	req := &OpenAIRequest{
		Model: "claude-sonnet-4-20250514",
		Messages: []OpenAIMessage{
			{Role: "user", Content: "Hello, how are you?"},
		},
	}

	tokens := EstimateOpenAITokens(req)

	// "user" (4 chars) + "Hello, how are you?" (19 chars) = 23 chars / 4 = ~6 tokens + overhead
	if tokens < 5 || tokens > 20 {
		t.Errorf("Expected tokens between 5-20, got %d", tokens)
	}
}

func TestEstimateOpenAITokens_MultipleMessages(t *testing.T) {
	req := &OpenAIRequest{
		Model: "claude-sonnet-4-20250514",
		Messages: []OpenAIMessage{
			{Role: "system", Content: "You are a helpful assistant."},
			{Role: "user", Content: "Hello!"},
			{Role: "assistant", Content: "Hi there! How can I help you today?"},
			{Role: "user", Content: "What is 2+2?"},
		},
	}

	tokens := EstimateOpenAITokens(req)

	if tokens < 20 || tokens > 100 {
		t.Errorf("Expected tokens between 20-100, got %d", tokens)
	}
}

func TestEstimateOpenAITokens_LongContent(t *testing.T) {
	// Create a long content string (~10K chars = ~3333 tokens with RunesPerToken=3)
	longContent := ""
	for i := 0; i < 10000; i++ {
		longContent += "a"
	}

	req := &OpenAIRequest{
		Model: "claude-sonnet-4-20250514",
		Messages: []OpenAIMessage{
			{Role: "user", Content: longContent},
		},
	}

	tokens := EstimateOpenAITokens(req)

	// 10000 chars / 3 (RunesPerToken) = ~3333 tokens + overhead
	// Accept range from 3200 to 3500
	if tokens < 3200 || tokens > 3500 {
		t.Errorf("Expected tokens around 3333, got %d", tokens)
	}
}

// =============================================================================
// Truncation Tests
// =============================================================================

func TestTruncateOpenAIRequest_NoTruncationNeeded(t *testing.T) {
	req := &OpenAIRequest{
		Model: "claude-sonnet-4-20250514",
		Messages: []OpenAIMessage{
			{Role: "system", Content: "You are helpful."},
			{Role: "user", Content: "Hello!"},
		},
	}

	truncated, result := TruncateOpenAIRequest(req, DefaultTargetMaxTokens)

	if result.WasTruncated {
		t.Error("Expected no truncation needed")
	}
	if len(truncated.Messages) != 2 {
		t.Errorf("Expected 2 messages, got %d", len(truncated.Messages))
	}
}

func TestTruncateOpenAIRequest_TruncatesOldestMessages(t *testing.T) {
	// Create a request that exceeds limit
	messages := []OpenAIMessage{
		{Role: "system", Content: "System prompt"},
	}

	// Add many messages to exceed limit
	longContent := ""
	for i := 0; i < 50000; i++ {
		longContent += "word "
	}

	// Add old messages
	for i := 0; i < 5; i++ {
		messages = append(messages, OpenAIMessage{
			Role:    "user",
			Content: longContent,
		})
		messages = append(messages, OpenAIMessage{
			Role:    "assistant",
			Content: "Response " + itoa(i),
		})
	}

	// Add the last user message (should be preserved)
	messages = append(messages, OpenAIMessage{
		Role:    "user",
		Content: "Final question",
	})

	req := &OpenAIRequest{
		Model:    "claude-sonnet-4-20250514",
		Messages: messages,
	}

	// Use a small limit to force truncation
	truncated, result := TruncateOpenAIRequest(req, 50000)

	if !result.WasTruncated {
		t.Error("Expected truncation to occur")
	}

	// System message should be preserved
	if truncated.Messages[0].Role != "system" {
		t.Error("System message should be first")
	}

	// Last user message should be preserved
	lastMsg := truncated.Messages[len(truncated.Messages)-1]
	if lastMsg.Role != "user" || lastMsg.Content != "Final question" {
		t.Errorf("Last user message should be preserved, got role=%s content=%s", lastMsg.Role, lastMsg.Content)
	}

	t.Logf("Truncation result: removed %d messages, %d -> %d tokens",
		result.MessagesRemoved, result.OriginalTokens, result.FinalTokens)
}

func TestTruncateOpenAIRequest_PreservesSystemAndLastUser(t *testing.T) {
	messages := []OpenAIMessage{
		{Role: "system", Content: "Important system instructions"},
		{Role: "user", Content: "Old message 1"},
		{Role: "assistant", Content: "Old response 1"},
		{Role: "user", Content: "Old message 2"},
		{Role: "assistant", Content: "Old response 2"},
		{Role: "user", Content: "MUST PRESERVE: Final question"},
	}

	req := &OpenAIRequest{
		Model:    "claude-sonnet-4-20250514",
		Messages: messages,
	}

	// Force truncation with very low limit
	truncated, _ := TruncateOpenAIRequest(req, 100)

	// Check system preserved
	foundSystem := false
	for _, msg := range truncated.Messages {
		if msg.Role == "system" && msg.Content.(string) == "Important system instructions" {
			foundSystem = true
		}
	}
	if !foundSystem {
		t.Error("System message should be preserved")
	}

	// Check last user preserved
	lastUserContent := ""
	for _, msg := range truncated.Messages {
		if msg.Role == "user" {
			lastUserContent = msg.Content.(string)
		}
	}
	if lastUserContent != "MUST PRESERVE: Final question" {
		t.Errorf("Last user message not preserved, got: %s", lastUserContent)
	}
}

// =============================================================================
// Model Max Tokens Tests
// =============================================================================

func TestGetModelMaxTokens(t *testing.T) {
	testCases := []struct {
		model    string
		expected int64
	}{
		{"claude-sonnet-4-20250514", DefaultTargetMaxTokens},
		{"claude-3-opus-20240229", DefaultTargetMaxTokens},
		{"gpt-4-turbo", 120000},
		{"gpt-4-1106-preview", 120000},
		{"gpt-4-32k", 30000},
		{"gpt-4", 7000},
		{"unknown-model", DefaultTargetMaxTokens},
	}

	for _, tc := range testCases {
		t.Run(tc.model, func(t *testing.T) {
			result := GetModelMaxTokens(tc.model)
			if result != tc.expected {
				t.Errorf("GetModelMaxTokens(%s) = %d, expected %d", tc.model, result, tc.expected)
			}
		})
	}
}

// =============================================================================
// ShouldTruncate Tests
// =============================================================================

func TestShouldTruncate(t *testing.T) {
	testCases := []struct {
		tokens    int64
		maxTokens int64
		expected  bool
	}{
		{100000, 190000, false},
		{190001, 190000, true},
		{200000, 190000, true},
		{50000, 0, false}, // 0 means use default
		{200000, 0, true},
	}

	for _, tc := range testCases {
		result := ShouldTruncate(tc.tokens, tc.maxTokens)
		if result != tc.expected {
			t.Errorf("ShouldTruncate(%d, %d) = %v, expected %v",
				tc.tokens, tc.maxTokens, result, tc.expected)
		}
	}
}

// =============================================================================
// Anthropic Truncation Tests
// =============================================================================

func TestTruncateAnthropicRequest_NoTruncationNeeded(t *testing.T) {
	req := &AnthropicRequest{
		Model:  "claude-sonnet-4-20250514",
		System: "You are helpful.",
		Messages: []AnthropicMessage{
			{Role: "user", Content: "Hello!"},
		},
	}

	truncated, result := TruncateAnthropicRequest(req, DefaultTargetMaxTokens)

	if result.WasTruncated {
		t.Error("Expected no truncation needed")
	}
	if len(truncated.Messages) != 1 {
		t.Errorf("Expected 1 message, got %d", len(truncated.Messages))
	}
}

func TestEstimateAnthropicTokens(t *testing.T) {
	req := &AnthropicRequest{
		Model:  "claude-sonnet-4-20250514",
		System: "System prompt here",
		Messages: []AnthropicMessage{
			{Role: "user", Content: "Hello!"},
			{Role: "assistant", Content: "Hi there!"},
		},
	}

	tokens := EstimateAnthropicTokens(req)

	if tokens < 10 || tokens > 50 {
		t.Errorf("Expected tokens between 10-50, got %d", tokens)
	}
}

// =============================================================================
// Helper Function Tests
// =============================================================================

func TestUniqueSortedDesc(t *testing.T) {
	testCases := []struct {
		input    []int
		expected []int
	}{
		{[]int{1, 3, 2, 3, 1}, []int{3, 2, 1}},
		{[]int{5}, []int{5}},
		{[]int{}, []int{}},
		{[]int{1, 2, 3}, []int{3, 2, 1}},
	}

	for _, tc := range testCases {
		result := uniqueSortedDesc(tc.input)
		if len(result) != len(tc.expected) {
			t.Errorf("uniqueSortedDesc(%v) length = %d, expected %d", tc.input, len(result), len(tc.expected))
			continue
		}
		for i := range result {
			if result[i] != tc.expected[i] {
				t.Errorf("uniqueSortedDesc(%v)[%d] = %d, expected %d", tc.input, i, result[i], tc.expected[i])
			}
		}
	}
}

func TestItoa(t *testing.T) {
	testCases := []struct {
		input    int
		expected string
	}{
		{0, "0"},
		{42, "42"},
		{-5, "-5"},
		{12345, "12345"},
	}

	for _, tc := range testCases {
		result := itoa(tc.input)
		if result != tc.expected {
			t.Errorf("itoa(%d) = %s, expected %s", tc.input, result, tc.expected)
		}
	}
}
