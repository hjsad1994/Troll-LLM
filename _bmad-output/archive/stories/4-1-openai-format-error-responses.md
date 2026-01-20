# Story 4.1: OpenAI Format Error Responses

Status: done

## Story

As a **OpenAI SDK user**,
I want errors from `/v1/chat/completions` in OpenAI format,
So that my client code handles errors correctly.

## Acceptance Criteria

1. **AC1:** Given a rate limit error on `/v1/chat/completions`, when the error response is returned, then format is: `{"error": {"message": "Rate limit exceeded. Please retry after X seconds.", "type": "rate_limit_error", "code": "rate_limit_exceeded"}}`

2. **AC2:** Given an insufficient credits error on `/v1/chat/completions`, when the error response is returned, then format is: `{"error": {"message": "Insufficient credits. Current balance: $X.XX", "type": "insufficient_quota", "code": "insufficient_credits"}}`

3. **AC3:** Given any 401 authentication error on `/v1/chat/completions`, when the error response is returned, then format is: `{"error": {"message": "...", "type": "authentication_error", "code": "invalid_api_key"}}`

4. **AC4:** Given all error responses from `/v1/chat/completions`, when returned, then format MUST include `code` field (currently missing).

## Tasks / Subtasks

- [x] Task 1: Add `code` field to all OpenAI format error responses (AC: 1, 2, 3, 4)
  - [x] 1.1: Update `sanitizeError` function (`main.go:1812-1831`) to include `code` field
  - [x] 1.2: Update `openhands/types.go:SanitizeError` to include `code` field
  - [x] 1.3: Update `maintarget/handler.go:sanitizeError` to include `code` field

- [x] Task 2: Standardize rate limit error response (AC: 1)
  - [x] 2.1: Update rate limit error in `checkRateLimitWithUsername` (`main.go:430-440`)
  - [x] 2.2: Ensure message includes retry time: "Please retry after X seconds"
  - [x] 2.3: Ensure type is `rate_limit_error`, code is `rate_limit_exceeded`

- [x] Task 3: Standardize insufficient credits error response (AC: 2)
  - [x] 3.1: Update User Key insufficient credits error (`main.go:605-610`)
  - [x] 3.2: Update Friend Key owner no credits error (`main.go:584-588`)
  - [x] 3.3: Ensure type is `insufficient_quota`, code is `insufficient_credits`
  - [x] 3.4: Include balance in message for User Keys: "Current balance: $X.XX"
  - [x] 3.5: Generic message for Friend Keys (don't expose owner's balance)
  - [x] 3.6: Update credits expired error to consistent format

- [x] Task 4: Verify build and test (AC: 4)
  - [x] 4.1: Go build verification passed

## Dev Notes

### Error Format Changes Summary

**Before (missing `code`):**
```json
{"error": {"message": "...", "type": "..."}}
```

**After (with `code`):**
```json
{"error": {"message": "...", "type": "...", "code": "..."}}
```

### Error Code Registry

| HTTP Code | Type | Code | Message |
|-----------|------|------|---------|
| 400 | `invalid_request_error` | `invalid_request_error` | Bad request |
| 401 | `authentication_error` | `invalid_api_key` | Authentication failed |
| 402 | `insufficient_quota` | `insufficient_credits` | Insufficient credits. Current balance: $X.XX |
| 402 | `insufficient_quota` | `credits_expired` | Credits have expired |
| 403 | `permission_error` | `permission_denied` | Access denied |
| 404 | `not_found_error` | `not_found` | Resource not found |
| 429 | `rate_limit_error` | `rate_limit_exceeded` | Rate limit exceeded |
| 5xx | `server_error` | `server_error` | Upstream service unavailable |

### Files Modified

| File | Changes |
|------|---------|
| `goproxy/main.go:430-442` | Rate limit error - added `code` field |
| `goproxy/main.go:584-588` | Friend Key no credits - updated type/code |
| `goproxy/main.go:605-615` | User Key insufficient credits - updated format |
| `goproxy/main.go:625-637` | Check credits error - updated format |
| `goproxy/main.go:1811-1833` | sanitizeError - added `code` to all cases |
| `goproxy/internal/maintarget/handler.go:64-86` | sanitizeError - added `code` to all cases |
| `goproxy/internal/openhands/types.go:20-42` | SanitizeError - added `code` to all cases |

### Key Changes

1. **sanitizeError functions (3 locations)**: All now include `code` field
2. **402 errors**: Changed from `service_error`/`insufficient_tokens` → `insufficient_quota` with `code:"insufficient_credits"`
3. **Rate limit error**: Added `code:"rate_limit_exceeded"`
4. **Friend Key errors**: Generic message without exposing owner's balance

### References

- [Source: _bmad-output/epics.md#Story-4.1]
- [Source: OpenAI API Error Reference - https://platform.openai.com/docs/api-reference/errors]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Go build: PASS

### Completion Notes List

- ✅ Updated sanitizeError in main.go with `code` field for all HTTP status codes
- ✅ Updated sanitizeError in maintarget/handler.go with `code` field
- ✅ Updated SanitizeError in openhands/types.go with `code` field
- ✅ Updated rate limit error to include `code:"rate_limit_exceeded"`
- ✅ Updated Friend Key no credits error: type=`insufficient_quota`, code=`insufficient_credits`
- ✅ Updated User Key insufficient credits with consistent format
- ✅ Updated credits expired error with code field
- ✅ Go build verification passed

### File List

- `goproxy/main.go` - Updated sanitizeError, rate limit error, insufficient credits errors
- `goproxy/internal/maintarget/handler.go` - Updated sanitizeError
- `goproxy/internal/openhands/types.go` - Updated SanitizeError

## Change Log

- 2025-12-17: Story created with comprehensive error handling analysis
- 2025-12-17: Implementation completed - Added `code` field to all OpenAI format error responses
