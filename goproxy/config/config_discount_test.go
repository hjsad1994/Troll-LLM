package config

import "testing"

func TestApplyPriorityGLMDiscount(t *testing.T) {
	tests := []struct {
		name            string
		port            int
		modelID         string
		billingUpstream string
		upstreamModelID string
		cost            float64
		want            float64
	}{
		{
			name:            "priority line glm-4.6 gets 60 percent off",
			port:            8006,
			modelID:         "claude-opus-4-6",
			billingUpstream: "openhands",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            4,
		},
		{
			name:            "priority line supports glm4-6 alias",
			port:            8006,
			modelID:         "claude-sonnet-4-5-20250929",
			billingUpstream: "openhands",
			upstreamModelID: "glm4-6",
			cost:            10,
			want:            4,
		},
		{
			name:            "priority line haiku has no discount even on glm-4.6",
			port:            8006,
			modelID:         "claude-haiku-4-5-20251001",
			billingUpstream: "openhands",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            10,
		},
		{
			name:            "normal line has no discount",
			port:            8004,
			modelID:         "claude-opus-4-6",
			billingUpstream: "openhands",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            10,
		},
		{
			name:            "priority line non-openhands billing has no discount",
			port:            8006,
			modelID:         "claude-opus-4-6",
			billingUpstream: "ohmygpt",
			upstreamModelID: "glm-4.6",
			cost:            10,
			want:            10,
		},
		{
			name:            "priority line non-glm has no discount",
			port:            8006,
			modelID:         "claude-haiku-4-5-20251001",
			billingUpstream: "openhands",
			upstreamModelID: "prod/claude-sonnet-4-5-20250929",
			cost:            10,
			want:            10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			restore := setTestConfigForDiscount(tt.modelID, tt.billingUpstream, tt.port)
			defer restore()

			got := ApplyPriorityGLMDiscount(tt.modelID, tt.upstreamModelID, tt.cost)
			if got != tt.want {
				t.Fatalf("ApplyPriorityGLMDiscount() = %v, want %v", got, tt.want)
			}
		})
	}
}

func setTestConfigForDiscount(modelID string, billingUpstream string, port int) func() {
	configMutex.Lock()
	oldCfg := globalConfig
	globalConfig = &Config{
		Port: port,
		Models: []Model{
			{
				ID:              modelID,
				BillingUpstream: billingUpstream,
			},
		},
	}
	configMutex.Unlock()

	return func() {
		configMutex.Lock()
		globalConfig = oldCfg
		configMutex.Unlock()
	}
}
