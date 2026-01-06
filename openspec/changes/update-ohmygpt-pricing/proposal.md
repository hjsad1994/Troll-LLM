# Update OhMyGPT Pricing to Match Official Rates

## Summary

Update OhMyGPT pricing configuration and database defaults to match OhMyGPT's official published rates, and add support for batch pricing (50% discount for batch API requests).

## Motivation

The current pricing values in the system do not match OhMyGPT's official rates, leading to incorrect billing calculations. Additionally, the system does not support Anthropic's Batch API pricing, which offers 50% discount for batch requests.

**Current Issues:**
1. Cache pricing is outdated (6.25→6.88, 0.5→0.55)
2. Database default pricing is outdated (5→5.5, 25→27.5)
3. No support for batch pricing (50% discount)

**Impact:**
- Users may be undercharged or overcharged depending on cache usage
- Users using batch API are overcharged (paying full rate instead of 50% discount)
- System does not accurately reflect OhMyGPT's billing

## Proposed Solution

### Phase 1: Update Existing Pricing Values (Immediate)

1. Update `goproxy/config-ohmygpt-prod.json`:
   - `cache_write_price_per_mtok`: 6.25 → 6.88
   - `cache_hit_price_per_mtok`: 0.5 → 0.55

2. Update `backend/src/models/model-pricing.model.ts`:
   - `inputPricePerMTok`: 5 → 5.5
   - `outputPricePerMTok`: 25 → 27.5

3. Update all model entries (Opus, Sonnet, Haiku) consistently

### Phase 2: Add Batch Pricing Support (Enhancement)

1. Extend config model with optional batch pricing fields:
   - `batch_input_price_per_mtok` (default: 50% of input)
   - `batch_output_price_per_mtok` (default: 50% of output)

2. Detect batch mode from API response:
   - Check for batch-specific response headers or metadata
   - Flag request as batch when detected

3. Update cost calculation to use batch pricing when applicable

## Affected Components

- `goproxy/config-ohmygpt-prod.json` - Pricing configuration
- `goproxy/config/config.go` - Cost calculation logic
- `backend/src/models/model-pricing.model.ts` - Database defaults
- `goproxy/internal/ohmygpt/ohmygpt.go` - Batch detection

## Alternatives Considered

1. **Do nothing** - Continue with incorrect pricing
   - Rejected: Billing inaccuracy is unacceptable

2. **Only update values, skip batch support**
   - Rejected: Batch API users are being overcharged 2x

3. **Implement batch pricing as separate feature**
   - Rejected: This is part of correct OhMyGPT billing implementation

## Dependencies

- None (self-contained change)

## Risks

- **Risk:** Existing users may see price increase after cache pricing correction
  - **Mitigation:** The values were incorrect; this is a bug fix

- **Risk:** Batch detection may be unreliable
  - **Mitigation:** Implement conservative detection with manual override option

## Success Criteria

1. All pricing values match OhMyGPT official rates
2. Cache usage is billed at correct rates
3. Batch API requests receive 50% discount
4. No regression in non-batch request billing
5. Configuration is clear and maintainable
