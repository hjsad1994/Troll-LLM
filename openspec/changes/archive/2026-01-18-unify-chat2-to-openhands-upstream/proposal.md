# Proposal: Unify chat2.trollllm.xyz to OpenHands Upstream with Credits Field

**Change ID:** `unify-chat2-to-openhands-upstream`
**Status:** Draft
**Created:** 2026-01-12

## Overview

Migrate chat2.trollllm.xyz from OhMyGPT upstream to OpenHands upstream while maintaining billing to the `credits` field instead of `creditsNew`. This allows both chat endpoints to use the same upstream provider while keeping separate credit tracking.

## Context

Currently:
- `chat.trollllm.xyz` (goproxy-openhands, port 8004) → OpenHands upstream → deducts from `creditsNew`
- `chat2.trollllm.xyz` (goproxy-ohmygpt, port 8005) → OhMyGPT upstream → deducts from `credits`

The dual-upstream setup was designed to provide redundancy and separate billing pools. However, operational requirements now call for consolidating to a single upstream (OpenHands) while maintaining separate credit field tracking for business logic reasons.

## Motivation

1. **Single Upstream Simplification**: Reduce complexity by using only OpenHands upstream for both endpoints
2. **Maintain Separate Credit Pools**: Keep `creditsNew` for chat.trollllm and `credits` for chat2.trollllm to support different billing/usage scenarios
3. **Operational Flexibility**: Allow users to access the same upstream through different credit pools based on their needs

## Goals

1. Configure chat2.trollllm.xyz to use OpenHands upstream (same as chat.trollllm.xyz)
2. Ensure chat2 requests deduct from `credits` field (NOT `creditsNew`)
3. Preserve existing chat.trollllm.xyz behavior (OpenHands → `creditsNew`)
4. Add clear comments to code indicating which domain uses which credit field
5. Update configuration files to reflect the unified upstream with per-domain billing rules

## Non-Goals

- Changing the nginx domain routing (chat vs chat2)
- Modifying the Docker container structure (still need 2 separate goproxy containers)
- Migrating existing user credit balances between fields
- Changing frontend or backend services

## Success Criteria

- ✅ chat2.trollllm.xyz routes requests to OpenHands upstream
- ✅ chat2.trollllm.xyz deducts costs from user's `credits` field
- ✅ chat.trollllm.xyz continues to deduct from `creditsNew` (unchanged)
- ✅ Both endpoints share the same OpenHands upstream API keys and configuration
- ✅ Code includes comments explaining the domain → credit field mapping
- ✅ Configuration validation passes at startup
- ✅ Request logs correctly identify which credit field was used

## Dependencies

None - this is a configuration and routing logic change within the existing dual-container structure.

## Affected Components

1. **goproxy-ohmygpt container** (chat2.trollllm.xyz)
   - Config file: Switch from OhMyGPT to OpenHands endpoints
   - Model configs: Update `billing_upstream` or add custom credit field routing
   - Billing logic: Route to `DeductCreditsOhMyGPT()` (which uses `credits` field)

2. **Configuration Files**
   - `config-ohmygpt-prod.json`: Change endpoints to OpenHands while maintaining port 8005
   - Comments in both config files to document domain → credit field mapping

3. **Go Proxy Billing Code**
   - `internal/usage/tracker.go`: Ensure `DeductCreditsOhMyGPT()` remains compatible
   - Add comments documenting that chat2 uses OpenHands upstream but deducts from `credits`

4. **Documentation**
   - Nginx config comments clarifying upstream routing
   - Docker compose comments for goproxy-ohmygpt service

## Related Specs

- `billing` (modified) - Clarify that upstream and credit field selection are independent
- `dual-upstream-deployment` (context) - Background on the original dual-upstream architecture

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| OpenHands upstream rate limits affect both domains | Monitor OpenHands usage carefully; consider implementing per-domain rate limiting if needed |
| Confusion about which credit field is used | Add clear logging and comments in code; update documentation |
| Accidental billing to wrong credit field | Add validation tests; review logs during deployment to verify correct field deduction |
| OhMyGPT upstream becomes unavailable for fallback | Accept this trade-off; focus on OpenHands reliability instead |
| Configuration mistakes during deployment | Validate configs with test requests before production deployment; maintain rollback plan |

## Implementation Notes

**Key Principle**: The billing system has two independent dimensions:
1. **Upstream Provider** (where requests are sent): OpenHands, OhMyGPT, etc.
2. **Credit Field** (where costs are deducted): `credits` vs `creditsNew`

This change decouples these dimensions for chat2:
- **Before**: OhMyGPT upstream → `credits` field
- **After**: OpenHands upstream → `credits` field (upstream changes, field stays the same)

The Go proxy will need to:
1. Route chat2 requests to OpenHands upstream (via config change)
2. Continue calling `DeductCreditsOhMyGPT()` which deducts from `credits` field
3. Use the same billing_upstream="ohmygpt" designation (which means "use credits field") even though upstream provider is OpenHands

**Comment Strategy**:
- Config files: Document which domain uses which credit field
- Tracker.go: Clarify that function names reflect credit field, not upstream provider
- Nginx.conf: Add comments explaining the domain → container → upstream mapping
