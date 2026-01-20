# Story 4.3: Actionable Error Information

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **API user**,
I want error messages to include actionable information,
So that I know what to do next.

## Acceptance Criteria

1. **AC1: Rate Limit Error with Retry Time**
   - **Given** a 429 rate limit error
   - **When** the error is returned
   - **Then** message includes retry time: "Please retry after X seconds"

2. **AC2: Insufficient Credits Error with Balance**
   - **Given** a 402 insufficient credits error for User Key
   - **When** the error is returned
   - **Then** message includes current balance: "Insufficient credits. Current balance: $X.XX"

3. **AC3: Friend Key Balance Security**
   - **Given** a 402 insufficient credits error for Friend Key
   - **When** the error is returned
   - **Then** balance is NOT exposed (generic message only: "Please contact the key owner")

## Tasks / Subtasks

- [x] Task 1: Verify rate limit error includes retry time (AC: 1)
  - [x] 1.1: Verify OpenAI format `/v1/chat/completions` includes retry time in message
  - [x] 1.2: Verify Anthropic format `/v1/messages` includes retry time in message
  - [x] 1.3: Write test to validate retry time is included in both formats

- [x] Task 2: Verify insufficient credits error includes balance for User Key (AC: 2)
  - [x] 2.1: Verify OpenAI format `/v1/chat/completions` includes balance in message
  - [x] 2.2: Verify Anthropic format `/v1/messages` includes balance in message
  - [x] 2.3: Write test to validate balance format "$X.XX" is correct

- [x] Task 3: Verify Friend Key errors do NOT expose owner balance (AC: 3)
  - [x] 3.1: Verify OpenAI format Friend Key error uses generic message
  - [x] 3.2: Verify Anthropic format Friend Key error uses generic message
  - [x] 3.3: Write test to validate NO balance exposed in Friend Key errors

- [x] Task 4: Create comprehensive integration tests (AC: 1, 2, 3)
  - [x] 4.1: Test rate limit error message format for both endpoints
  - [x] 4.2: Test User Key insufficient credits shows balance
  - [x] 4.3: Test Friend Key insufficient credits hides balance
  - [x] 4.4: Ensure all tests pass

## Dev Notes

### Current Implementation Status (From Story 4.1 and 4.2)

**AC1: Rate Limit Retry Time - ALREADY IMPLEMENTED ✅**

Both OpenAI and Anthropic formats already include retry time in message:

```go
// OpenAI format (main.go:446)
`{"error":{"message":"Rate limit exceeded. Please retry after %d seconds.",...}}`

// Anthropic format (main.go:443)
`{"type":"error","error":{"type":"rate_limit_error","message":"Rate limit exceeded. Please retry after %d seconds."}}`
```

**AC2: User Key Balance - ALREADY IMPLEMENTED ✅**

Both formats include balance for User Key errors:

