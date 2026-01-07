# Implementation Tasks

## Task 1: Modify OpenAI format 402 error message
**File:** `goproxy/internal/ohmygpt/types.go`
**Function:** `SanitizeError(statusCode int, originalError []byte) []byte`

Change the case 402 error message from:
```go
case 402:
    return []byte(`{"error":{"message":"Insufficient credits. Please purchase credits to continue.","type":"insufficient_quota","code":"insufficient_credits"}}`)
```

To:
```go
case 402:
    return []byte(`{"error":{"message":"Upstream service error. Please try again.","type":"upstream_error","code":"upstream_error"}}`)
```

**Validation:**
- [x] Error type changed from "insufficient_quota" to "upstream_error"
- [x] Error code changed from "insufficient_credits" to "upstream_error"
- [x] Message no longer mentions credits, purchase, billing, or balance
- [x] JSON structure remains valid

## Task 2: Modify Anthropic format 402 error message
**File:** `goproxy/internal/ohmygpt/types.go`
**Function:** `SanitizeAnthropicError(statusCode int, originalError []byte) []byte`

Change the case 402 error message from:
```go
case 402:
    return []byte(`{"type":"error","error":{"type":"insufficient_credits","message":"Insufficient credits. Please purchase credits to continue."}}`)
```

To:
```go
case 402:
    return []byte(`{"type":"error","error":{"type":"upstream_error","message":"Upstream service error. Please try again."}}`)
```

**Validation:**
- [x] Error type changed from "insufficient_credits" to "upstream_error"
- [x] Message no longer mentions credits, purchase, billing, or balance
- [x] JSON structure remains valid

## Task 3: Verify error logging still works
**File:** `goproxy/internal/ohmygpt/types.go`

Ensure that the original OhMyGPT error is still logged for debugging:
```go
log.Printf("🔒 [TrollProxy] Original error (hidden): %s", string(originalError))
```

**Validation:**
- [x] Original upstream error is logged before returning sanitized response
- [x] Log output contains OhMyGPT's original message for debugging
- [x] Users do not see the original error in API response

## Task 4: Test error response format
**Validation:**
- [x] Build goproxy: `cd goproxy && go build`
- [x] Test with mock OhMyGPT 402 response
- [x] Verify response JSON is valid
- [x] Verify error type is "upstream_error"
- [x] Verify message is "Upstream service error. Please try again."

## Task 5: Verify auto-rotation still works
**File:** `goproxy/internal/ohmygpt/ohmygpt.go`

**Validation:**
- [x] 402 errors still trigger `CheckAndRotateOnError()`
- [x] Key rotation works as before
- [x] Retry with backup keys succeeds
- [x] User only sees error if all keys are exhausted

## Task 6: Update any related documentation
**Validation:**
- [x] Check if any docs reference the old error message
- [x] Update error handling documentation if needed
- [x] No other code depends on "insufficient_quota" or "insufficient_credits" for OhMyGPT (other providers like maintarget have their own error handling which is out of scope)

## Dependencies

- None (standalone string change)

## Parallelizable Work

- Tasks 1 and 2 can be done in parallel (separate functions)
- Tasks 3, 4, 5 depend on Tasks 1 and 2 completing

## Definition of Done

- [x] Both error format functions return the new message for 402 status code
- [x] Error message does not mention credits, purchase, or billing
- [x] Auto-rotation behavior is unchanged
- [x] Original errors are still logged for debugging
- [x] goproxy builds without errors
- [x] `openspec validate` passes
