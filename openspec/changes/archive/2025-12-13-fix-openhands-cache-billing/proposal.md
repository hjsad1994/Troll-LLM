# Change: Fix OpenHands Cache Billing Calculation

## Why
OpenHands API returns `input_tokens` that are **already reduced by cache** (similar to how MainTarget returns it). Currently, the billing logic treats OpenHands input tokens the same as MainTarget, which **adds back** `cacheWrite + cacheHit` to calculate the full input. This is incorrect for OpenHands because:

1. **MainTarget**: Returns input WITHOUT cache deduction → billing logic adds cache back ✓ correct
2. **OpenHands**: Returns input ALREADY WITH cache deducted → billing logic adds cache back ✗ **WRONG - double counts cache**

This causes OpenHands billing to overcharge users by adding cache tokens that were already deducted from the input.

## What Changes
- Update `handleOpenHandsMessagesRequest` and `handleOpenHandsOpenAIRequest` to use the correct cache billing logic
- Change from `config.CalculateBillingTokensWithCache(modelID, input, output, cacheWrite, cacheHit)` which adds cache back
- To direct calculation: `input + cacheWrite + output + config.EffectiveCacheHit(cacheHit)` since input is already net of cache
- Update logging to reflect the correct billing approach for OpenHands

## Impact
- Affected specs: `api-proxy`
- Affected code:
  - `goproxy/main.go` lines ~1497-1535 (handleOpenHandsMessagesRequest)
  - `goproxy/main.go` lines ~1653-1690 (handleOpenHandsOpenAIRequest)
- Impact: **Reduces billing** for OpenHands requests to accurate amounts (users will pay less, correctly)
- No breaking changes - only fixes incorrect billing calculation
