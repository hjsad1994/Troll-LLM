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
	Name            string  `json:"name"`
	ID              string  `json:"id"`
	Type            string  `json:"type"`
	Reasoning       string  `json:"reasoning"`
	TokenMultiplier float64 `json:"token_multiplier"`
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

// GetTokenMultiplier gets token multiplier for a model (default 1.0)
func GetTokenMultiplier(modelID string) float64 {
	model := GetModelByID(modelID)
	if model == nil || model.TokenMultiplier <= 0 {
		return 1.0
	}
	return model.TokenMultiplier
}

// CalculateBillingTokens calculates billing tokens with multiplier
func CalculateBillingTokens(modelID string, rawTokens int64) int64 {
	multiplier := GetTokenMultiplier(modelID)
	return int64(float64(rawTokens) * multiplier)
}