```go
// OpenAI format (main.go:645)
`{"error":{"message":"Insufficient credits. Current balance: $%.2f",...}}`

// Anthropic format (main.go:2736)
`{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Current balance: $%.2f"}}`
```

**AC3: Friend Key Security - ALREADY IMPLEMENTED ✅**

Both formats use generic message for Friend Key:

```go
// OpenAI format (main.go:596)
`{"error":{"message":"Insufficient credits. Please contact the key owner.",...}}`

// Anthropic format (main.go:2690)
`{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Please contact the key owner."}}`
```

### What This Story Actually Needs

Since the implementation is already done in Stories 4.1 and 4.2, this story's main purpose is:

1. **VERIFICATION** - Confirm all actionable error information is correctly implemented
2. **TESTING** - Write comprehensive tests to document and protect this behavior
3. **DOCUMENTATION** - Ensure error messages are consistent across endpoints

### Error Message Locations Summary

| Error Type | OpenAI Location | Anthropic Location | Actionable Info |
|------------|-----------------|--------------------|-----------------|
| Rate Limit 429 | main.go:446 | main.go:443 | ✅ Retry time in seconds |
| User Key 402 | main.go:645 | main.go:2736 | ✅ Current balance $X.XX |
| Friend Key 402 | main.go:596 | main.go:2690 | ✅ Generic message only |

### Files to Review/Test

| File | Purpose |
|------|---------|
| `goproxy/main.go` | All error response implementations |
| `goproxy/internal/openhands/anthropic_error_test.go` | Existing Anthropic tests |
| `goproxy/internal/ratelimit/integration_test.go` | Existing rate limit tests |

### Testing Strategy

This story focuses on **verification testing**, not implementation. The tests should:

1. **Document** the expected error message formats
2. **Verify** actionable information is present
3. **Protect** against regression

**Unit Tests:**
```go
func TestActionableErrorInfo_RateLimitRetryTime(t *testing.T) {
    // Test that rate limit errors include "Please retry after X seconds"
}

func TestActionableErrorInfo_UserKeyBalance(t *testing.T) {
    // Test that User Key errors include "Current balance: $X.XX"
}

func TestActionableErrorInfo_FriendKeyNoBalance(t *testing.T) {
    // Test that Friend Key errors do NOT contain $ or balance
}
```

### Previous Story Intelligence

**From Story 4.1 (OpenAI Format):**
- Added `code` field to all OpenAI errors
- Changed `insufficient_tokens` to `insufficient_quota` with `code: insufficient_credits`
- Balance included in User Key error messages

**From Story 4.2 (Anthropic Format):**
- Changed `insufficient_tokens` to `insufficient_credits`
- Friend Key errors use generic message (AC4 implemented)
- All 3 sanitizeAnthropicError functions updated

**Key Insight:** All ACs are already implemented. This story is about verification and testing.

### Git Intelligence

Recent commits show error handling was updated:
- `bef1ca5`: Remove free tier checks, updated error handling in both endpoints
- Story 4.2: Changed error types and added security for Friend Key balance

### Project Structure Notes

- GoProxy is written in Go
- Tests are in `*_test.go` files in same package or `internal/*/` directories
- Use table-driven tests for comprehensive coverage

### References

- [Source: goproxy/main.go:443-446 - Rate limit error with retry time]
- [Source: goproxy/main.go:596, 2690 - Friend Key generic error message]
- [Source: goproxy/main.go:645, 2736 - User Key balance in error message]
- [Source: _bmad-output/stories/4-1-openai-format-error-responses.md - OpenAI format patterns]
- [Source: _bmad-output/stories/4-2-anthropic-format-error-responses.md - Anthropic format patterns]
- [Source: _bmad-output/epics.md#Story-4.3 - Story requirements]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Verified main.go:443-446 - Rate limit error format with retry time
- Verified main.go:596 - OpenAI Friend Key generic error
- Verified main.go:645 - OpenAI User Key balance in error
- Verified main.go:2690 - Anthropic Friend Key generic error
- Verified main.go:2736 - Anthropic User Key balance in error

### Completion Notes List

- ✅ Task 1: Verified rate limit errors include retry time in both OpenAI and Anthropic formats
- ✅ Task 2: Verified User Key insufficient credits errors include balance ($X.XX format)
- ✅ Task 3: Verified Friend Key errors use generic message without balance (security)
- ✅ Task 4: Created comprehensive test suite (actionable_error_test.go) - all 25 tests pass
- All ACs were already implemented in Stories 4.1 and 4.2; this story validated and documented the behavior

### File List

| File | Status |
|------|--------|
| goproxy/internal/openhands/actionable_error_test.go | Added - Comprehensive tests for Story 4.3 ACs |

## Change Log

- 2025-12-18: Story created with comprehensive analysis - Note: All ACs already implemented in Stories 4.1/4.2, this story focuses on verification and testing
- 2025-12-18: Story completed - Created actionable_error_test.go with 25 tests covering all 3 ACs for both OpenAI and Anthropic formats
