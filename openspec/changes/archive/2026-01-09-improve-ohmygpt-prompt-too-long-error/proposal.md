# improve-ohmygpt-prompt-too-long-error Proposal

## Summary

Improve error handling for OhMyGPT upstream requests to preserve specific error messages for "prompt too long" errors while continuing to sanitize other 400 errors. Currently, ALL 400 errors are sanitized to a generic "Bad request" message, which confuses users when their prompt is actually too long.

## Problem

Users are receiving misleading error messages when their prompt exceeds OhMyGPT's token limit:

### Current Behavior
When OhMyGPT returns a 400 error with `"prompt is too long: 214850 tokens > 200000 maximum"`, the system sanitizes this to a generic message:
```json
{"error":{"message":"Bad request","type":"invalid_request_error","code":"invalid_request_error"}}
```

This is confusing because:
1. Users don't know their prompt is too long
2. The generic "Bad request" doesn't help them fix the issue
3. Users may think there's a bug in the API

### Logs from Production
```
goproxy-1  | 2026/01/08 11:47:33 🔒 [TrollProxy] Original error (hidden): {"type":"error","error":{"type":"invalid_request_error","message":"prompt is too long: 214850 tokens > 200000 maximum"},"request_id":"req_011CWurfp73Wj89b2cghZKFM"}
goproxy-1  | 2026/01/08 11:47:33 ❌ [Troll-LLM] OhMyGPT Error 400
goproxy-1  | 2026/01/08 11:47:33 🔒 [TrollProxy] Original error (hidden): {"error":{"message":"Bad request","type":"invalid_request_error","code":"invalid_request_error"}}
```

### Desired Behavior
Users should see a specific error message for "prompt too long" errors:
- **OpenAI Format**: `{"error":{"message":"This model's maximum context length is 200000 tokens. However, your prompt resulted in 214850 tokens.","type":"invalid_request_error","code":"context_length_exceeded"}}`
- **Anthropic Format**: `{"type":"error","error":{"type":"invalid_request_error","message":"prompt is too long: 214850 tokens > 200000 maximum"}}`

All OTHER 400 errors should continue to be sanitized to generic "Bad request" to avoid exposing upstream implementation details.

## Motivation

1. **User Experience**: Users need to know when their prompt is too long so they can shorten it
2. **Debugging**: Specific error messages help users understand and fix their requests
3. **Security**: Continue sanitizing OTHER 400 errors to avoid exposing upstream details
4. **Consistency**: Match the pattern used by other providers (OpenAI, Anthropic) for context length errors

## Proposed Solution

Modify the error sanitization functions in `goproxy/internal/ohmygpt/types.go` to:

1. **Detect "prompt too long" errors**: Check if the original error contains "prompt is too long", "context_length_exceeded", "maximum context length", or similar patterns
2. **Preserve the specific message**: For these errors, return the original (or slightly cleaned) error message
3. **Sanitize other 400 errors**: Continue to return generic "Bad request" for all other 400 errors

### Implementation Approach

```go
// SanitizeError returns sanitized error message (OpenAI format)
func SanitizeError(statusCode int, originalError []byte) []byte {
    log.Printf("🔒 [TrollProxy] Original error (hidden): %s", string(originalError))

    // Special handling for 400 - check for prompt too long
    if statusCode == 400 {
        errorStr := string(originalError)
        // Preserve prompt length errors for user clarity
        if containsPromptTooLongError(errorStr) {
            return preservePromptTooLongError(errorStr)
        }
        // All other 400s get generic message
        return []byte(`{"error":{"message":"Bad request","type":"invalid_request_error","code":"invalid_request_error"}}`)
    }

    // ... rest of existing cases
}

func containsPromptTooLongError(errorStr string) bool {
    indicators := []string{
        "prompt is too long",
        "context_length_exceeded",
        "maximum context length",
        "max_tokens",
        "token limit",
    }
    lowerStr := strings.ToLower(errorStr)
    for _, indicator := range indicators {
        if strings.Contains(lowerStr, strings.ToLower(indicator)) {
            return true
        }
    }
    return false
}
```

## Scope

### In Scope
- Modify `SanitizeError()` function in `goproxy/internal/ohmygpt/types.go`
- Modify `SanitizeAnthropicError()` function in `goproxy/internal/ohmygpt/types.go`
- Add helper function to detect "prompt too long" errors
- Add helper function to preserve/clean prompt length error messages
- Update existing spec `ohmygpt-error-messages` with new requirement

### Out of Scope
- Changing error handling for other status codes (401, 402, 403, 429, etc.)
- Modifying auto-rotation behavior
- Frontend changes
- Database schema changes

## Risks

- **Low Risk**: Simple logic change to error detection/preservation
- **Backward Compatible**: Error format remains the same, just more specific for one case
- **Security**: Continues to sanitize non-prompt-length 400 errors

## Alternatives Considered

1. **Pass through ALL 400 errors**: Rejected - would expose too much upstream detail
2. **Keep current behavior**: Rejected - users are confused by generic "Bad request"
3. **Add new error code**: Rejected - unnecessary complexity, standard codes exist

## Success Criteria

1. When OhMyGPT returns "prompt is too long" error, users see a specific message about token limits
2. All OTHER 400 errors continue to show generic "Bad request"
3. Error messages are in standard OpenAI/Anthropic format
4. Original upstream error is still logged for debugging
