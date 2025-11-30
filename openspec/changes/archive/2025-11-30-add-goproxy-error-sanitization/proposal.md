# Change: Add Error Sanitization to GoProxy

## Why
GoProxy currently forwards raw error responses from upstream providers (Factory AI, Main Target) directly to clients. This exposes sensitive information such as upstream URLs, billing details, request IDs, and API key hints (e.g., `{"detail":"Ready for more? Reload your tokens at https://app.factory.ai/settings/billing...","requestId":"hkg1::..."}`). This is a security vulnerability that could reveal backend infrastructure details.

## What Changes
- Add `sanitizeError()` and `sanitizeAnthropicError()` functions to `main.go` (similar to existing implementations in `troll2/handler.go` and `maintarget/handler.go`)
- Update 4 handler functions in `main.go` to use sanitized errors instead of forwarding raw upstream errors:
  - `handleAnthropicNonStreamResponse` (line ~1140)
  - `handleAnthropicStreamResponse` (line ~1252)
  - `handleTrollOpenAINonStreamResponse` (line ~1416)
  - `handleAnthropicMessagesStreamResponse` (line ~2263)
- Log original error server-side for debugging while returning generic error to client

## Impact
- Affected specs: `api-proxy`
- Affected code: `goproxy/main.go`
- Security improvement: Upstream provider details hidden from clients
- Debugging: Original errors still logged server-side
