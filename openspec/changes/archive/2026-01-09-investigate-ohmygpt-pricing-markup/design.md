# Design: OhMyGPT Pricing Investigation

## Current Understanding

### Code Flow
The pricing calculation happens in `goproxy/config/config.go:341-401`:

```go
func CalculateBillingCostWithCacheAndBatch(...) float64 {
    // Get prices from config
    inputPrice, outputPrice := GetModelPricing(modelID)
    cacheWritePrice, cacheHitPrice := GetModelCachePricing(modelID)
    multiplier := GetBillingMultiplier(modelID)

    // For non-OpenHands providers, subtract cache from input
    actualInputTokens = inputTokens - cacheHitTokens - cacheWriteTokens

    // Calculate costs
    inputCost := (actualInputTokens / 1M) * inputPrice
    outputCost := (outputTokens / 1M) * outputPrice
    cacheWriteCost := (cacheWriteTokens / 1M) * cacheWritePrice
    cacheHitCost := (cacheHitTokens / 1M) * cacheHitPrice

    baseCost := inputCost + outputCost + cacheWriteCost + cacheHitCost
    return baseCost * multiplier
}
```

### The Discrepancy

**From MongoDB record (createdAt: 2026-01-08T12:21:51.178Z):**
- creditsCost: 0.0466540095
- Reverse calculation: 0.0466540095 / 1.05 = 0.04443569

**From current config:**
- billing_multiplier: 1.04
- Expected: 0.04443569 × 1.04 = 0.04621

**Difference:** 0.0466540095 - 0.04621 = 0.00044 (~0.95%)

### Potential Causes

#### 1. **Timing Issue (Most Likely)**
The request was made on `2026-01-08T12:21:51` when `billing_multiplier` was 1.05, but has since been changed to 1.04.

Evidence from git log:
- `9a4a82b`: "Update billing multipliers... from 1.045 and 1.05 to 1.04"
- `eca1ace`: "Refactor credit deduction logic..."
- `d0872ba`: "Update billing multiplier... from 1.045 to 1.05"

The multiplier has been changing recently.

#### 2. **OhMyGPT Markup (User's Observation)**
User states OhMyGPT base price is 0.040396, but our calculation gives 0.04443569.

**Analysis:**
- Ratio: 0.04443569 / 0.040396 = 1.10
- This is a **10% markup**

**Question:** Where does this 10% markup come from?

Possibilities:
- OhMyGPT may have different actual pricing than configured
- There may be fees/taxes applied by OhMyGPT
- The config prices may be outdated vs OhMyGPT's actual prices

## Recommendations

1. **Verify Request Timing**: Check if this specific request was made before the multiplier was changed to 1.04

2. **Verify OhMyGPT Pricing**: Contact OhMyGPT or check their API documentation to confirm current pricing

3. **Add Price Logging**: Enhance the existing pricing logs to show:
   - Raw upstream cost (if available)
   - Configured prices
   - Applied multiplier
   - Final cost

4. **Consider Price Verification**: Implement periodic price verification against upstream providers
