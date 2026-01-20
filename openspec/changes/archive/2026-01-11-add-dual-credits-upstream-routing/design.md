# Design: Dual Credits System with Upstream Routing

## Context

The TrollLLM platform currently uses a single `credits` field in the `usersNew` collection to track user credit balances. All LLM requests (regardless of upstream provider) deduct from this single balance.

With the introduction of multiple distinct upstream services:
- **OhMyGPT** (port 8005) - existing upstream
- **OpenHands** (port 8004) - new upstream

We need to maintain separate credit balances to enable:
1. Independent billing per upstream service
2. User visibility into per-service spending
3. Flexible credit allocation (users can fund specific upstreams)
4. Accurate usage analytics per upstream

**Constraints:**
- Must maintain backward compatibility (existing `credits` field must continue working for OhMyGPT)
- Must preserve existing expiration logic (7-day credit validity)
- Must preserve promo bonus logic (e.g., 20% bonus during promo periods)
- Payment processing flow should remain minimal-change
- GoProxy billing must route to correct field based on upstream

## Goals / Non-Goals

**Goals:**
- Add `creditsNew` and `tokensUserNew` fields to `usersNew` collection
- Route payment credits 100% to `creditsNew` (OpenHands balance)
- Route OpenHands (port 8004) billing to deduct from `creditsNew`
- Route OhMyGPT (port 8005) billing to deduct from `credits`
- Maintain single `expiresAt` field (both balances expire together)
- Preserve promo bonus and expiration logic for both fields

**Non-Goals:**
- User-selectable credit allocation (future feature - user chooses which balance to top up)
- Split payment between both fields (100% goes to `creditsNew` only)
- Per-field expiration (both credit fields share same `expiresAt` timestamp)
- Referral system changes (referral logic remains unchanged)
- Dashboard UI updates to display both balances separately (can be added later)

## Decisions

### Decision 1: Add New Fields Instead of Renaming
**Chosen:** Add `creditsNew` and `tokensUserNew` as new fields alongside existing `credits` and `creditsUsed`.

**Rationale:**
- Zero breaking changes (existing code continues to work)
- No data migration required for existing users
- OhMyGPT billing continues unchanged
- Clear separation of concerns (each upstream has dedicated fields)

**Alternatives considered:**
- Rename `credits` to `creditsOhMyGPT` and create `creditsOpenHands`: Rejected due to breaking changes and required migration
- Use a nested object `{ ohmygpt: X, openhands: Y }`: Rejected due to complexity in GoProxy MongoDB queries

### Decision 2: Single Expiration for Both Balances
**Chosen:** Both `credits` and `creditsNew` share the same `expiresAt` timestamp.

**Rationale:**
- Simplifies expiration logic (no need to track two separate dates)
- User-friendly (single expiration date to remember)
- Payment service already sets `expiresAt` to 7 days from purchase

**Alternatives considered:**
- Separate `expiresAt` and `expiresAtNew` fields: Rejected due to complexity and user confusion

### Decision 3: Route Payment 100% to creditsNew
**Chosen:** All payment credits go to `creditsNew` field only.

**Rationale:**
- User request explicitly specified this behavior
- Aligns with business goal to prioritize OpenHands upstream
- Users can top up OhMyGPT credits separately (future feature)

**Alternatives considered:**
- 50/50 split between `credits` and `creditsNew`: Rejected per user requirements
- User-selectable allocation during payment: Rejected as out-of-scope for this change

### Decision 4: Upstream Detection via Port Number
**Chosen:** GoProxy determines upstream by checking the target port (8004 = OpenHands, 8005 = OhMyGPT).

**Rationale:**
- Ports are already used for upstream routing
- Simple and reliable detection mechanism
- No need for additional configuration or request metadata

**Alternatives considered:**
- Upstream name in request header: Rejected due to added complexity and client changes required
- Database lookup for upstream mapping: Rejected as overkill for two upstreams

## Implementation Strategy

### Phase 1: Database Schema (Backend)
1. Add `creditsNew: Number (default 0)` to `IUserNew` interface
2. Add `tokensUserNew: Number (default 0)` to `IUserNew` interface
3. Update mongoose schema in `user-new.model.ts`

