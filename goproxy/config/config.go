package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
)

// Endpoint configuration
type Endpoint struct {
	Name    string `json:"name"`
	BaseURL string `json:"base_url"`
}

// Model configuration
type Model struct {
	Name                    string   `json:"name"`
	ID                      string   `json:"id"`
	IDAliases               []string `json:"id_aliases,omitempty"` // Alternative model IDs that map to this model
	Type                    string   `json:"type"`
	Reasoning               string   `json:"reasoning"`
	ThinkingBudget          int      `json:"thinking_budget,omitempty"` // Budget tokens for thinking mode
	InputPricePerMTok       float64  `json:"input_price_per_mtok"`
	OutputPricePerMTok      float64  `json:"output_price_per_mtok"`
	CacheWritePricePerMTok  float64  `json:"cache_write_price_per_mtok"`
	CacheHitPricePerMTok    float64  `json:"cache_hit_price_per_mtok"`
	BatchInputPricePerMTok  float64  `json:"batch_input_price_per_mtok,omitempty"`  // Optional: Batch mode input price (defaults to 50% of regular)
	BatchOutputPricePerMTok float64  `json:"batch_output_price_per_mtok,omitempty"` // Optional: Batch mode output price (defaults to 50% of regular)
	BillingMultiplier       float64  `json:"billing_multiplier,omitempty"`          // Multiplier applied to final billing cost (default 1.0)
	Upstream                string   `json:"upstream"`                              // "troll" or "main" - determines which upstream provider to use
	UpstreamModelID         string   `json:"upstream_model_id,omitempty"`           // Model ID to use when sending to upstream (if different from ID)
	BillingUpstream         string   `json:"billing_upstream,omitempty"`            // "openhands" or "ohmygpt" - determines which credit field to deduct from
}

// Config global configuration
type Config struct {
	Port         int        `json:"port"`
	Endpoints    []Endpoint `json:"endpoints"`
	Models       []Model    `json:"models"`
	SystemPrompt string     `json:"system_prompt"`
	UserAgent    string     `json:"user_agent"`
}

var (
	globalConfig *Config
	configMutex  sync.RWMutex
)

// LoadConfig loads configuration file
func LoadConfig(configPath string) (*Config, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// Set default values
	if cfg.Port == 0 {
		cfg.Port = 8000
	}
	if cfg.UserAgent == "" {
		cfg.UserAgent = "factory-cli/0.19.3"
	}

	configMutex.Lock()
	globalConfig = &cfg
	configMutex.Unlock()

	return &cfg, nil
}

// GetConfig gets global configuration
func GetConfig() *Config {
	configMutex.RLock()
	defer configMutex.RUnlock()
	return globalConfig
}

// GetModelByID gets model configuration by model ID or alias
func GetModelByID(modelID string) *Model {
	cfg := GetConfig()
	if cfg == nil {
		return nil
	}

	for i := range cfg.Models {
		model := &cfg.Models[i]
		// Check primary ID
		if model.ID == modelID {
			return model
		}
		// Check aliases
		for _, alias := range model.IDAliases {
			if alias == modelID {
				return model
			}
		}
	}
	return nil
}

// GetEndpointByType gets endpoint configuration by type
func GetEndpointByType(endpointType string) *Endpoint {
	cfg := GetConfig()
	if cfg == nil {
		return nil
	}

	for _, endpoint := range cfg.Endpoints {
		if endpoint.Name == endpointType {
			return &endpoint
		}
	}
	return nil
}

// GetSystemPrompt gets system prompt
func GetSystemPrompt() string {
	cfg := GetConfig()
	if cfg == nil {
		return ""
	}
	return cfg.SystemPrompt
}

// GetUserAgent gets User-Agent
func GetUserAgent() string {
	cfg := GetConfig()
	if cfg == nil {
		return "factory-cli/0.19.3"
	}
	return cfg.UserAgent
}

// GetModelReasoning gets model reasoning level
func GetModelReasoning(modelID string) string {
	model := GetModelByID(modelID)
	if model == nil {
		return ""
	}

	reasoning := model.Reasoning
	// Validate reasoning level
	if reasoning == "low" || reasoning == "medium" || reasoning == "high" {
		return reasoning
	}
	return ""
}

