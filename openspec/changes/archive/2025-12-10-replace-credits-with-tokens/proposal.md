# Change: Replace Credits System with Token-Based Billing

## Why
Current credits system uses USD-based values which is complex for users to understand. Users prefer to see their usage in terms of tokens (6M, 12M) with simpler weekly packages.

## What Changes
- **BREAKING**: Remove `credits` field from User model, replace with `tokenBalance` (in millions)
- **BREAKING**: Remove `refCredits` field, replace with `refTokens`
- Dashboard shows "Tokens" instead of "Credits" (e.g., "6M Tokens", "12M Tokens")
- Token packages expire after **1 week** (not 1 month)
- New payment packages:
  - 6M tokens / 1 week = 20,000 VND
  - 12M tokens / 1 week = 40,000 VND
- Remove complex USD-based cost calculation, use simple token deduction
- Billing based on actual input + output tokens used

## Impact
- Affected specs: `user-dashboard`, `payment`, `api-proxy`
- Affected code:
  - `backend/src/models/user.model.ts` - User schema
  - `backend/src/services/user.service.ts` - User service
  - `backend/src/services/payment.service.ts` - Payment logic
  - `goproxy/main.go` - Billing calculation
  - `goproxy/internal/usage/*.go` - Usage tracking
  - `frontend/src/app/(dashboard)/dashboard/page.tsx` - Dashboard UI
  - `frontend/src/components/PaymentModal.tsx` - Payment modal
  - `frontend/src/lib/i18n.ts` - Translations
