# Implementation Tasks

## 1. Implementation

- [x] 1.1 Add image dimension error detection function `isImageDimensionError()` in `goproxy/internal/openhands/types.go`
- [x] 1.2 Modify `SanitizeAnthropicError()` to check for image dimension errors before sanitizing
- [x] 1.3 Return original error message for detected image dimension errors
- [x] 1.4 Ensure generic "Bad request" sanitization continues for all other 400 errors
- [x] 1.5 Verify logging of original error is preserved

## 2. Testing

- [x] 2.1 Test with oversized image via OpenHands Anthropic endpoint (`/v1/messages`)
- [x] 2.2 Verify specific error message is exposed to user
- [x] 2.3 Test with other 400 errors (invalid JSON, missing fields) and verify they remain sanitized
- [x] 2.4 Test with OpenAI endpoint (`/v1/chat/completions`) and verify no changes to behavior
- [x] 2.5 Verify log output includes original error for audit trail

## 3. Documentation

- [x] 3.1 Update error handling documentation if needed
- [x] 3.2 Add comments in code explaining image dimension error detection logic
