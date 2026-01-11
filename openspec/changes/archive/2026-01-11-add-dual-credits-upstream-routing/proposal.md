# Change: Add Dual Credits System with Upstream-Specific Routing

## Why
The system currently uses a single `credits` field for all LLM proxy billing. We need to support multiple upstreams (OhMyGPT on port 8005 and OpenHands on port 8004) with separate credit balances. This enables independent billing tracking per upstream and allows users to allocate funds specifically for each service.

When users purchase credits via payment, the credits should be added to `creditsNew` (for OpenHands upstream) rather than the legacy `credits` field (used for OhMyGPT upstream).

## What Changes
- **ADDED**: New database fields `creditsNew` and `tokensUserNew` in `usersNew` collection
- **MODIFIED**: Payment service to add purchased credits to `creditsNew` instead of `credits`
- **MODIFIED**: GoProxy billing logic to deduct from `creditsNew` for OpenHands (port 8004) requests
- **MODIFIED**: GoProxy continues using `credits` for OhMyGPT (port 8005) requests
- Both credit fields maintain existing expiration (7 days) and promo bonus logic

## Impact
- **Affected specs**: `billing`
- **Affected code**:
  - Backend: `backend/src/models/user-new.model.ts` (schema)
  - Backend: `backend/src/services/payment.service.ts` (payment processing)
  - Backend: `backend/src/repositories/user-new.repository.ts` (if exists)
  - GoProxy: `goproxy/internal/userkey/model.go` (struct definition)
  - GoProxy: `goproxy/internal/userkey/validator.go` (credit validation)
  - GoProxy: `goproxy/main.go` (billing deduction logic)
- **Breaking changes**: None (backward compatible - existing `credits` field remains functional)
