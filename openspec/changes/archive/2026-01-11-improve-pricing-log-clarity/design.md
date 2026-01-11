# improve-pricing-log-clarity Design

## Architecture

### Current Implementation

The deduction logging happens in `goproxy/internal/usage/tracker.go`:

```go
// Line 252 (current)
log.Printf("💰 [%s] Deducted $%.6f (in=%d, out=%d)", username, cost, inputTokens, outputTokens)
```

The cost is calculated in `goproxy/config/config.go`:
```go
// CalculateBillingCostWithCacheAndBatch (line 338)
// Returns: baseCost * multiplier
```

### Proposed Changes

#### Component: `goproxy/internal/usage/tracker.go`

**Current signature:**
```go
func DeductCreditsWithCache(username string, cost float64, tokensUsed, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64) error
```

**Add model ID parameter:**
```go
func DeductCreditsWithCache(username string, modelID string, cost float64, tokensUsed, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64) error
```

**New log format:**
```go
// Option A: Detailed single-line format
model := config.GetModelByID(modelID)
inputPrice, outputPrice := config.GetModelPricing(modelID)
multiplier := config.GetBillingMultiplier(modelID)
remainingCredits := ... // fetch from database

log.Printf("💰 [%s] Deducted $%.6f for %s (in=%d @ $%.2f/MTok, out=%d @ $%.2f/MTok, multiplier=%.2fx) remaining=$%.2f",
    username, cost, model.Name, inputTokens, inputPrice, outputTokens, outputPrice, multiplier, remainingCredits)
```

#### Call Sites Update

Need to update all calls to `DeductCreditsWithCache` to pass `modelID`:

1. **OhMyGPT handler** (`main.go` ~line 1700)
2. **Troll key handler** (`main.go` ~line 1400)
3. **OpenHands handler** (`main.go` ~line 1424)

### Data Flow

```
Request → HandleXXXRequest()
         → CalculateBillingCostWithCache()
         → DeductCreditsWithCache(username, modelID, cost, ...)
         → [ENHANCED] Log with pricing details
         → Update database
```

## Trade-offs

### Verbosity vs. Clarity
- **Pro**: More details help users understand charges
- **Con**: Longer log lines, more storage
- **Decision**: Single-line format balances both

### Performance vs. Information
- **Pro**: Showing remaining balance requires extra DB query
- **Con**: May add 1-5ms per request
- **Decision**: Balance already fetched in `deductCreditsAtomic` - reuse it

### Backward Compatibility
- **Pro**: New format is more informative
- **Con**: Log parsers expecting old format may break
- **Decision**: Change is acceptable for user-facing benefit

## Implementation Notes

1. **Model name retrieval**: Use `config.GetModelByID(modelID).Name`
2. **Price retrieval**: Use `config.GetModelPricing(modelID)`
3. **Multiplier retrieval**: Use `config.GetBillingMultiplier(modelID)`
4. **Remaining balance**: Already available in `deductCreditsAtomic` after update
5. **Cache tokens**: Include in log when present (>0)

## Testing Strategy

1. **Unit tests**: Verify log format with different models
2. **Integration tests**: Check actual logs from request handlers
3. **Manual testing**: Verify logs are readable in production

## Rollout Plan

1. Deploy to dev environment
2. Monitor log volume and performance
3. Gather feedback from internal users
4. Deploy to production
5. Monitor user questions about pricing (expect decrease)
