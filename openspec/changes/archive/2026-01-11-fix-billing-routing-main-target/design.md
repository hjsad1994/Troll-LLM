# Design: Billing Upstream Routing

## Context

The GoProxy service routes requests to multiple upstream providers (OpenHands, OhMyGPT, Troll keys). The billing system maintains separate credit balances:
- `credits` - for OhMyGPT upstream (port 8005)
- `creditsNew` - for OpenHands upstream (port 8004)

Currently, the `upstream` field in config.json only controls which server to route to (troll, main, openhands), but doesn't specify which billing credit field to use. The main target server (`"upstream": "main"`) can route to either OpenHands or OhMyGPT, but the proxy has no way to know which one.

This causes all main target requests to incorrectly deduct from `credits` instead of routing based on the actual backend provider.

## Goals / Non-Goals

**Goals:**
- Fix billing routing for main target upstream requests
- Maintain backward compatibility with existing configurations
- Clear separation between routing upstream and billing upstream
- Explicit configuration to prevent ambiguity

**Non-Goals:**
- Auto-detection of billing upstream from response headers
- Dynamic billing upstream switching based on runtime conditions
- Changes to the dual credits system architecture
- Modifications to existing deduction functions

## Decisions

### Decision 1: Add `billing_upstream` Configuration Field

**Rationale:**
- Explicit is better than implicit - configuration should be clear about billing intent
- Separates concerns: `upstream` controls routing, `billing_upstream` controls billing
- Easy to audit and verify correct billing configuration
- Allows flexibility for future multi-backend scenarios

**Alternatives considered:**
1. **Infer from `upstream` field** - Rejected because `upstream: "main"` is ambiguous (could be OpenHands or OhMyGPT)
2. **Parse response headers from main target** - Rejected because it requires runtime detection, adds complexity, and is fragile
3. **Create separate model entries for each billing upstream** - Rejected because it duplicates configuration and confuses users with duplicate model IDs

### Decision 2: Default to "ohmygpt" for Backward Compatibility

**Rationale:**
- Existing behavior deducts from `credits` field (OhMyGPT behavior)
- Models without `billing_upstream` should continue working without breaking changes
- Safer default: OhMyGPT is the legacy system with more usage

**Trade-off:**
- May perpetuate incorrect billing for legacy configurations, but prevents breaking existing deployments

### Decision 3: Update Handler Functions, Not Deduction Functions

**Rationale:**
- Deduction functions (`DeductCreditsOpenHands`, `DeductCreditsOhMyGPT`) already work correctly
- Problem is in the handler layer choosing the wrong deduction function
- Minimal changes to critical billing code reduces risk

**Implementation:**
```go
// In handleMainTargetRequest():
billingUpstream := config.GetModelBillingUpstream(modelID)
if billingUpstream == "openhands" {
    usage.DeductCreditsOpenHands(username, billingCost, billingTokens, input, output)
} else {
    usage.DeductCreditsOhMyGPT(username, billingCost, billingTokens, input, output)
}
```

### Decision 4: Valid Values Are Enum-Like Strings

**Rationale:**
- Use `"openhands"` and `"ohmygpt"` (lowercase, matching upstream naming conventions)
- Validation function ensures only valid values are accepted
- Clear error messages if invalid value is configured

**Validation:**
```go
func IsValidBillingUpstream(billingUpstream string) bool {
    return billingUpstream == "openhands" || billingUpstream == "ohmygpt"
}
```

## Risks / Trade-offs

### Risk 1: Configuration Drift
**Risk:** `billing_upstream` and actual main target routing may become misaligned if main target config changes.

**Mitigation:**
- Document the relationship clearly in config.json comments
- Consider adding config validation on startup to warn about potential mismatches
- Regular audits of billing vs routing configuration

### Risk 2: Existing Users with Misconfigured Billing
**Risk:** Users who were incorrectly billed in the past won't be automatically refunded.

**Mitigation:**
- This fix corrects future billing only
- Manual audit and refund process may be needed for historical incorrect charges
- Document the fix in release notes

### Risk 3: Default Behavior May Mask Errors
**Risk:** Defaulting to "ohmygpt" might hide missing configuration and perpetuate incorrect billing.

**Mitigation:**
- Add startup warning logs if `billing_upstream` is not explicitly configured for main target models
- Update deployment documentation to require explicit billing_upstream

## Migration Plan

### Phase 1: Add Configuration Support (This PR)
1. Add `BillingUpstream` field to Model struct
2. Add getter and validation functions
3. Update config.json for all 5 models
4. Update handler functions to use billing_upstream
5. Deploy to production

### Phase 2: Monitor and Verify (Post-Deployment)
1. Monitor logs for billing upstream selection
2. Verify creditsNew deductions for OpenHands models
3. Verify credits deductions for OhMyGPT models
4. Check for any unexpected behavior

### Phase 3: Audit Historical Billing (Optional)
1. Query database for main target requests before fix
2. Identify users who were incorrectly billed
3. Calculate refunds if needed
4. Apply credits to affected accounts

### Rollback Plan
If issues are detected:
1. Revert config.json changes to remove `billing_upstream` field
2. Revert main.go handler changes
3. System falls back to default DeductCreditsWithTokens behavior
4. No data corruption risk - only affects credit deductions going forward

## Open Questions

1. **Should we add metrics/alerts for billing upstream mismatches?**
   - Could add Prometheus metrics to track deductions by upstream
   - Alert if unexpected patterns detected

2. **Should we backfill historical incorrect billing?**
   - Depends on business decision and impact analysis
   - May be significant effort to audit and refund

3. **Should we validate billing_upstream matches expected main target routing?**
   - Could add runtime checks, but requires knowing main target's routing logic
   - May be too fragile and coupled to main target implementation
