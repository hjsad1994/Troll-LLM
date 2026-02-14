package config

import "testing"

func TestApplyPriorityGLMDiscount_Disabled(t *testing.T) {
	tests := []struct {
		name            string
		modelID         string
		upstreamModelID string
		cost            float64
	}{
		{
			name:            "priority model",
			modelID:         "claude-opus-4-6",
			upstreamModelID: "glm-4.6",
			cost:            10,
		},
		{
			name:            "normal model",
			modelID:         "claude-sonnet-4-5-20250929",
			upstreamModelID: "glm-4.6",
			cost:            10,
		},
		{
			name:            "non glm",
			modelID:         "claude-haiku-4-5-20251001",
			upstreamModelID: "prod/claude-sonnet-4-5-20250929",
			cost:            10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ApplyPriorityGLMDiscount(tt.modelID, tt.upstreamModelID, tt.cost)
			if got != tt.cost {
				t.Fatalf("ApplyPriorityGLMDiscount() = %v, want %v", got, tt.cost)
			}
		})
	}
}
