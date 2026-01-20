# Story 4.2: Anthropic Format Error Responses

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **Anthropic SDK user**,
I want errors from `/v1/messages` in Anthropic format,
So that my client code handles errors correctly.

## Acceptance Criteria

1. **AC1: Rate Limit Error Format**
   - **Given** a rate limit error on `/v1/messages`
   - **When** the error response is returned
   - **Then** format is: `{"type":"error","error":{"type":"rate_limit_error","message":"Rate limit exceeded. Please retry after X seconds."}}`

2. **AC2: Insufficient Credits Error Format**
   - **Given** an insufficient credits error on `/v1/messages`
   - **When** the error response is returned
   - **Then** format is: `{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Current balance: $X.XX"}}`

3. **AC3: Authentication Error Format**
   - **Given** any 401 authentication error on `/v1/messages`
   - **When** the error response is returned
   - **Then** format is: `{"type":"error","error":{"type":"authentication_error","message":"..."}}`

4. **AC4: Friend Key Error Security**
   - **Given** a Friend Key with insufficient credits on `/v1/messages`
   - **When** error is returned
   - **Then** owner's balance is NOT exposed (generic message: "Insufficient credits. Please contact the key owner.")

## Tasks / Subtasks

- [x] Task 1: Standardize rate limit error in `/v1/messages` handler (AC: 1)
  - [x] 1.1: Update rate limit error in `checkRateLimitWithUsername` to detect endpoint format
  - [x] 1.2: Create `writeRateLimitErrorAnthropicFormat()` helper function
  - [x] 1.3: Include retry time in message: "Please retry after X seconds"
  - [x] 1.4: Add `Retry-After` header (already present, verify)

- [x] Task 2: Standardize insufficient credits error (AC: 2, 4)
  - [x] 2.1: Update User Key error at `main.go:2711-2727` to use consistent Anthropic format
  - [x] 2.2: Update Friend Key owner error at `main.go:2673-2677` - generic message, no balance
  - [x] 2.3: Update ValidationKey error at `main.go:2693-2704` for credits expired
  - [x] 2.4: Ensure type is `insufficient_credits` (not `insufficient_tokens`)

- [x] Task 3: Update `sanitizeAnthropicError` function (AC: 1, 2, 3)
  - [x] 3.1: Update `main.go:1834-1855` sanitizeAnthropicError with consistent error types
  - [x] 3.2: Update `internal/maintarget/handler.go:87-108` sanitizeAnthropicError
  - [x] 3.3: Update `internal/openhands/types.go:43-64` SanitizeAnthropicError
  - [x] 3.4: Ensure 402 error uses `insufficient_credits` type (not `service_error`)

- [x] Task 4: Update direct inline error responses in `/v1/messages` handler (AC: 3)
  - [x] 4.1: Review all `http.Error()` calls in `handleAnthropicMessagesEndpoint` (lines 2616-2809)
  - [x] 4.2: Ensure all use correct Anthropic format: `{"type":"error","error":{...}}`
  - [x] 4.3: Verify authentication errors use `authentication_error` type

- [x] Task 5: Write tests for Anthropic error format (AC: 1, 2, 3, 4)
  - [x] 5.1: Test 429 rate limit error has correct Anthropic format
  - [x] 5.2: Test 402 insufficient credits error has correct format
  - [x] 5.3: Test 401 authentication error has correct format
  - [x] 5.4: Test Friend Key 402 does NOT expose owner balance

## Dev Notes

### Anthropic Error Format Reference

**Official Anthropic API Error Format:**
```json
{
  "type": "error",
  "error": {
    "type": "<error_type>",
    "message": "<human_readable_message>"
  }
}
```

**Anthropic Error Types:**
- `api_error` - Unexpected internal error
- `authentication_error` - Invalid or missing API key
- `invalid_request_error` - Malformed request
- `not_found_error` - Resource not found
- `overloaded_error` - API temporarily overloaded
- `permission_error` - Access denied
- `rate_limit_error` - Rate limit exceeded

**TrollLLM Custom Error Types (for credits):**
- `insufficient_credits` - User/owner has no credits
- `credits_expired` - Credits have expired

### Current Error Locations in `/v1/messages` Handler

