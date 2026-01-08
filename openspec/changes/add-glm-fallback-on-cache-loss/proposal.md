# Change: Add GLM 4.7 Fallback on Cache Loss Threshold

## Why

OhMyGPT provider is experiencing cache fallback events that result in significant cost loss (>$1.5 per event). To optimize costs and improve service reliability, we need an automatic failover mechanism that redirects user requests to GLM 4.7 (a more cost-effective alternative) during periods of poor cache performance, while periodically retrying OhMyGPT to allow recovery when cache conditions improve.

## What Changes

- **ADDED**: GLM 4.7 as a backup provider for cache fallback scenarios
- **MODIFIED**: Cache fallback detection to trigger automatic provider failover when:
  - Cache is not detected (`cache_read_input_tokens: 0` and `cache_creation_input_tokens: 0`)
  - Estimated loss exceeds `$1.50`
- **ADDED**: Time-based failover state machine with 15-minute cooldown cycles:
  - When threshold exceeded: forward ALL requests to GLM 4.7 for 15 minutes
  - After 15 minutes: retry OhMyGPT and monitor cache performance
  - If cache still missing: repeat cycle (forward to GLM for another 15 minutes)
- **ADDED**: GLM provider integration with API key: `c766e3323f504b5da5eaa9b2b971962d.g9e5mUzILgPPvTc7`
- **ADDED**: GLM endpoint configuration: `https://api.z.ai/api/paas/v4/chat/completions`
- **ADDED**: Logging and monitoring for failover state transitions

## Impact

- **Affected specs**:
  - `cache-fallback-detection` - MODIFIED to add failover trigger logic
  - New spec for GLM provider integration
- **Affected code**:
  - `goproxy/internal/cache/detector.go` - Add failover state management
  - `goproxy/internal/glm/` - New GLM provider package
  - `goproxy/main.go` - Update `selectUpstreamConfig()` to check failover state
  - `goproxy/config/config.go` - Add GLM model pricing and configuration
- **Configuration**:
  - New env vars: `GLM_API_KEY`, `GLM_ENDPOINT`, `CACHE_FAILOVER_LOSS_THRESHOLD`, `CACHE_FAILOVER_COOLDOWN_MINUTES`
  - GLM endpoint: `https://api.z.ai/api/paas/v4/chat/completions`
  - Configurable loss threshold (default: $1.50)
  - Configurable cooldown duration (default: 15 minutes)
