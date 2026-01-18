## 1. Implementation

- [x] 1.1 Add `isThinkingBudgetError()` helper function in `goproxy/internal/openhands/types.go` to detect max_tokens/budget_tokens validation errors
- [x] 1.2 Update `SanitizeAnthropicError()` in `goproxy/internal/openhands/types.go` to check for thinking budget errors before returning generic "Bad request"
- [x] 1.3 Add unit tests for the new error detection logic

## 2. Validation

- [ ] 2.1 Test with actual API request that triggers the thinking budget error
- [ ] 2.2 Verify other 400 errors are still sanitized (not exposed)
- [ ] 2.3 Verify image dimension errors continue to work as expected
