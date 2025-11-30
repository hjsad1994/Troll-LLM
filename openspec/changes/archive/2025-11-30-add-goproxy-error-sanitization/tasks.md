## 1. Implementation

- [x] 1.1 Add `sanitizeError()` function to main.go (OpenAI format)
- [x] 1.2 Add `sanitizeAnthropicError()` function to main.go (Anthropic format)
- [x] 1.3 Update `handleAnthropicNonStreamResponse` to use `sanitizeError()`
- [x] 1.4 Update `handleAnthropicStreamResponse` to use `sanitizeError()`
- [x] 1.5 Update `handleTrollOpenAINonStreamResponse` to use `sanitizeError()`
- [x] 1.6 Update `handleAnthropicMessagesStreamResponse` to use `sanitizeAnthropicError()`

## 2. Testing

- [x] 2.1 Build goproxy and verify no compilation errors
- [ ] 2.2 Test error responses do not contain upstream details (manually trigger 402/429/500 errors)
- [ ] 2.3 Verify original errors are logged server-side for debugging