// GetModelThinkingBudget gets thinking budget for a model
// Returns the configured budget or a default based on reasoning level
func GetModelThinkingBudget(modelID string) int {
	model := GetModelByID(modelID)
	if model == nil {
		return 10000 // default
	}

	// Use configured budget if set
	if model.ThinkingBudget > 0 {
		return model.ThinkingBudget
	}

	// Default budgets based on reasoning level
	switch model.Reasoning {
	case "high":
		return 10000
	case "medium":
		return 5000
	case "low":
		return 2000
	default:
		return 10000
	}
}

// GetModelUpstream gets upstream provider for a model
// Returns "main", "troll", or "openhands" (default is "troll" if not specified)
func GetModelUpstream(modelID string) string {
	model := GetModelByID(modelID)
	if model == nil {
		return "troll"
	}
	if model.Upstream != "" {
		return model.Upstream
	}
	return "troll" // default to troll-key
}

// IsValidUpstream checks if upstream value is valid
func IsValidUpstream(upstream string) bool {
	switch upstream {
	case "troll", "main", "openhands":
		return true
	default:
		return false
	}
}

// IsValidBillingUpstream checks if billing_upstream value is valid
func IsValidBillingUpstream(billingUpstream string) bool {
	return billingUpstream == "openhands" || billingUpstream == "ohmygpt"
}

// GetModelBillingUpstream gets billing upstream for a model
// Returns "openhands" or "ohmygpt" (defaults to "ohmygpt" if not specified)
func GetModelBillingUpstream(modelID string) string {
	model := GetModelByID(modelID)
	if model == nil {
		return "ohmygpt" // default to ohmygpt for backward compatibility
	}
	if model.BillingUpstream != "" && IsValidBillingUpstream(model.BillingUpstream) {
		return model.BillingUpstream
	}
	return "ohmygpt" // default to ohmygpt for backward compatibility
}

// GetUpstreamModelID gets the model ID to use when sending to upstream
// Returns UpstreamModelID if configured, otherwise returns the original model ID
func GetUpstreamModelID(modelID string) string {
	model := GetModelByID(modelID)
	if model == nil {
		return modelID
	}
	if model.UpstreamModelID != "" {
		return model.UpstreamModelID
	}
	return modelID // use original ID if no mapping configured
}

// IsModelSupported checks if model is supported
func IsModelSupported(modelID string) bool {
	return GetModelByID(modelID) != nil
}

// GetAllModels gets all model list
func GetAllModels() []Model {
	cfg := GetConfig()
	if cfg == nil {
		return []Model{}
	}
	return cfg.Models
}

// Default pricing (Sonnet as reference)
const (
	DefaultInputPricePerMTok      = 3.0
	DefaultOutputPricePerMTok     = 15.0
	DefaultCacheWritePricePerMTok = 3.75
	DefaultCacheHitPricePerMTok   = 0.30
)

// GetModelPricing gets input/output pricing for a model
func GetModelPricing(modelID string) (inputPrice, outputPrice float64) {
	model := GetModelByID(modelID)
	if model == nil {
		return DefaultInputPricePerMTok, DefaultOutputPricePerMTok
	}
	inputPrice = model.InputPricePerMTok
	outputPrice = model.OutputPricePerMTok
	if inputPrice <= 0 {
		inputPrice = DefaultInputPricePerMTok
	}
	if outputPrice <= 0 {
		outputPrice = DefaultOutputPricePerMTok
	}
	return inputPrice, outputPrice
}

// GetModelCachePricing gets cache write/hit pricing for a model
// Returns 0 if explicitly set to 0 in config (e.g., models without cache support)
func GetModelCachePricing(modelID string) (cacheWritePrice, cacheHitPrice float64) {
	model := GetModelByID(modelID)
	if model == nil {
		return DefaultCacheWritePricePerMTok, DefaultCacheHitPricePerMTok
	}
	// Use configured prices directly (including 0 if explicitly set)
	return model.CacheWritePricePerMTok, model.CacheHitPricePerMTok
}

