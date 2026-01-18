# Change: Expose thinking budget token validation errors to users

## Why

Users making requests to Claude models with extended thinking enabled are receiving generic "Bad request" errors when their `max_tokens` is less than or equal to `thinking.budget_tokens`. This violates Anthropic's API constraint that `max_tokens` must be greater than `thinking.budget_tokens`. The current error sanitization hides the specific, actionable error message from users, making it impossible for them to understand and fix their request configuration.

## What Changes

- **MODIFIED** OpenHands Anthropic error sanitization to detect and preserve `max_tokens`/`thinking.budget_tokens` validation errors
- Users will see the specific error message explaining the constraint violation instead of generic "Bad request"
- Other 400 errors continue to be sanitized to protect implementation details

## Impact

- Affected specs: `openhands-error-messages`
- Affected code: `goproxy/internal/openhands/types.go` (SanitizeAnthropicError function)
- No breaking changes - only exposes additional actionable error types
- Improves developer experience for users of extended thinking features
