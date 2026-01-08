# Implementation Tasks

## 1. GLM Provider Package
- [x] 1.1 Create `goproxy/internal/glm/` directory
- [x] 1.2 Implement `glm.go` with provider struct and methods
- [x] 1.3 Implement `forwardToEndpoint()` method for GLM API calls
- [x] 1.4 Implement internal model mapping (Claude → GLM models)
- [x] 1.5 Implement model name rewriting in responses (GLM → original Claude model)
- [x] 1.6 Implement streaming response support with format conversion
- [x] 1.7 Add error handling and logging
- [ ] 1.8 Add unit tests for GLM provider

## 2. Failover State Manager
- [x] 2.1 Create `goproxy/internal/cache/failover.go` with `FailoverStateManager` struct
- [x] 2.2 Implement per-model failover state storage (map[model]failoverState)
- [x] 2.3 Implement `ActivateFailover(model, duration)` method
- [x] 2.4 Implement `IsInFailover(model)` method
- [x] 2.5 Implement `GetFailoverUntil(model)` method
- [x] 2.6 Implement `ClearFailover(model)` method
- [x] 2.7 Add thread-safety with mutex/sync.RWMutex
- [ ] 2.8 Add unit tests for state transitions

## 3. Cache Detector Integration
- [x] 3.1 Modify `goproxy/internal/cache/detector.go` to import failover manager
- [x] 3.2 Add `ShouldTriggerFailover()` method to check loss threshold
- [x] 3.3 Call `ActivateFailover()` when cache loss exceeds threshold
- [x] 3.4 Add logging for failover activation events
- [x] 3.5 Add configuration for loss threshold (env var)
- [x] 3.6 Add configuration for cooldown duration (env var)
- [x] 3.7 Add configuration for enable/disable (env var)

## 4. Upstream Routing Integration
- [x] 4.1 Modify `goproxy/main.go` `selectUpstreamConfig()` function
- [x] 4.2 Add failover state check before routing to OhMyGPT
- [x] 4.3 Add GLM upstream configuration function
- [x] 4.4 Add logging for failover routing decisions
- [x] 4.5 Handle model mapping for GLM requests

## 5. Configuration
- [x] 5.1 Add GLM API key to environment variables (`GLM_API_KEY`)
- [x] 5.2 Add GLM endpoint URL to environment variables (`GLM_ENDPOINT`)
- [x] 5.3 Add `CACHE_FAILOVER_ENABLED` env var (default: false)
- [x] 5.4 Add `CACHE_FAILOVER_LOSS_THRESHOLD` env var (default: 1.50)
- [x] 5.5 Add `CACHE_FAILOVER_COOLDOWN_MINUTES` env var (default: 15)
- [ ] 5.6 Add GLM model pricing to `config/config.go`
- [ ] 5.7 Add GLM upstream mapping to model config

## 6. Testing
- [ ] 6.1 Write unit test for failover state manager
- [ ] 6.2 Write unit test for cache detector failover trigger
- [ ] 6.3 Write integration test for GLM provider
- [ ] 6.4 Write end-to-end test for full failover flow
- [ ] 6.5 Test streaming responses via GLM
- [ ] 6.6 Test failover cooldown and retry logic
- [ ] 6.7 Test with staging traffic before production

## 7. Documentation and Monitoring
- [ ] 7.1 Update README with GLM failover configuration
- [ ] 7.2 Add metrics for failover events (prometheus/statsd)
- [x] 7.3 Add logs for failover state transitions
- [ ] 7.4 Add admin endpoint to check failover status (optional)
- [ ] 7.5 Document GLM API key setup process