// GetBillingMultiplier gets the billing multiplier for a model
// Returns 1.0 if not configured or model not found
func GetBillingMultiplier(modelID string) float64 {
	model := GetModelByID(modelID)
	if model == nil || model.BillingMultiplier <= 0 {
		return 1.0 // Default multiplier
	}
	return model.BillingMultiplier
}

// GetBatchPricing gets batch input/output pricing for a model
// Returns 50% of regular pricing if batch pricing is not explicitly configured
func GetBatchPricing(modelID string) (inputPrice, outputPrice float64) {
	model := GetModelByID(modelID)
	if model == nil {
		// Fallback to 50% of default pricing
		return DefaultInputPricePerMTok * 0.5, DefaultOutputPricePerMTok * 0.5
	}

	// If explicitly configured, use configured values
	if model.BatchInputPricePerMTok > 0 && model.BatchOutputPricePerMTok > 0 {
		return model.BatchInputPricePerMTok, model.BatchOutputPricePerMTok
	}

	// Default to 50% of regular pricing
	regularIn, regularOut := GetModelPricing(modelID)
	return regularIn * 0.5, regularOut * 0.5
}

// CalculateBillingCost calculates the cost in USD for input/output tokens (without cache)
func CalculateBillingCost(modelID string, inputTokens, outputTokens int64) float64 {
	inputPrice, outputPrice := GetModelPricing(modelID)
	inputCost := (float64(inputTokens) / 1_000_000) * inputPrice
	outputCost := (float64(outputTokens) / 1_000_000) * outputPrice
	return inputCost + outputCost
}

// CalculateBillingCostWithCache calculates the cost in USD including cache tokens
// Note: For most providers, input_tokens includes ALL tokens (cached + uncached)
// We subtract both cacheHit and cacheWrite from input to get uncached tokens only
// EXCEPTION: OpenHands already returns input_tokens as uncached only, so no subtraction needed
// Uses original cache hit tokens from upstream (no discount applied)
// Finally applies billing_multiplier from config (default 1.0)
func CalculateBillingCostWithCache(modelID string, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64) float64 {
	return CalculateBillingCostWithCacheAndBatch(modelID, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens, false)
}

// CalculateBillingCostWithCacheAndBatch calculates the cost in USD including cache tokens with optional batch mode
// isBatch: if true, applies batch pricing (50% discount by default)
func CalculateBillingCostWithCacheAndBatch(modelID string, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64, isBatch bool) float64 {
	var inputPrice, outputPrice float64
	var batchInputPrice, batchOutputPrice float64

	model := GetModelByID(modelID)

	// Get pricing info for logging
	if isBatch {
		inputPrice, outputPrice = GetBatchPricing(modelID)
	} else {
		inputPrice, outputPrice = GetModelPricing(modelID)
	}

	// Get batch pricing for comparison/logging
	if model != nil && model.BatchInputPricePerMTok > 0 {
		batchInputPrice = model.BatchInputPricePerMTok
		batchOutputPrice = model.BatchOutputPricePerMTok
	}

	cacheWritePrice, cacheHitPrice := GetModelCachePricing(modelID)
	multiplier := GetBillingMultiplier(modelID)

	// Log pricing details for debugging
	regularInPrice, regularOutPrice := inputPrice, outputPrice
	if model != nil && model.InputPricePerMTok > 0 {
		regularInPrice = model.InputPricePerMTok
	}
	if model != nil && model.OutputPricePerMTok > 0 {
		regularOutPrice = model.OutputPricePerMTok
	}

	if isBatch {
		log.Printf("💰 [PRICING] BATCH MODE: model=%s in_price=$%.2f/MTok out_price=$%.2f/MTok cache_write=$%.2f/MTok cache_hit=$%.2f/MTok batch_in=$%.2f/MTok batch_out=$%.2f/MTok multiplier=%.2fx (regular: in=$%.2f out=$%.2f)",
			modelID, inputPrice, outputPrice, cacheWritePrice, cacheHitPrice, batchInputPrice, batchOutputPrice, multiplier, regularInPrice, regularOutPrice)
	} else if batchInputPrice > 0 || batchOutputPrice > 0 {
		log.Printf("💰 [PRICING] REGULAR MODE: model=%s in_price=$%.2f/MTok out_price=$%.2f/MTok cache_write=$%.2f/MTok cache_hit=$%.2f/MTok batch_in=$%.2f/MTok batch_out=$%.2f/MTok multiplier=%.2fx",
			modelID, inputPrice, outputPrice, cacheWritePrice, cacheHitPrice, batchInputPrice, batchOutputPrice, multiplier)
	} else {
		log.Printf("💰 [PRICING] REGULAR MODE: model=%s in_price=$%.2f/MTok out_price=$%.2f/MTok cache_write=$%.2f/MTok cache_hit=$%.2f/MTok multiplier=%.2fx",
			modelID, inputPrice, outputPrice, cacheWritePrice, cacheHitPrice, multiplier)
	}

	// For OpenHands: input_tokens is already uncached, don't subtract
	// For others: input_tokens includes cache, need to subtract
	var actualInputTokens int64
	if model != nil && model.Upstream == "openhands" {
		actualInputTokens = inputTokens // OpenHands already returns net input
	} else {
		actualInputTokens = inputTokens - cacheHitTokens - cacheWriteTokens
		if actualInputTokens < 0 {
			actualInputTokens = 0
		}
	}

	inputCost := (float64(actualInputTokens) / 1_000_000) * inputPrice
	outputCost := (float64(outputTokens) / 1_000_000) * outputPrice
	cacheWriteCost := (float64(cacheWriteTokens) / 1_000_000) * cacheWritePrice
	cacheHitCost := (float64(cacheHitTokens) / 1_000_000) * cacheHitPrice

	baseCost := inputCost + outputCost + cacheWriteCost + cacheHitCost
	return baseCost * multiplier
}

