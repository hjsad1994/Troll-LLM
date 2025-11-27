# Change: Fix Factory Key Usage Tracking

## Why
Factory Keys page shows "Tokens Used" and "Requests" columns but values are always 0 because the `factory_keys` collection is never updated when requests are made. Currently, usage is only tracked for User Keys.

## What Changes
- Update GoProxy's `LogRequest()` to also increment `tokensUsed` and `requestsCount` on the Factory Key
- Add new function `UpdateFactoryKeyUsage()` in tracker.go
- Frontend already displays these fields correctly

## Impact
- Affected specs: `api-proxy`
- Affected code:
  - `goproxy/internal/usage/tracker.go` - Add UpdateFactoryKeyUsage function
  - `goproxy/main.go` - Call UpdateFactoryKeyUsage after LogRequest
