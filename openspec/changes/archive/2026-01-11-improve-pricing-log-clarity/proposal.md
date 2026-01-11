# improve-pricing-log-clarity Proposal

## Summary
Improve the clarity of pricing deduction logs to help users understand how they are being charged for API requests. The current log message `Deducted $0.323620 (in=14, out=218)` is confusing and doesn't explain the pricing breakdown, leading to user questions about whether discounts are being applied.

## Problem
Users are confused by the deduction log message format:
- **Current format**: `💰 [peter2000] Deducted $0.323620 (in=14, out=218)`
- **User questions**: "log nay la sao ? giam gia cho user hay sao" (What is this log? Is there a discount for users?)
- **Missing information**:
  - Model name/pricing tier
  - Price per million tokens (input/output)
  - Billing multiplier applied
  - Base cost vs. final cost
  - Any discounts or bonuses

## Motivation
- **User transparency**: Users deserve to understand how they are being charged
- **Support burden**: Confusing logs lead to repeated user questions
- **Trust building**: Clear pricing breakdown builds user trust
- **Debugging**: Detailed logs help identify pricing issues

## Proposed Solution
Enhance the deduction log messages to include:
1. **Model name** - Which model was used
2. **Price breakdown** - Input/output prices per million tokens
3. **Billing multiplier** - Any markup applied (e.g., 1.05x)
4. **Cost calculation** - Show how the final cost was derived
5. **Remaining balance** - User's remaining credits after deduction

### Log Format Options

**Option A: Detailed single-line log**
```
💰 [peter2000] Deducted $0.323620 for Claude Sonnet 4.5 (in=14 @ $3.30/MTok, out=218 @ $16.50/MTok, multiplier=1.05x) remaining=$50.00
```

**Option B: Multi-line detailed log**
```
💰 [peter2000] Deducted $0.323620 for Claude Sonnet 4.5
   ├─ Input: 14 tokens @ $3.30/MTok = $0.000046
   ├─ Output: 218 tokens @ $16.50/MTok = $0.003597
   ├─ Subtotal: $0.003643
   ├─ Multiplier: 1.05x (OhMyGPT)
   └─ Remaining: $50.00
```

**Option C: Compact with tooltip-friendly format**
```
💰 [peter2000] Deducted $0.323620 (model=claude-sonnet-4-5, in=14@3.30, out=218@16.50, mult=1.05, rem=50.00)
```

### Recommendation
**Option A** provides the best balance of readability and information density. It's clear, concise, and shows all relevant pricing details in a single line.

## Scope

### In Scope
- Modify deduction log messages in `goproxy/internal/usage/tracker.go`
- Add model name lookup
- Include pricing details from model configuration
- Show billing multiplier
- Display remaining balance after deduction

### Out of Scope
- Frontend pricing UI changes (separate feature)
- User-facing invoice/receipt generation
- Pricing API changes
- Database schema changes

## Risks
- **Log verbosity**: More detailed logs may increase log volume
- **Performance**: Model/price lookup may add minimal overhead (negligible)
- **Backward compatibility**: Log parsing tools may need updates

## Alternatives Considered
1. **Keep current format**: Rejected - users are confused
2. **Frontend-only solution**: Rejected - logs are primary source of truth
3. **Separate pricing page**: Rejected - doesn't solve immediate confusion

## Open Questions
1. Should detailed logs be enabled by default or behind a feature flag?
2. Should we translate prices to VND for Vietnamese users?
3. Should cache token pricing be included in the log when present?

## Success Criteria
- Users can understand their charges from the log message alone
- Support questions about pricing deductions decrease
- Logs still parseable by monitoring tools