// CalculateBillingTokens calculates tokens to deduct from user's balance (without cache)
func CalculateBillingTokens(modelID string, inputTokens, outputTokens int64) int64 {
	return CalculateBillingTokensWithCache(modelID, inputTokens, outputTokens, 0, 0)
}

// CalculateBillingTokensWithCache calculates tokens to deduct including cache tokens
// Cache tokens are weighted by their price ratio relative to input price:
// - cache_write: typically 1.25x input (more expensive to write)
// - cache_hit: typically 0.1x input (much cheaper to read from cache)
// EXCEPTION: OpenHands already returns input_tokens as uncached only, so no subtraction needed
// Uses original cache hit tokens from upstream (no discount applied)
// Finally applies billing_multiplier from config (default 1.0)
func CalculateBillingTokensWithCache(modelID string, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64) int64 {
	inputPrice, _ := GetModelPricing(modelID)
	cacheWritePrice, cacheHitPrice := GetModelCachePricing(modelID)
	multiplier := GetBillingMultiplier(modelID)

	// For OpenHands: input_tokens is already uncached, don't subtract
	// For others: input_tokens includes cache, need to subtract
	model := GetModelByID(modelID)
	var actualInputTokens int64
	if model != nil && model.Upstream == "openhands" {
		actualInputTokens = inputTokens // OpenHands already returns net input
	} else {
		actualInputTokens = inputTokens - cacheHitTokens - cacheWriteTokens
		if actualInputTokens < 0 {
			actualInputTokens = 0
		}
	}

	// Calculate cache token weights relative to input price
	cacheWriteWeight := 1.0
	cacheHitWeight := 0.1
	if inputPrice > 0 {
		cacheWriteWeight = cacheWritePrice / inputPrice
		cacheHitWeight = cacheHitPrice / inputPrice
	}

	// Effective tokens = actual input + output + weighted cache tokens
	effectiveTokens := float64(actualInputTokens) + float64(outputTokens) +
		float64(cacheWriteTokens)*cacheWriteWeight +
		float64(cacheHitTokens)*cacheHitWeight

	return int64(effectiveTokens * multiplier)
}

// GetTokenMultiplier - deprecated, kept for backward compatibility
func GetTokenMultiplier(modelID string) float64 {
	inputPrice, outputPrice := GetModelPricing(modelID)
	avgPrice := (inputPrice + outputPrice) / 2
	return avgPrice / ((DefaultInputPricePerMTok + DefaultOutputPricePerMTok) / 2)
}