### Phase 2: Payment Service (Backend)
1. Modify `addCredits()` in `payment.service.ts`:
   - Change `$inc: { credits }` to `$inc: { creditsNew }`
   - Keep `expiresAt` logic unchanged
   - Update logging to reflect `creditsNew` changes

### Phase 3: GoProxy Model (Go)
1. Add `CreditsNew float64` to `LegacyUser` struct in `model.go`
2. Add `TokensUserNew float64` to `LegacyUser` struct
3. Update `UserCredits` struct to include `CreditsNew`

### Phase 4: GoProxy Validator (Go)
1. Add `GetUserCreditsNew(username) (float64, error)` function
2. Update `CheckUserCredits()` to accept upstream parameter (optional)
3. Update `CanAffordRequest()` to check appropriate balance based on upstream

### Phase 5: GoProxy Billing Routing (Go)
1. Detect upstream in request handler:
   ```go
   isOpenHands := strings.Contains(upstreamURL, ":8004")
   ```
2. Route billing update:
   ```go
   if isOpenHands {
       // Deduct from creditsNew, increment tokensUserNew
       update := bson.M{"$inc": bson.M{"creditsNew": -cost, "tokensUserNew": tokens}}
   } else {
       // Deduct from credits, increment creditsUsed
       update := bson.M{"$inc": bson.M{"credits": -cost, "creditsUsed": tokens}}
   }
   ```

## Data Model Changes

### Before (usersNew collection)
```typescript
{
  _id: "username",
  credits: 50.00,        // Used for all upstreams
  creditsUsed: 25.00,    // Total tokens used (all upstreams)
  expiresAt: "2026-01-18T00:00:00Z"
}
```

### After (usersNew collection)
```typescript
{
  _id: "username",
  credits: 50.00,        // OhMyGPT balance (port 8005)
  creditsUsed: 25.00,    // OhMyGPT tokens used
  creditsNew: 100.00,    // OpenHands balance (port 8004) ← NEW
  tokensUserNew: 0.00,   // OpenHands tokens used ← NEW
  expiresAt: "2026-01-18T00:00:00Z"  // Shared expiration
}
```

## Risks / Trade-offs

### Risk: Field Naming Confusion
**Mitigation:**
- Add inline comments in code explaining field purpose
- Update API documentation with field mappings (credits = OhMyGPT, creditsNew = OpenHands)

### Risk: Dashboard UI Shows Only `credits`
**Mitigation:**
- Current dashboard continues to show `credits` for OhMyGPT users
- Future enhancement: Add separate balance display for `creditsNew`

### Risk: Expiration Applies to Both Balances
**Limitation:**
- If user has $10 in `credits` and $50 in `creditsNew`, both expire together
- Accepted as trade-off for simplicity (user request confirmed this is acceptable)

## Migration Plan

**No migration required.** This is a backward-compatible additive change.

**Existing users:**
- `creditsNew` and `tokensUserNew` default to 0 (schema defaults)
- Existing `credits` balance remains functional for OhMyGPT
- Next payment will add credits to `creditsNew` field

**Rollback procedure:**
- Revert payment service to add credits to `credits` field
- Revert GoProxy billing to use `credits` for all upstreams
- No data loss (both fields remain in database)

## Testing Strategy

1. **Unit Tests:**
   - Payment service: Verify credits added to `creditsNew`
   - GoProxy validator: Test upstream-specific credit checks

2. **Integration Tests:**
   - Payment flow: Complete payment → verify `creditsNew` incremented
   - OpenHands billing: Make request → verify `creditsNew` decremented, `tokensUserNew` incremented
   - OhMyGPT billing: Make request → verify `credits` decremented, `creditsUsed` incremented

3. **Manual Testing:**
   - Create user, purchase credits, verify database state
   - Make OpenHands request, verify correct field updated
   - Make OhMyGPT request, verify correct field updated
   - Test expiration: verify both balances expire together

## Open Questions

- **Q:** Should dashboard UI be updated to show both balances?
  - **A:** Out of scope for this change. Can be added later as UX enhancement.

- **Q:** What happens if user has insufficient `creditsNew` but sufficient `credits`?
  - **A:** Request is rejected. No cross-balance borrowing (each upstream uses its dedicated balance).

- **Q:** Should referral credits (refCredits) also be split per upstream?
  - **A:** Out of scope. Referral system remains unchanged for this change.
