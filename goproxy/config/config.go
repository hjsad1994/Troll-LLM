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
	InputPricePerMTok     float64 `json:"input_price_per_mtok"`
	OutputPricePerMTok    float64 `json:"output_price_per_mtok"`
	CacheWritePricePerMTok float64 `json:"cache_write_price_per_mtok"`
	CacheHitPricePerMTok   float64 `json:"cache_hit_price_per_mtok"`
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
	BillingMultiplier             = 1.3 // 30% markup
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
func GetModelCachePricing(modelID string) (cacheWritePrice, cacheHitPrice float64) {
	model := GetModelByID(modelID)
	if model == nil {
		return DefaultCacheWritePricePerMTok, DefaultCacheHitPricePerMTok
	}
	cacheWritePrice = model.CacheWritePricePerMTok
	cacheHitPrice = model.CacheHitPricePerMTok
	if cacheWritePrice <= 0 {
		cacheWritePrice = DefaultCacheWritePricePerMTok
	}
	if cacheHitPrice <= 0 {
		cacheHitPrice = DefaultCacheHitPricePerMTok
	}
	return cacheWritePrice, cacheHitPrice
}

// CalculateBillingCost calculates the cost in USD for input/output tokens (without cache)
// Applies BillingMultiplier (1.2x) to the final cost
func CalculateBillingCost(modelID string, inputTokens, outputTokens int64) float64 {
	inputPrice, outputPrice := GetModelPricing(modelID)
	inputCost := (float64(inputTokens) / 1_000_000) * inputPrice
	outputCost := (float64(outputTokens) / 1_000_000) * outputPrice
	return (inputCost + outputCost) * BillingMultiplier
}

// CalculateBillingCostWithCache calculates the cost in USD including cache tokens
// Applies BillingMultiplier (1.2x) to the final cost
func CalculateBillingCostWithCache(modelID string, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64) float64 {
	inputPrice, outputPrice := GetModelPricing(modelID)
	cacheWritePrice, cacheHitPrice := GetModelCachePricing(modelID)
	
	inputCost := (float64(inputTokens) / 1_000_000) * inputPrice
	outputCost := (float64(outputTokens) / 1_000_000) * outputPrice
	cacheWriteCost := (float64(cacheWriteTokens) / 1_000_000) * cacheWritePrice
	cacheHitCost := (float64(cacheHitTokens) / 1_000_000) * cacheHitPrice
	
	return (inputCost + outputCost + cacheWriteCost + cacheHitCost) * BillingMultiplier
}

// CalculateBillingTokens converts cost to equivalent "billing tokens" for quota tracking
// Uses Sonnet pricing as the base reference ($3 input, $15 output -> avg $9/MTok)
func CalculateBillingTokens(modelID string, inputTokens, outputTokens int64) int64 {
	cost := CalculateBillingCost(modelID, inputTokens, outputTokens)
	// Convert cost to billing tokens using average reference price ($9/MTok)
	// This normalizes all models to a common billing unit
	const referenceAvgPricePerMTok = 9.0
	billingTokens := (cost / referenceAvgPricePerMTok) * 1_000_000
	return int64(billingTokens)
}

// GetTokenMultiplier - deprecated, kept for backward compatibility
func GetTokenMultiplier(modelID string) float64 {
	inputPrice, outputPrice := GetModelPricing(modelID)
	avgPrice := (inputPrice + outputPrice) / 2
	return avgPrice / ((DefaultInputPricePerMTok + DefaultOutputPricePerMTok) / 2)
}