| Line | Error Type | Current Message | Fix Needed |
|------|------------|-----------------|------------|
| 2618 | Method not allowed | ✅ Correct format | None |
| 2629 | Auth header format | ✅ Correct format | None |
| 2638 | Missing auth | ✅ Correct format | None |
| 2657 | Invalid API key (env) | ✅ Correct format | None |
| 2668 | Friend key not found | ✅ Correct format | None |
| 2670 | Friend key inactive | ✅ Correct format | None |
| 2672 | Owner inactive | ✅ Correct format | None |
| 2676 | **Owner no credits** | ❌ Uses `insufficient_tokens` | Change to `insufficient_credits`, generic message |
| 2678 | Auth error default | ✅ Correct format | None |
| 2692 | Key revoked | ✅ Correct format | None |
| 2697 | **Insufficient credits** | ❌ Uses `insufficient_tokens` | Change to `insufficient_credits` |
| 2701 | Credits expired | ✅ Correct format | None |
| 2703 | Invalid key default | ✅ Correct format | None |
| 2722 | **User no credits** | ❌ Uses `insufficient_tokens` | Change to `insufficient_credits` |
| 2741 | Read body error | ✅ Correct format | None |
| 2754 | Invalid JSON | ✅ Correct format | None |
| 2767 | Model not found | ✅ Correct format | None |

### Required Error Type Changes

**From Story 4.1 (OpenAI endpoint) learnings - apply same patterns:**

| HTTP Code | Current Type | Correct Type |
|-----------|--------------|--------------|
| 402 | `insufficient_tokens` | `insufficient_credits` |
| 402 | `service_error` (sanitize) | `insufficient_credits` |

### sanitizeAnthropicError Current vs Required

**Current (`main.go:1834-1855`):**
```go
func sanitizeAnthropicError(statusCode int, originalError []byte) []byte {
    switch statusCode {
    case 402:
        return []byte(`{"type":"error","error":{"type":"service_error","message":"Service temporarily unavailable. Please contact admin."}}`)
    // ...
    }
}
```

