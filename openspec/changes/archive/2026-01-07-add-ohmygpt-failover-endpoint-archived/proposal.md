# Proposal: Add OhMyGPT Failover Endpoint Support

## Summary

Add failover endpoint capability for OhMyGPT API keys. When a key configured with failover support encounters quota exhaustion (HTTP 402) or permanent blocking (HTTP 429 not related to rate limiting), the system will automatically switch that key to use a backup endpoint (`https://c-z0-api-01.hash070.com`) instead of rotating to a new key.

## Context

Currently, when an OhMyGPT API key encounters:
- HTTP 402 (Payment Required / Insufficient Credits)
- HTTP 429 (Rate Limit - temporary rate limit, NOT permanent ban)

The system marks the key as `rate_limited` or `exhausted` and rotates to a different key from the pool. This is the correct behavior for keys without failover support.

However, some keys have access to an alternative endpoint (`https://c-z0-api-01.hash070.com`) that may have separate quotas or limits. For these keys, instead of being marked exhausted/rotated, they should fail over to the backup endpoint.

## Key Behaviors

### Key Selection (Admin-Configured)
- Keys can be marked by admin as "failover-enabled" via the UI
- Only keys marked as failover-enabled will use the backup endpoint
- Non-failover keys continue existing behavior (rotate when exhausted)

### Failover Trigger Conditions
Failover occurs when:
- HTTP 402 (Payment Required - insufficient credits)
- HTTP 429 that is NOT temporary rate limiting (permanent block)

For temporary rate limits (standard 429), existing cooldown behavior applies.

### Failover Status Tracking
- New status: `using_failover`
- Track which endpoint the key is currently using (primary vs backup)
- Display in UI

### Endpoints Supported
- Primary: `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/messages`
- Primary: `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/chat/completions`
- Backup: `https://c-z0-api-01.hash070.com/v1/messages`
- Backup: `https://c-z0-api-01.hash070.com/chat/completions`

### Design Decision: Hardcoded Endpoints
Backup endpoints are hardcoded in the Go code (not configurable) to:
- Reduce complexity
- Avoid configuration errors
- Simplify deployment

## Related Changes

This proposal modifies:
- `ohmygpt` provider (Go backend)
- OhMyGPT keys UI (frontend)
- OhMyGPT keys API (backend)
- Database schema (add `enableFailover` field)

## Dependencies

- Existing OhMyGPT key infrastructure
- Existing auto-recovery system for rate-limited keys
- Existing backup key rotation system

## Success Criteria

1. Admin can mark keys as failover-enabled via UI
2. Failover-enabled keys switch to backup endpoint on quota/block errors
3. Status `using_failover` is tracked and displayed
4. Non-failover keys continue existing rotation behavior
5. Both `/v1/messages` and `/chat/completions` endpoints supported
