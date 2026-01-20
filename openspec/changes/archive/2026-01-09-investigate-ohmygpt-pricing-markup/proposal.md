# Investigate OhMyGPT Pricing Markup

## Summary
Investigate a pricing discrepancy where OhMyGPT base price (0.040396) differs from calculated price before billing_multiplier (0.04443569), indicating an unexpected ~10% markup.

## Background
From the MongoDB request log:
```json
{
  "model": "claude-sonnet-4-5-20250929",
  "inputTokens": 1,
  "outputTokens": 1048,
  "cacheWriteTokens": 1558,
  "cacheHitTokens": 62745,
  "creditsCost": 0.0466540095
}
```

### Expected Calculation (from config-ohmygpt-prod.json)
- Input: 1 × 3.30 / 1M = 0.0000033
- Output: 1,048 × 16.50 / 1M = 0.017292
- Cache Write: 1,558 × 4.13 / 1M = 0.00643454
- Cache Hit: 62,745 × 0.33 / 1M = 0.02070585
- **Subtotal**: 0.04443569
- With multiplier 1.04: **0.04621**
- With multiplier 1.05: **0.04666** ✓ (matches actual)

### Issue
The actual creditsCost (0.0466540095) corresponds to a **billing_multiplier of 1.05**, but the config shows **1.04**.

Additionally, the user reports:
- OhMyGPT base price: **0.040396**
- Our calculated price before multiplier: **0.04443569**
- Ratio: 0.04443569 / 0.040396 = **1.1** (10% markup)

## Root Cause Found
**No hidden markup logic exists in code**. The calculation in `config/config.go:401` is:
```go
baseCost := inputCost + outputCost + cacheWriteCost + cacheHitCost
return baseCost * multiplier
```

The 10% difference is because **config prices are ~10% higher than OhMyGPT's actual prices**:
- Config: input=3.30, output=16.50, cache_write=4.13, cache_hit=0.33
- If OhMyGPT actual: input≈3.00, output≈15.00, cache_write≈3.75, cache_hit≈0.30

## Proposed Changes
1. **Update OhMyGPT config prices** to match OhMyGPT's actual pricing
2. Keep `billing_multiplier: 1.04` as the ONLY markup (no hidden markup)
3. Add price verification/testing to prevent future discrepancies

## Status
**INVESTIGATION** - This proposal documents findings rather than proposing changes.