**Should become:**
```go
func sanitizeAnthropicError(statusCode int, originalError []byte) []byte {
    switch statusCode {
    case 402:
        return []byte(`{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Please purchase credits to continue."}}`)
    // ...
    }
}
```

### Rate Limit Error - Endpoint Detection

**Problem:** `checkRateLimitWithUsername()` returns OpenAI format for ALL endpoints.

**Current (`main.go:438`):**
```go
w.Write([]byte(`{"error": {"message": "Rate limit exceeded. Please retry after ` + strconv.Itoa(retryAfter) + ` seconds.", "type": "rate_limit_error"}}`))
```

**Solution Options:**
1. **Option A (Recommended):** Pass endpoint type to function
2. **Option B:** Create separate function for Anthropic format
3. **Option C:** Detect endpoint from request path in ResponseWriter wrapper

**Recommended Implementation:**
```go
// Add parameter to detect endpoint type
func checkRateLimitWithUsername(w http.ResponseWriter, apiKey string, username string, isAnthropicEndpoint bool) bool {
    if !rateLimiter.Allow(apiKey, limit) {
        retryAfter := rateLimiter.RetryAfter(apiKey, limit)
        w.Header().Set("Content-Type", "application/json")
        w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
        // ... headers ...
        w.WriteHeader(http.StatusTooManyRequests)

        if isAnthropicEndpoint {
            w.Write([]byte(fmt.Sprintf(`{"type":"error","error":{"type":"rate_limit_error","message":"Rate limit exceeded. Please retry after %d seconds."}}`, retryAfter)))
        } else {
            w.Write([]byte(fmt.Sprintf(`{"error":{"message":"Rate limit exceeded. Please retry after %d seconds.","type":"rate_limit_error","code":"rate_limit_exceeded"}}`, retryAfter)))
        }
        return false
    }
    return true
}
```

### Duplicate Error Functions Analysis

**3 locations with sanitizeAnthropicError:**

1. **`main.go:1834-1855`** - Primary, used by most handlers
2. **`internal/maintarget/handler.go:87-108`** - MainTarget specific
3. **`internal/openhands/types.go:43-64`** - OpenHands specific

**All three must be updated in sync to use `insufficient_credits` for 402.**

### Files to Modify

| File | Lines | Changes |
|------|-------|---------|
| `goproxy/main.go` | 412-448 | Add endpoint type param to `checkRateLimitWithUsername` |
| `goproxy/main.go` | 438 | Add Anthropic format rate limit error |
| `goproxy/main.go` | 1834-1855 | Update `sanitizeAnthropicError` 402 type |
| `goproxy/main.go` | 2673-2677 | Update Friend Key owner error |
| `goproxy/main.go` | 2693-2704 | Update insufficient credits errors |
| `goproxy/main.go` | 2711-2727 | Update User Key credits error |
| `goproxy/main.go` | 2733 | Update call to pass `true` for Anthropic |
| `goproxy/internal/maintarget/handler.go` | 87-108 | Update `sanitizeAnthropicError` 402 type |
| `goproxy/internal/openhands/types.go` | 43-64 | Update `SanitizeAnthropicError` 402 type |

### Previous Story Intelligence (4.1)

**From Story 4.1 (OpenAI Format):**
- Added `code` field to OpenAI error format
- Changed `insufficient_tokens` type to `insufficient_quota` with `code: insufficient_credits`
- All sanitizeError functions need `code` field

**Key Insight:** This story (4.2) should NOT add `code` field - Anthropic format doesn't use it.

### Anthropic Official Error Reference

```
Error Type          | HTTP Status | Description
--------------------|-------------|-------------
api_error           | 500         | Internal server error
authentication_error| 401         | Invalid API key
invalid_request_error| 400        | Malformed request
not_found_error     | 404         | Resource not found
overloaded_error    | 529         | API overloaded
permission_error    | 403         | Access denied
rate_limit_error    | 429         | Rate limit exceeded
```

**Note:** Anthropic doesn't have native 402 error - this is TrollLLM specific for credits.

### Testing Strategy

**Unit Tests:**
```go
func TestAnthropicErrorFormat(t *testing.T) {
    testCases := []struct {
        name       string
        statusCode int
        wantType   string
    }{
        {"RateLimit", 429, "rate_limit_error"},
        {"InsufficientCredits", 402, "insufficient_credits"},
        {"Authentication", 401, "authentication_error"},
        {"BadRequest", 400, "invalid_request_error"},
    }
    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            resp := sanitizeAnthropicError(tc.statusCode, []byte("test"))
            var errResp map[string]interface{}
            json.Unmarshal(resp, &errResp)

            errObj := errResp["error"].(map[string]interface{})
            assert.Equal(t, tc.wantType, errObj["type"])
            assert.Equal(t, "error", errResp["type"])
        })
    }
}
```

**Integration Tests:**
- Send request to `/v1/messages` with invalid key → expect Anthropic format 401
- Send request to `/v1/messages` with no credits → expect Anthropic format 402
- Send 61+ requests with Friend Key → expect Anthropic format 429

### Project Structure Notes

- GoProxy is written in Go 1.25
- Error responses are defined inline (not centralized)
- Three separate `sanitizeAnthropicError` functions exist - all must be updated
- Rate limit function shared between `/v1/chat/completions` and `/v1/messages`

### Git Intelligence

**Recent Commit `bef1ca5`:** "Remove free tier checks for Friend Key validation in goproxy. Updated error handling in chat and Anthropic message endpoints accordingly."
- This confirms error handling was recently modified
- Friend Key error responses exist in both endpoints

### References

- [Source: _bmad-output/epics.md#Story-4.2]
- [Source: goproxy/main.go:2616-2809 - handleAnthropicMessagesEndpoint]
- [Source: goproxy/main.go:1834-1855 - sanitizeAnthropicError]
- [Source: goproxy/main.go:412-448 - checkRateLimitWithUsername]
- [Source: goproxy/internal/maintarget/handler.go:87-108 - sanitizeAnthropicError]
- [Source: goproxy/internal/openhands/types.go:43-64 - SanitizeAnthropicError]
- [Source: Anthropic API Error Reference - https://docs.anthropic.com/en/api/errors]
- [Source: Story 4-1-openai-format-error-responses.md - Previous story patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Build verification passed after each task
- All existing tests continue to pass
- New Anthropic error format tests all pass (7 tests)

### Completion Notes List

- ✅ Task 1: Added `isAnthropicEndpoint` parameter to `checkRateLimitWithUsername()` - rate limit errors now return correct format based on endpoint type
- ✅ Task 2: Changed all `insufficient_tokens` to `insufficient_credits` in /v1/messages handler. Friend Key errors now use generic message without exposing owner balance
- ✅ Task 3: Updated all 3 `sanitizeAnthropicError` functions (main.go, maintarget/handler.go, openhands/types.go) to return `insufficient_credits` for 402 errors instead of `service_error`
- ✅ Task 4: Changed all `server_error` types to `api_error` in Anthropic-format error responses (api_error is the correct Anthropic error type for server errors)
- ✅ Task 5: Created comprehensive test suite in `internal/openhands/anthropic_error_test.go` covering all ACs

### File List

- goproxy/main.go (modified)
- goproxy/internal/maintarget/handler.go (modified)
- goproxy/internal/openhands/types.go (modified)
- goproxy/internal/openhands/anthropic_error_test.go (new)

## Change Log

- 2025-12-17: Story created with comprehensive Anthropic error format analysis
- 2025-12-18: Story completed - all tasks implemented and tested
