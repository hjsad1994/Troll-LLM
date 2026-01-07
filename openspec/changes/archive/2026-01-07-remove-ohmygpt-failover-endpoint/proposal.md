# Proposal: Remove OhMyGPT Failover Endpoint Support

## Summary

Remove the OhMyGPT failover endpoint feature because API keys are now automatically deleted when they fail (401 invalid, 402 quota exhausted, 403 banned). The failover mechanism is no longer needed since keys are immediately replaced from the backup pool rather than being preserved for endpoint switching.

## Context

The failover endpoint feature (`add-ohmygpt-failover-endpoint`) was designed to allow OhMyGPT keys to switch to a backup endpoint (`https://c-z0-api-01.hash070.com`) when encountering quota exhaustion or permanent blocking errors.

However, the system behavior has changed:
- When a key fails with 401/402/403, it is now automatically deleted from the pool
- A new key is immediately activated from the backup pool
- There is no benefit to preserving a failed key and switching its endpoint
- The failover logic adds unnecessary complexity

## Rationale

### Why Remove?

1. **Simplified Key Lifecycle**: Keys are now auto-deleted on failure, making endpoint switching irrelevant
2. **Reduced Complexity**: Removing failover logic simplifies error handling and key management
3. **Cleaner Code**: Eliminates conditional logic based on `enableFailover` flag
4. **No Behavioral Regression**: Existing rotation behavior already handles failures correctly

### What Gets Removed?

**Go (goproxy):**
- `OhMyGPTFailoverBaseURL`, `OhMyGPTFailoverMessagesEndpoint`, `OhMyGPTFailoverCompletionsEndpoint` constants
- `OhMyGPTStatusUsingFailover` status constant
- `EnableFailover` field from `OhMyGPTKey` struct
- `MarkUsingFailover()` method
- Failover conditional logic in `CheckAndRotateOnError()`
- Endpoint selection logic in `forwardToEndpoint()`
- `using_failover` stats counting
- `EnableFailover` field from `OhMyGPTBackupKey` struct

**Backend (Node.js):**
- `enableFailover` field from API interfaces
- `updateKeyFailover()` function
- `updateBackupKeyFailover()` function
- `enableFailover` from `createKey()` and `createBackupKey()`
- `enableFailover` preservation in `resetKeyStats()`
- `failoverEnabledKeys` and `failoverEnabledCount` from stats
- PATCH endpoints for updating failover setting
- Failover-related zod schemas

**Frontend (Next.js):**
- Failover column in keys and backup keys tables
- Failover toggle switches
- `enableFailover` checkbox in modals
- `toggleFailover()` functions
- Failover-related translations
- Failover stat cards
- `enableFailover` field from TypeScript interfaces

**OpenSpec:**
- Archive `add-ohmygpt-failover-endpoint` change folder

### What Stays?

- Core key rotation functionality (`RotateKey()`)
- Backup key pool system
- Auto-recovery for rate-limited keys
- Existing key management UI (without failover controls)

## Related Changes

This proposal modifies:
- `ohmygpt` provider (Go backend) - removes failover logic
- OhMyGPT keys UI (frontend) - removes failover controls
- OhMyGPT keys API (backend) - removes failover endpoints
- Database schema - `enableFailover` field will remain in MongoDB but ignored (no migration needed)

## Dependencies

- Existing OhMyGPT key infrastructure
- Existing backup key rotation system

## Success Criteria

1. Failover constants and methods removed from Go code
2. Failover API endpoints removed from backend
3. Failover UI controls removed from frontend
4. Keys continue to rotate normally when they fail
5. No regression in core key management functionality
6. Old change proposal is archived
