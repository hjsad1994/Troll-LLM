# Story 2.1: Pre-request Credits Validation

Status: done

## Story

As a **API user**,
I want the system to check my credits before processing requests,
So that I know immediately if I don't have enough credits.

## Acceptance Criteria

1. **AC1:** Given a user with credits > 0, when they make an API request, then the request is forwarded to upstream.

2. **AC2:** Given a user with credits = 0 and refCredits = 0, when they make an API request, then the request is blocked with 402 status.

3. **AC3:** Given a user blocked due to insufficient credits, when the response is returned, then it includes current balance information: $0.00.

4. **AC4:** Given a user with credits = 0 but refCredits > 0, when they make an API request, then the request is allowed (using refCredits).

## Tasks / Subtasks

- [x] Task 1: Verify existing credits validation implementation (AC: 1, 2, 4)
  - [x] 1.1: Review `CheckUserCredits()` and `CheckUserCreditsDetailed()` in validator.go
  - [x] 1.2: Review credits check in OpenAI handler (main.go:620-635)
  - [x] 1.3: Review credits check in Anthropic handler (main.go:2710-2725)
  - [x] 1.4: Verify refCredits fallback works correctly

- [x] Task 2: Verify 402 response format (AC: 2, 3)
  - [x] 2.1: Verify 402 status code is returned for insufficient credits
  - [x] 2.2: Check if balance is included in error response
  - [x] 2.3: Update error response to include balance if missing

- [x] Task 3: Add integration tests (AC: 1-4)
  - [x] 3.1: Add test for user with credits > 0 (request allowed)
  - [x] 3.2: Add test for user with credits = 0 (402 returned)
  - [x] 3.3: Add test for user with refCredits only (request allowed)
  - [x] 3.4: Run all tests to ensure no regression

## Dev Notes

### Critical Analysis: Credits Validation Already Implemented

**IMPORTANT FINDING:** Pre-request credits validation is ALREADY IMPLEMENTED in multiple locations. This story is a **VERIFICATION story** to confirm credits check works correctly and add test coverage.

### Current Implementation Analysis

**Location 1:** `goproxy/internal/userkey/validator.go:139-162`
```go
// CheckUserCredits checks if user has sufficient credits (credits > 0 or refCredits > 0)
func CheckUserCredits(username string) error {
    // ...
    if user.Credits <= 0 && user.RefCredits <= 0 {
        return ErrInsufficientCredits
    }
    return nil
}
```

**Location 2:** `goproxy/main.go:620-635` (OpenAI handler)
```go
// Check if user has sufficient credits
if err := userkey.CheckUserCredits(username); err != nil {
    if err == userkey.ErrInsufficientCredits {
        log.Printf("💸 Insufficient credits for user: %s", username)
        credits, refCredits, credErr := userkey.GetUserCreditsWithRef(username)
        if credErr != nil { log.Printf("⚠️ Failed to get credits...") }
        balance := credits + refCredits
        w.WriteHeader(http.StatusPaymentRequired)
        // ... error response with balance
    }
}
```

**Location 3:** `goproxy/main.go:2710-2725` (Anthropic handler)
```go
// Check if user has sufficient credits
if err := userkey.CheckUserCredits(username); err != nil {
    if err == userkey.ErrInsufficientCredits {
        log.Printf("💸 Insufficient tokens for user: %s", username)
        credits, refCredits, credErr := userkey.GetUserCreditsWithRef(username)
        if credErr != nil { log.Printf("⚠️ Failed to get credits...") }
        balance := credits + refCredits
        w.WriteHeader(http.StatusPaymentRequired)
        // ... error response with balance (Anthropic format)
    }
}
```

### Existing Functions

| Function | File | Purpose |
|----------|------|---------|
| `CheckUserCredits(username)` | validator.go:139 | Returns error if credits <= 0 AND refCredits <= 0 |
| `CheckUserCreditsDetailed(username)` | validator.go:166 | Returns detailed balance info including UseRefCredits flag |
| `GetUserCredits(username)` | validator.go:202 | Returns main credits balance |
| `GetUserCreditsWithRef(username)` | validator.go:223 | Returns both credits and refCredits |

### Error Constants

| Error | Value | Usage |
|-------|-------|-------|
| `ErrInsufficientCredits` | "insufficient credits" | Returned when credits <= 0 AND refCredits <= 0 |
| `ErrKeyNotFound` | "API key not found" | Returned when key doesn't exist |
| `ErrKeyRevoked` | "API key has been revoked" | Returned when key is inactive |
| `ErrCreditsExpired` | "credits have expired" | Returned when key is expired |

