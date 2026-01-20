# Implementation Tasks

## Overview
Ordered list of small, verifiable work items that deliver user-visible progress.

## Tasks

1. **Add helper function to detect prompt too long errors**
   - Add `containsPromptTooLongError(errorStr string) bool` function to `goproxy/internal/ohmygpt/types.go`
   - Check for common patterns: "prompt is too long", "context_length_exceeded", "maximum context length", "max_tokens", "token limit"
   - Use case-insensitive matching
   - Write unit tests for various error message formats

2. **Add helper function to preserve prompt length errors (OpenAI format)**
   - Add `preservePromptTooLongErrorOpenAI(errorStr string) []byte` function
   - Extract token limit and actual token count from original error message
   - Format response: `{"error":{"message":"This model's maximum context length is {limit} tokens. However, your prompt resulted in {actual} tokens.","type":"invalid_request_error","code":"context_length_exceeded"}}`
   - Handle cases where token counts can't be extracted
   - Write unit tests for various error message formats

3. **Add helper function to preserve prompt length errors (Anthropic format)**
   - Add `preservePromptTooLongErrorAnthropic(errorStr string) []byte` function
   - Clean up the original error message if needed (remove request_id, etc.)
   - Format response: `{"type":"error","error":{"type":"invalid_request_error","message":"{cleaned_message}"}}`
   - Write unit tests for various error message formats

4. **Modify SanitizeError function to handle prompt too long errors**
   - Update `SanitizeError(statusCode int, originalError []byte) []byte` in `goproxy/internal/ohmygpt/types.go`
   - Add check: if statusCode == 400 && containsPromptTooLongError(errorStr), call preserve function
   - Otherwise, return existing generic "Bad request" message
   - Ensure logging still happens for all errors
   - Write unit tests for both prompt length and regular 400 errors

5. **Modify SanitizeAnthropicError function to handle prompt too long errors**
   - Update `SanitizeAnthropicError(statusCode int, originalError []byte) []byte` in `goproxy/internal/ohmygpt/types.go`
   - Add check: if statusCode == 400 && containsPromptTooLongError(errorStr), call preserve function
   - Otherwise, return existing generic "Bad request" message
   - Ensure logging still happens for all errors
   - Write unit tests for both prompt length and regular 400 errors

6. **Integration testing with real OhMyGPT responses**
   - Test with actual OhMyGPT error responses from logs
   - Verify prompt too long errors are preserved correctly
   - Verify other 400 errors are still sanitized
   - Test both OpenAI and Anthropic format endpoints
   - Verify error messages are parseable by clients

7. **Update ohmygpt-error-messages spec**
   - Mark old spec requirements as MODIFIED if needed
   - Ensure spec reflects the new behavior
   - Add examples of preserved vs sanitized error messages

8. **Validate with openspec validate**
   - Run `openspec validate improve-ohmygpt-prompt-too-long-error --strict`
   - Fix any validation errors
   - Ensure all requirements have scenarios

## Dependencies

- Tasks 1-3 can be done in parallel (helper functions)
- Task 4 depends on Task 1 and Task 2
- Task 5 depends on Task 1 and Task 3
- Task 6 depends on Task 4 and Task 5
- Task 7 can be done in parallel with implementation
- Task 8 is final validation

## Validation Criteria

- Unit tests pass for all helper functions
- Integration tests with real error responses pass
- `openspec validate --strict` passes with no errors
- Manual testing with a prompt that exceeds token limit shows specific error
- Manual testing with other 400 errors shows generic "Bad request"
