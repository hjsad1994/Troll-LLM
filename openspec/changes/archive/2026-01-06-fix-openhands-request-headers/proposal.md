# Change: Fix OpenHands Request Headers to Avoid Detection

## Why

OpenHands provider is detecting and blocking our proxy by resetting budget from $10 to $0. Analysis found 3 critical issues that make our requests easily identifiable:

1. **Double authentication headers**: Sending both `Authorization: Bearer <key>` AND `x-api-key: <key>` (same value) - normal clients only send one
2. **Missing User-Agent header**: Not setting User-Agent makes requests stand out (Go http client default or empty)
3. **Missing common headers**: Lacking `Accept-Encoding`, `Accept-Language` that normal clients send

These fingerprinting techniques allow OpenHands to easily detect and block proxy traffic.

## What Changes

- Remove duplicate `x-api-key` header when `Authorization` is already set
- Add proper User-Agent header from config (already defined but not used)
- Add common browser-like headers to blend in with normal traffic:
  - `Accept-Encoding: gzip, deflate, br`
  - `Accept-Language: en-US,en;q=0.9`
- Randomize User-Agent options to avoid pattern detection

## Impact

- Affected specs: `openhands-stealth` (new spec)
- Affected code:
  - `goproxy/internal/openhands/openhands.go:510-515` - fix request headers
  - `goproxy/internal/openhands/openhands.go:674-679` - fix retry headers
  - `goproxy/config-openhands-prod.json:71` - update user_agent config
