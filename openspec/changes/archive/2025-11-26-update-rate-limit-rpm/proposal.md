# Change: Update Rate Limiting to Simple 20 RPM

## Why
Current two-tier rate limiting (Dev: 30 RPM, Pro: 120 RPM) is too complex for current use case. Need a simpler unified rate limit of 20 RPM for all users to prevent API abuse and ensure fair usage.

## What Changes
- **BREAKING**: Remove two-tier rate limiting (Dev/Pro tiers)
- Replace with single 5 RPM limit for all User API keys
- Simplify rate limit logic in Go proxy
- Remove tier-based prefix detection (`sk-dev-`, `sk-pro-`)

## Impact
- Affected specs: `api-proxy` (Rate Limiting requirement)
- Affected code: 
  - `goproxy/internal/ratelimit/` - Simplify rate limiter
  - `goproxy/main.go` - Remove tier detection
  - `backend/src/services/userkey.service.ts` - Remove tier-based RPM
