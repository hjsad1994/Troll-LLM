package config

import (
	"encoding/json"
	"fmt"
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
	Name                  string  `json:"name"`
	ID                    string  `json:"id"`
	Type                  string  `json:"type"`
	Reasoning             string  `json:"reasoning"`
	ThinkingBudget        int     `json:"thinking_budget,omitempty"` // Budget tokens for thinking mode
	InputPricePerMTok     float64 `json:"input_price_per_mtok"`
	OutputPricePerMTok    float64 `json:"output_price_per_mtok"`
	CacheWritePricePerMTok float64 `json:"cache_write_price_per_mtok"`
	CacheHitPricePerMTok   float64 `json:"cache_hit_price_per_mtok"`
	BillingMultiplier      float64 `json:"billing_multiplier"`
	Upstream              string  `json:"upstream"`                    // "troll" or "main" - determines which upstream provider to use
	UpstreamModelID       string  `json:"upstream_model_id,omitempty"` // Model ID to use when sending to upstream (if different from ID)
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

// GetModelByID gets model configuration by model ID
func GetModelByID(modelID string) *Model {
	cfg := GetConfig()
	if cfg == nil {
		return nil
	}

	for _, model := range cfg.Models {
		if model.ID == modelID {
			return &model
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
// Returns "main", "troll", or "ohmygpt" (default is "troll" if not specified)
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
	case "troll", "main", "ohmygpt":
		return true
	default:
		return false
	}
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
	DefaultBillingMultiplier      = 1.15 // Default 15% markup
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

// GetModelMultiplier gets billing multiplier for a model
func GetModelMultiplier(modelID string) float64 {
	model := GetModelByID(modelID)
	if model == nil || model.BillingMultiplier <= 0 {
		return DefaultBillingMultiplier
	}
	return model.BillingMultiplier
}

// CalculateBillingCost calculates the cost in USD for input/output tokens (without cache)
// Applies per-model BillingMultiplier to the final cost
func CalculateBillingCost(modelID string, inputTokens, outputTokens int64) float64 {
	inputPrice, outputPrice := GetModelPricing(modelID)
	multiplier := GetModelMultiplier(modelID)
	inputCost := (float64(inputTokens) / 1_000_000) * inputPrice
	outputCost := (float64(outputTokens) / 1_000_000) * outputPrice
	return (inputCost + outputCost) * multiplier
}

// CalculateBillingCostWithCache calculates the cost in USD including cache tokens
// Applies per-model BillingMultiplier to the final cost
func CalculateBillingCostWithCache(modelID string, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64) float64 {
	inputPrice, outputPrice := GetModelPricing(modelID)
	cacheWritePrice, cacheHitPrice := GetModelCachePricing(modelID)
	multiplier := GetModelMultiplier(modelID)
	
	inputCost := (float64(inputTokens) / 1_000_000) * inputPrice
	outputCost := (float64(outputTokens) / 1_000_000) * outputPrice
	cacheWriteCost := (float64(cacheWriteTokens) / 1_000_000) * cacheWritePrice
	cacheHitCost := (float64(cacheHitTokens) / 1_000_000) * cacheHitPrice
	
	return (inputCost + outputCost + cacheWriteCost + cacheHitCost) * multiplier
}

// CalculateBillingTokens calculates tokens to deduct from user's balance (without cache)
func CalculateBillingTokens(modelID string, inputTokens, outputTokens int64) int64 {
	return CalculateBillingTokensWithCache(modelID, inputTokens, outputTokens, 0, 0)
}

// CalculateBillingTokensWithCache calculates tokens to deduct including cache tokens
// Cache tokens are weighted by their price ratio relative to input price:
// - cache_write: typically 1.25x input (more expensive to write)
// - cache_hit: typically 0.1x input (much cheaper to read from cache)
// Then applies model-specific billing_multiplier (Opus x2.0, Sonnet x1.2, Haiku x0.4)
func CalculateBillingTokensWithCache(modelID string, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64) int64 {
	inputPrice, _ := GetModelPricing(modelID)
	cacheWritePrice, cacheHitPrice := GetModelCachePricing(modelID)
	multiplier := GetModelMultiplier(modelID)
	
	// Calculate cache token weights relative to input price
	cacheWriteWeight := 1.0
	cacheHitWeight := 0.1
	if inputPrice > 0 {
		cacheWriteWeight = cacheWritePrice / inputPrice
		cacheHitWeight = cacheHitPrice / inputPrice
	}
	
	// Effective tokens = input + output + weighted cache tokens
	effectiveTokens := float64(inputTokens) + float64(outputTokens) + 
		float64(cacheWriteTokens)*cacheWriteWeight + 
		float64(cacheHitTokens)*cacheHitWeight
	
	// Apply model multiplier
	billingTokens := effectiveTokens * multiplier
	return int64(billingTokens)
}

// GetTokenMultiplier - deprecated, kept for backward compatibility
func GetTokenMultiplier(modelID string) float64 {
	inputPrice, outputPrice := GetModelPricing(modelID)
	avgPrice := (inputPrice + outputPrice) / 2
	return avgPrice / ((DefaultInputPricePerMTok + DefaultOutputPricePerMTok) / 2)
}
