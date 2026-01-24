# GoProxy Internal Modules

**Parent:** See root [AGENTS.md](../../AGENTS.md) for project overview and general conventions.

## Overview

High-performance LLM proxy internals. 6 core modules handling key validation, credit deduction, rate limiting, and request routing.

## Structure

```
internal/
├── userkey/      # API key validation, credits check (387 lines validator.go)
├── usage/        # Credit deduction, request logging (520 lines tracker.go)
├── ratelimit/    # Rate limiting (limiter.go, limiter_optimized.go)
├── keypool/      # Factory key pool rotation
├── proxy/        # HTTP proxy pool management
├── openhands/    # OpenHands upstream handler (main upstream)
├── ohmygpt/      # OhMyGPT upstream handler (legacy naming)
├── openhandspool/# OpenHands key pool rotation
├── errorlog/     # Error logging to MongoDB
├── cache/        # Response caching detector
├── bufpool/      # Buffer pooling for performance
└── maintarget/   # Main target server handler (for specific models)
```

## Critical Patterns

### Error Handling
Package-level error vars. ALWAYS check these explicitly:
```go
var (
    ErrKeyNotFound         = errors.New("API key not found")
    ErrKeyRevoked          = errors.New("API key has been revoked")
    ErrInsufficientCredits = errors.New("insufficient credits")
    ErrMigrationRequired   = errors.New("migration required...")
)
```

### Context Timeouts
ALL DB operations MUST use 5-second context timeout:
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
```

### Atomic Credit Deduction (Story 2.2)
Credit deduction uses MongoDB atomic conditional updates. NEVER modify without understanding:
- `deductCreditsAtomic()` in `usage/tracker.go` - uses `$expr` for atomic balance check
- `CalculateDeductionSplit()` - splits cost between `credits` and `refCredits`
- Pre-check balance BEFORE processing request, atomic deduct AFTER

### Two Credit Systems
| Field | Used By | Description |
|-------|---------|-------------|
| `credits` + `refCredits` | chat2.trollllm.xyz (port 8005) | Legacy OhMyGPT balance |
| `creditsNew` | chat.trollllm.xyz (port 8004) | OpenHands balance |

Functions:
- `DeductCreditsOhMyGPT()` → `credits`/`refCredits` fields
- `DeductCreditsOpenHands()` → `creditsNew` field

### Key Validation Flow
1. `ValidateKey(apiKey)` → tries `user_keys` collection first
2. Falls back to `usersNew` collection (for `sk-trollllm-*` keys)
3. Checks: active status → expiry → migration status → credits

### Batched Writes
`usage/batcher.go` batches DB writes for performance. Check `UseBatchedWrites` flag.

## Module-Specific Notes

### userkey/
- `validator.go`: Main validation logic. Empty username = env-based auth (bypasses DB)
- `friendkey.go`: Friend key validation with model-specific limits
- Tests in `validator_test.go` cover acceptance criteria explicitly

### usage/
- `tracker.go`: Credit deduction with atomic operations
- `batcher.go`: Batched DB writes for high throughput
- Logging uses emoji prefixes: `💰`, `💸`, `❌`, `✅`

### ratelimit/
- `limiter.go`: Basic rate limiter
- `limiter_optimized.go`: High-performance implementation
- Uses `xsync` package for concurrent map operations

### openhands/ & ohmygpt/
- Similar structure: `registry.go`, `backup.go`, handler
- `spend_checker.go`: Monitors upstream spend limits
- IMPORTANT: Container names are legacy. Both use OpenHands upstream now.

## Anti-Patterns

- NEVER suppress errors with empty returns
- NEVER use `context.TODO()` - always provide timeout
- NEVER modify atomic deduction logic without understanding race conditions
- NEVER assume which credit field to use - check port/upstream config
