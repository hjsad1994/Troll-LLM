package config

import (
	"math"
	"testing"
)

func TestApplyPriorityGLMDiscount(t *testing.T) {
	tests := []struct {
		name            string
		modelID         string
		modelName       string
		configPath      string
		billingUpstream string
		upstreamModelID string
		cost            float64
		want            float64
	}{
		{
			name:            "applies 40 percent discount for glm-4.6 on priority config",
			modelID:         "claude-opus-4-6",
			modelName:       "Claude Opus 4.6",
			configPath:      "config-openhands-prod-uutien.json",
			billingUpstream: "openhands",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            6,
		},
		{
			name:            "supports glm4-6 alias",
			modelID:         "claude-opus-4-5-20251101",
			modelName:       "Claude Opus 4.5",
			configPath:      "config-openhands-prod-uutien.json",
			billingUpstream: "openhands",
			upstreamModelID: "glm4-6",
			cost:            10,
			want:            6,
		},
		{
			name:            "does not apply for haiku even when upstream is glm-4.6",
			modelID:         "claude-haiku-4-5-20251001",
			modelName:       "Claude Haiku 4.5",
			configPath:      "config-openhands-prod-uutien.json",
			billingUpstream: "openhands",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            10,
		},
		{
			name:            "does not apply for sonnet on priority config",
			modelID:         "claude-sonnet-4-5-20250929",
			modelName:       "Claude Sonnet 4.5",
			configPath:      "config-openhands-prod-uutien.json",
			billingUpstream: "openhands",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            10,
		},
		{
			name:            "applies 60 percent discount for opus on normal openhands config",
			modelID:         "claude-opus-4-6",
			modelName:       "Claude Opus 4.6",
			configPath:      "config-openhands-prod.json",
			billingUpstream: "openhands",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            4,
		},
		{
			name:            "applies 60 percent discount for sonnet on normal openhands config",
			modelID:         "claude-sonnet-4-5-20250929",
			modelName:       "Claude Sonnet 4.5",
			configPath:      "config-openhands-prod.json",
			billingUpstream: "openhands",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            4,
		},
		{
			name:            "applies 60 percent discount for haiku on normal openhands config",
			modelID:         "claude-haiku-4-5-20251001",
			modelName:       "Claude Haiku 4.5",
			configPath:      "config-openhands-prod.json",
			billingUpstream: "openhands",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            4,
		},
		{
			name:            "does not apply on unrelated config",
			modelID:         "claude-opus-4-6",
			modelName:       "Claude Opus 4.6",
			configPath:      "config-openhands-staging.json",
			billingUpstream: "openhands",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            10,
		},
		{
			name:            "does not apply for non-openhands billing",
			modelID:         "claude-opus-4-6",
			modelName:       "Claude Opus 4.6",
			configPath:      "config-openhands-prod-uutien.json",
			billingUpstream: "ohmygpt",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            10,
		},
		{
			name:            "does not apply for non-glm upstream model",
			modelID:         "claude-opus-4-6",
			modelName:       "Claude Opus 4.6",
			configPath:      "config-openhands-prod-uutien.json",
			billingUpstream: "openhands",
			upstreamModelID: "prod/claude-sonnet-4-5-20250929",
			cost:            10,
			want:            10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setTestConfigForDiscount(t, tt.modelID, tt.modelName, tt.configPath, tt.billingUpstream)

			got := ApplyPriorityGLMDiscount(tt.modelID, tt.upstreamModelID, tt.cost)
			if math.Abs(got-tt.want) > 1e-9 {
				t.Fatalf("ApplyPriorityGLMDiscount() = %v, want %v", got, tt.want)
			}
		})
	}
}

func setTestConfigForDiscount(t *testing.T, modelID string, modelName string, configPath string, billingUpstream string) {
	t.Helper()

	configMutex.Lock()
	oldConfig := globalConfig
	oldConfigPath := loadedConfigPath

	globalConfig = &Config{
		Models: []Model{
			{
				ID:              modelID,
				Name:            modelName,
				BillingUpstream: billingUpstream,
			},
		},
	}
	loadedConfigPath = configPath
	configMutex.Unlock()

	t.Cleanup(func() {
		configMutex.Lock()
		globalConfig = oldConfig
		loadedConfigPath = oldConfigPath
		configMutex.Unlock()
	})
}
