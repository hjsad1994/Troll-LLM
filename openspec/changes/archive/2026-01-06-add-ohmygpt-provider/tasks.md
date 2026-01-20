# Tasks: Add OhMyGPT Provider

## Phase 1: Core Provider Implementation

- [x] Create `goproxy/internal/ohmygpt/ohmygpt.go` with provider implementation
  - Copy from OpenHands and adapt for OhMyGPT endpoint
  - Update constants: `OhMyGPTBaseURL`, `OhMyGPTName`, endpoint URLs
  - Implement key pool, rotation, status tracking
  - Add request forwarding with retry logic
  - Add streaming and non-streaming response handlers
  - Add proxy pool integration
  - Add usage tracking

- [x] Create `goproxy/internal/ohmygpt/types.go` for types and interfaces
  - Implement `UsageCallback` type
  - Implement `Provider` interface
  - Implement `SanitizeError` functions

- [x] Create `goproxy/internal/ohmygpt/registry.go` for provider registration
  - Implement `RegisterProvider()` function
  - Implement `GetProvider()` function
  - Implement `IsConfigured()` function
  - Implement `GetAllProviders()` function

- [x] Update `goproxy/db/mongodb.go` to add OhMyGPT collections
  - Add `OhMyGPTKeysCollection()` function
  - Add `ohmygpt_bindings` collection reference

## Phase 2: Configuration

- [x] Create `goproxy/config-ohmygpt-dev.json`
  - Set development endpoint URL
  - Configure Claude model aliases (Opus, Sonnet, Haiku)
  - Set billing multipliers (1.0 for dev)
  - Configure user agent
  - Set port 8005

- [x] Create `goproxy/config-ohmygpt-prod.json`
  - Set production endpoint URL
  - Configure Claude model aliases (Opus, Sonnet, Haiku)
  - Set billing multipliers (1.06-1.08 for prod)
  - Configure user agent
  - Set port 8005

- [x] Add config loading logic in `goproxy/config/config.go`
  - Support loading OhMyGPT configuration

## Phase 3: Main Integration

- [x] Update `goproxy/main.go`
  - Import OhMyGPT package
  - Add `ConfigureOhMyGPT()` call during initialization
  - Add OhMyGPT to provider registry
  - Start auto-reload for OhMyGPT keys
  - Add OhMyGPT routing logic in `selectUpstreamConfig`
  - Add `handleOhMyGPTOpenAIRequest` handler function
  - Update reload endpoint to include OhMyGPT

## Phase 4: Database Setup

- [x] Create MongoDB indexes for `ohmygpt_keys` collection
  - Index on `status` for key selection
  - Index on `cooldownUntil` for cleanup
  - Index on `createdAt` for sorting

- [x] Create MongoDB indexes for `ohmygpt_bindings` collection
  - Compound index on `proxyId` + `isActive`
  - Index on `ohmygptKeyId`

- [x] Create seed script for OhMyGPT keys
  - Add initial OhMyGPT API keys to `ohmygpt_keys` collection
  - Document key format and requirements

- [x] Create backup.go for OhMyGPT key rotation
  - Implement `OhMyGPTBackupKey` struct
  - Implement backup key management functions
  - Implement `CleanupUsedOhMyGPTBackupKeys` function
  - Implement `StartOhMyGPTBackupKeyCleanupJob` function

- [x] Add `RotateKey` method to OhMyGPTProvider
  - Implement key rotation with backup keys
  - Update `CheckAndRotateOnError` to use backup keys
  - Start cleanup job in main.go

## Phase 5: Testing & Validation

- [ ] Test OhMyGPT provider with Claude Opus 4.5
  - Verify chat completions endpoint
  - Verify messages endpoint (Anthropic format)
  - Test streaming responses
  - Test non-streaming responses

- [ ] Test key rotation on errors
  - Simulate 401 (unauthorized)
  - Simulate 402 (payment required)
  - Simulate 429 (rate limit)
  - Verify cooldown and retry logic

- [ ] Test proxy integration
  - Verify proxy pool selection
  - Verify proxy-key bindings work

- [ ] Test usage tracking
  - Verify tokens are counted correctly
  - Verify MongoDB updates

## Phase 6: Documentation (Optional)

- [ ] Document OhMyGPT provider setup
  - How to add API keys
  - How to configure model aliases
  - How to set up proxy bindings

- [ ] Update project documentation
  - Add OhMyGPT to supported providers list
  - Document endpoint differences

## Dependencies & Ordering

1. **Phase 1** must complete before Phase 2-3 (core provider needed first)
2. **Phase 2** can happen in parallel with Phase 1 (config files)
3. **Phase 3** requires Phase 1-2 to complete
4. **Phase 4** can happen anytime (independent DB setup)
5. **Phase 5** requires Phase 1-3 to complete
6. **Phase 6** can happen anytime (documentation is independent)

## Parallelizable Work

- Phase 2 (config files) can be done alongside Phase 1
- Phase 4 (DB setup) can be done independently
- Documentation (Phase 6) can be written at any time
