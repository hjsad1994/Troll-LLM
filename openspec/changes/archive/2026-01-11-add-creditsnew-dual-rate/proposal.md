# Change: Add creditsNew Field for Dual-Rate Credit System

## Why

The platform currently uses a single credit field with a rate of 2500 VND = $1 USD. To support a new lower rate (1500 VND = $1 USD) while maintaining existing credit balances at the old rate, we need to introduce a dual-credit system where:

- **Legacy credits** (`credits` field) → Used by `chat.trollllm.xyz` (port 8005/ohmygpt) at 2500 VND/$1 rate
- **New credits** (`creditsNew` field) → Used by `chat2.trollllm.xyz` (port 8004/Openhands) at 1500 VND/$1 rate

This allows users to maintain their existing credit balances purchased at the old rate while all new purchases use the more favorable new rate. Different endpoints will consume from different credit pools, giving users flexibility in which credit balance they use.

## What Changes

### Backend Changes
- **BREAKING**: Add `creditsNew` field to UserNew model (MongoDB schema)
- **BREAKING**: Add `creditsNewUsed` field to UserNew model for tracking
- **MODIFIED**: Update payment service to add credits to `creditsNew` instead of `credits` for new purchases
- **MODIFIED**: Update promo bonus and referral bonus logic to credit `creditsNew` instead of `credits`
- **NEW**: Add `VND_RATE_NEW` constant = 1500 in payment model
- **MODIFIED**: Update payment checkout to use `VND_RATE_NEW` (1500) for amount calculation
- **NEW**: Add separate payment configuration endpoint for new rate
- **MODIFIED**: Update user profile API to return both `credits` and `creditsNew` fields

### Go Proxy Changes
- **NEW**: Create separate credit deduction logic for port 8004 (Openhands) to use `creditsNew` field
- **MODIFIED**: Ensure port 8005 (ohmygpt) continues using `credits` field
- **MODIFIED**: Update user validation to check appropriate credit field based on endpoint
- **MODIFIED**: Update usage tracker to deduct from correct field based on service

### Frontend Changes
- **MODIFIED**: Update checkout page to display new rate (1600 VND per $1)
- **MODIFIED**: Update dashboard to display both credit balances separately
- **MODIFIED**: Update credits status widget to show both balances
- **NEW**: Add UI labels to distinguish between "Legacy Credits" and "Credits"

## Impact

### Affected Specs
- `billing` (MODIFIED) - dual credit fields and rates
- `payment` (MODIFIED) - new rate for creditsNew purchases

### Affected Code Files

**Backend:**
- `backend/src/models/user-new.model.ts` - Add creditsNew and creditsNewUsed fields
- `backend/src/models/payment.model.ts` - Add VND_RATE_NEW constant
- `backend/src/services/payment.service.ts` - Update addCredits to use creditsNew
- `backend/src/repositories/user-new.repository.ts` - Add methods for creditsNew operations
- `backend/src/routes/user.routes.ts` - Update profile endpoint
- `backend/src/routes/payment.routes.ts` - Update payment config for new rate

**Go Proxy:**
- `goproxy/internal/userkey/model.go` - Add CreditsNew field
- `goproxy/internal/userkey/validator.go` - Add logic to check creditsNew for port 8004
- `goproxy/internal/usage/tracker.go` - Update credit deduction logic based on endpoint
- `goproxy/main.go` - Ensure correct routing for port 8004 vs 8005

**Frontend:**
- `frontend/src/app/checkout/page.tsx` - Update VND_RATE to 1500
- `frontend/src/app/(dashboard)/dashboard/page.tsx` - Display both credit fields
- `frontend/src/components/CreditsStatusWidget.tsx` - Show dual balances
- `frontend/src/components/Header.tsx` - Update credit display

## Migration Notes

- **No data migration required** - existing `credits` field remains untouched
- `creditsNew` defaults to 0 for all existing users
- All new payments starting from deployment will add to `creditsNew` at 1500 VND/$1 rate
- Users can use `chat.trollllm.xyz` (port 8005) to consume legacy credits
- Users can use `chat2.trollllm.xyz` (port 8004) to consume new credits
- Promo bonuses and referral bonuses will be added to `creditsNew` going forward
- Admin dashboard should show both credit fields for monitoring

## Rollout Strategy

1. **Phase 1**: Deploy backend schema changes (add creditsNew field)
2. **Phase 2**: Deploy backend payment logic changes (route new purchases to creditsNew)
3. **Phase 3**: Deploy Go proxy changes (separate credit deduction by endpoint)
4. **Phase 4**: Deploy frontend changes (display dual credit system)
5. **Phase 5**: Update documentation and user communications

## Risks

- **Complexity**: Dual credit system increases code complexity
- **User confusion**: Users may not understand why they have two credit balances
- **Testing**: Need thorough testing of credit deduction logic for both endpoints
- **Migration edge cases**: Existing pending payments may need special handling

## Alternatives Considered

1. **Single field with rate migration** - Rejected because it would require converting existing credits, which may upset users who purchased at the old rate
2. **Date-based rate switching** - Rejected because it doesn't allow users to maintain old credits at the old rate
3. **User-selectable rate per request** - Rejected as too complex for UX
