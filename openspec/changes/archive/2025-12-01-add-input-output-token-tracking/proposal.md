# Add Input/Output Token Tracking

## Problem
Currently, the system only tracks `tokensUsed` as a combined value for each user. Admins cannot see the breakdown of input vs output tokens, which is important for:
- Understanding user usage patterns
- Cost analysis (input and output tokens have different pricing)
- Identifying heavy input vs heavy output users

## Solution
Add separate tracking for input and output tokens at the user level:
1. Add `totalInputTokens` and `totalOutputTokens` fields to User model
2. Update goproxy's `DeductCredits` function to update these fields
3. Display input/output tokens on `/users` page for admin
4. Display total system-wide input/output tokens on `/admin` page

## Files to Modify
- `backend/src/models/user.model.ts` - Add new fields to schema
- `goproxy/internal/usage/tracker.go` - Update DeductCredits function
- `frontend/src/app/(dashboard)/users/page.tsx` - Add columns to table
- `frontend/src/app/(dashboard)/admin/page.tsx` - Add total metrics
- `frontend/src/lib/api.ts` - Update AdminUser type
- `backend/src/routes/admin.ts` - Update user-stats endpoint

## Impact
- Non-breaking change (new fields default to 0)
- Existing users will show 0 for input/output until new requests are made
