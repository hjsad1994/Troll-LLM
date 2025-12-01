# Change: Add Tokens Used Column to Admin Users Table

## Why
Admin users need visibility into how many tokens each user has consumed to monitor usage patterns, identify heavy users, and make informed decisions about plan management.

## What Changes
- Add "Tokens Used" column to the admin users table at `/users`
- Display both total tokens used and monthly tokens used
- Format large numbers with K/M suffixes for readability

## Impact
- Affected specs: user-dashboard
- Affected code: `frontend/src/app/(dashboard)/users/page.tsx`
- No backend changes required (data already returned by API)
