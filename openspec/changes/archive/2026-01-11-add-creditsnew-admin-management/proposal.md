# Proposal: Add Admin Endpoints for CreditsNew Management

## Summary
Add admin-only HTTP endpoints to manage the `creditsNew` field (OpenHands credits), providing the same set/add operations available for the existing `credits` field (OhMyGPT credits). This enables administrators to manually adjust OpenHands credit balances for user support, refunds, or promotional purposes.

## Motivation
Currently, administrators can manage `credits` (OhMyGPT) using:
- `PATCH /admin/users/:username/credits` - set absolute value
- `POST /admin/users/:username/credits/add` - increment value

However, there are no equivalent endpoints for `creditsNew` (OpenHands credits). With the dual credit system in place, administrators need the ability to manage both credit balances independently through the admin API.

## Problem Statement
Without dedicated admin endpoints for `creditsNew`:
- Administrators cannot manually adjust OpenHands credit balances for customer support scenarios
- Refunds or credit corrections for OpenHands usage require direct database manipulation
- There is inconsistent admin tooling between the two credit systems

## Proposed Solution
Add two new admin-only endpoints mirroring the existing `credits` endpoints:

1. **`PATCH /admin/users/:username/creditsNew`** - Set absolute `creditsNew` value
   - Request body: `{ creditsNew: number, resetExpiration?: boolean }`
   - Sets the user's `creditsNew` field to the specified value
   - Optionally resets `expiresAt` to 7 days from now

2. **`POST /admin/users/:username/creditsNew/add`** - Increment `creditsNew` value
   - Request body: `{ amount: number, resetExpiration?: boolean }`
   - Adds the specified amount to the user's `creditsNew` field
   - Optionally resets `expiresAt` to 7 days from now

Both endpoints should:
- Require admin authentication (`requireAdmin` middleware)
- Validate input parameters (non-negative numbers, positive amounts for add)
- Return updated user state with `username`, `creditsNew`, and `expiresAt`
- Follow the same implementation patterns as existing `credits` endpoints

## Alternatives Considered
1. **Single unified endpoint for both credit types** - Rejected because it would break existing API contracts and require frontend changes
2. **Database-only management** - Rejected because it lacks audit trails and requires direct DB access
3. **Reuse existing endpoints with type parameter** - Rejected for backward compatibility concerns

## Impact
- **Backend**: Add 2 new routes in `admin.routes.ts`, extend `userRepository` with `setCreditsNew()` and `addCreditsNew()` methods
- **Frontend**: Future admin UI can expose creditsNew management controls (out of scope for this change)
- **Database**: No schema changes required; `creditsNew` field already exists in `usersNew` collection
- **Security**: No impact; reuses existing admin authentication and authorization

## Risks
- **Minimal risk**: Follows established patterns for credit management
- **Expiration handling**: Ensure `resetExpiration` logic is consistent with existing `credits` endpoints
- **Documentation**: Admin API documentation should be updated (if exists)

## Success Criteria
- ✅ Admin can set absolute `creditsNew` value via `PATCH /admin/users/:username/creditsNew`
- ✅ Admin can increment `creditsNew` value via `POST /admin/users/:username/creditsNew/add`
- ✅ Validation errors return 400 status with clear error messages
- ✅ Unauthorized requests return 401/403 status
- ✅ Responses include updated user state (username, creditsNew, expiresAt)
- ✅ Expiration handling matches existing `credits` endpoint behavior

## Dependencies
- Requires `userRepository` extensions (new methods)
- No external service dependencies
- No database migration required

## Timeline Estimate
- Implementation: 1-2 hours
- Testing: 30 minutes
- Total effort: 2-3 hours
