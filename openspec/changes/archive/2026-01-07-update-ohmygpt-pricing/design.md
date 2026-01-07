# Design: Update OhMyGPT Pricing

## Architecture Context

The TrollLLM proxy uses a **configuration-driven pricing model** where:
1. Config files define per-model pricing (input, output, cache)
2. Go code calculates costs based on token usage
3. Database stores default pricing for new models
4. Costs are calculated per-request and deducted from user credits

## Current Pricing Calculation

```go
// goproxy/config/config.go:310-338
func CalculateBillingCostWithCache(modelID, input, output, cacheWrite, cacheHit) float64 {
    inputPrice, outputPrice := GetModelPricing(modelID)
    cacheWritePrice, cacheHitPrice := GetModelCachePricing(modelID)
    multiplier := GetBillingMultiplier(modelID)

    inputCost := (input / 1_000_000) * inputPrice
    outputCost := (output / 1_000_000) * outputPrice
    cacheWriteCost := (cacheWrite / 1_000_000) * cacheWritePrice
    cacheHitCost := (cacheHit / 1_000_000) * cacheHitPrice

    return (inputCost + outputCost + cacheWriteCost + cacheHitCost) * multiplier
}
```

## Design Decisions

### 1. Batch Pricing Detection Strategy

**Problem:** How to detect if a request uses Anthropic's Batch API?

**Options:**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| A. Check request header `anthropic-beta` | Direct API detection | May not be passed through proxy | Fallback |
| B. Check response metadata | Reliable | OhMyGPT may not expose this | Primary |
| C. Explicit config flag | Simple | Manual configuration | Last resort |

**Decision:** Implement **Option B** as primary with **Option A** as fallback.

**Implementation:**
```go
// Check for batch mode in response
func isBatchRequest(usage map[string]interface{}) bool {
    // OhMyGPT may include batch metadata in usage
    if _, ok := usage["batch_size"]; ok {
        return true
    }
    // Check response headers
    if headers != nil {
        if headers.Get("anthropic-beta") == "prompt-caching-2024-01-05" {
            return true // This is actually cache, not batch
        }
    }
    return false
}
```

### 2. Batch Pricing Configuration Schema

**Decision:** Add optional batch pricing fields with fallback to 50% of regular pricing.

```json
{
  "models": [
    {
      "name": "Claude Opus 4.5",
      "id": "claude-opus-4-5-20251101",
      "input_price_per_mtok": 5.5,
      "output_price_per_mtok": 27.5,
      "batch_input_price_per_mtok": 2.75,   // NEW: Optional
      "batch_output_price_per_mtok": 13.75  // NEW: Optional
    }
  ]
}
```

**Fallback Logic:**
```go
func GetBatchPricing(modelID string) (input, output float64) {
    model := GetModelByID(modelID)
    if model == nil {
        return 0, 0
    }

    // If explicitly configured, use configured values
    if model.BatchInputPricePerMTok > 0 {
        return model.BatchInputPricePerMTok, model.BatchOutputPricePerMTok
    }

    // Default to 50% of regular pricing
    regularIn, regularOut := GetModelPricing(modelID)
    return regularIn * 0.5, regularOut * 0.5
}
```

### 3. Extended Cost Calculation

**Modified signature:**
```go
func CalculateBillingCostWithCache(
    modelID string,
    inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens int64,
    isBatch bool, // NEW: Flag for batch mode
) float64 {
    var inputPrice, outputPrice float64
    if isBatch {
        inputPrice, outputPrice = GetBatchPricing(modelID)
    } else {
        inputPrice, outputPrice = GetModelPricing(modelID)
    }

    // ... rest of calculation unchanged
}
```

## Sequence Diagram

```
User Request → Proxy → OhMyGPT
                      ↓
                   Response (with usage)
                      ↓
                Extract token counts
                      ↓
                Detect batch mode?
                ├─ Yes → Use batch pricing
                └─ No  → Use regular pricing
                      ↓
                Calculate cost
                      ↓
                Deduct from user credits
```

## Database Schema Changes

No migration needed. The `model_pricing` collection only stores defaults for initialization:
- Update `DEFAULT_MODEL_PRICING` array in code
- Values propagate on new model creation or manual reset

## Testing Strategy

1. **Unit Tests:** Cost calculation with/without batch mode
2. **Integration Tests:** Mock OhMyGPT responses with batch metadata
3. **Manual Verification:** Compare costs with OhMyGPT dashboard

## Rollback Plan

If issues arise:
1. Revert config file changes
2. Revert code changes
3. Database self-heals on next sync

No data loss risk as pricing is configuration-only.