### 402 Response Formats (After Fix)

**OpenAI endpoint:**
```json
{"error": {"message": "Insufficient credits. Balance: $0.00. Please purchase credits to continue.", "type": "insufficient_credits", "balance": 0.00}}
```

**Anthropic endpoint:** (follows Anthropic API error format)
```json
{"type":"error","error":{"type":"insufficient_tokens","message":"Insufficient tokens. Balance: $0.00. Please purchase a package to continue.","balance":0.00}}
```

### RefCredits Fallback

The system correctly handles refCredits:
- `CheckUserCredits()` allows request if credits > 0 OR refCredits > 0
- `CheckUserCreditsDetailed()` sets `UseRefCredits = true` when credits <= 0 but refCredits > 0
- RefCredits users get Pro RPM bonus (1000 RPM) via `checkRateLimitWithUsername()`

### Files Modified

| File | Role |
|------|------|
| `goproxy/internal/userkey/validator.go` | Credits validation functions |
| `goproxy/main.go:603-615` | OpenAI ValidateKey credits error handling |
| `goproxy/main.go:620-635` | OpenAI CheckUserCredits error handling |
| `goproxy/main.go:2688-2703` | Anthropic ValidateKey credits error handling |
| `goproxy/main.go:2710-2725` | Anthropic CheckUserCredits error handling |

### Testing Standards

- Tests in `goproxy/internal/userkey/validator_test.go`
- Tests call real functions (`CheckUserCredits`, `CheckUserCreditsDetailed`)
- Table-driven tests for credits logic matrix
- Notes included for tests requiring MongoDB integration

### References

- [Source: _bmad-output/epics.md#Story-2.1]
- [Source: goproxy/internal/userkey/validator.go]
- [Source: goproxy/main.go - OpenAI and Anthropic handlers]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

**2025-12-17 Implementation Summary:**

1. **Task 1 - Verification Complete:**
   - Confirmed `CheckUserCredits()` in `validator.go:139-162` correctly validates credits > 0 OR refCredits > 0
   - Confirmed `CheckUserCreditsDetailed()` in `validator.go:166-199` returns detailed result with `UseRefCredits` flag
   - Verified OpenAI handler calls `CheckUserCredits()` and returns 402
   - Verified Anthropic handler calls `CheckUserCredits()` and returns 402
   - Confirmed refCredits fallback works: users with credits=0 but refCredits>0 are allowed

2. **Task 2 - AC3 Fix Implemented:**
   - **Finding:** Original 402 responses did NOT include balance information
   - **Fix:** Updated error responses in both OpenAI and Anthropic handlers to include:
     - Balance in message: `"Balance: $X.XX"`
     - Balance field in JSON: `"balance": X.XX`
   - OpenAI handler: now fetches balance via `GetUserCreditsWithRef()`
   - Anthropic handler: now fetches balance via `GetUserCreditsWithRef()`

3. **Task 3 - Tests Added:**
   - Created `goproxy/internal/userkey/validator_test.go` with comprehensive tests

**2025-12-17 Code Review Fixes (Adversarial Review):**

4. **Issues Fixed by Code Review:**
   - **Issue #1 FIXED:** Refactored tests to call real functions instead of simulating logic
   - **Issue #4 FIXED:** Added missing `ErrInsufficientCredits` and `ErrCreditsExpired` handling to Anthropic ValidateKey path (`main.go:2690-2702`)
   - **Issue #5 FIXED:** Added error logging for `GetUserCreditsWithRef()` failures (both handlers)
   - **Issue #6 FIXED:** Updated line number references in story
   - **Issue #7 FIXED:** Removed duplicate test cases, consolidated into table-driven tests

5. **Design Decisions (Not Bugs):**
   - **Issue #3 (Not a bug):** Anthropic and OpenAI have different error formats by design - they follow their respective API specifications
   - OpenAI: `{"error": {...}}`
   - Anthropic: `{"type":"error","error":{...}}`

### File List

**Modified:**
- `goproxy/main.go` - Updated 402 error responses with balance, added Anthropic ValidateKey credits handling, added error logging

**Created:**
- `goproxy/internal/userkey/validator_test.go` - Unit tests for credits validation

## Change Log

- 2025-12-17: Story implementation complete - verified existing credits validation, fixed AC3 (balance in 402 response), added comprehensive unit tests
- 2025-12-17: Code Review fixes - refactored tests, added missing Anthropic ValidateKey error handling, added error logging, updated documentation
