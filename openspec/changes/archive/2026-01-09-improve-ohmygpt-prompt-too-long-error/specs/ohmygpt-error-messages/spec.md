# ohmygpt-error-messages Specification Deltas

## ADDED Requirements

### Requirement: Preserve Prompt Too Long Error Messages

When an OhMyGPT upstream API request returns a 400 error with a "prompt is too long" or "context length exceeded" message, the system SHALL preserve and return the specific error message to users, while continuing to sanitize all other 400 errors to a generic "Bad request" message.

This ensures users understand when their prompt exceeds the model's context length limit, while still protecting upstream implementation details for other types of 400 errors.

#### Scenario: User receives specific error for prompt too long (OpenAI format)

- **Given** an OhMyGPT upstream request returns HTTP 400
- **And** the response body contains "prompt is too long: 214850 tokens > 200000 maximum"
- **When** `SanitizeError(400, originalError)` is called in `goproxy/internal/ohmygpt/types.go`
- **Then** the system SHALL log the original error (hidden from user): `🔒 [TrollProxy] Original error (hidden): {originalError}`
- **And** the system SHALL detect that the error is a "prompt too long" error
- **And** the system SHALL return a JSON response with the specific prompt length error:
```json
{"error":{"message":"This model's maximum context length is 200000 tokens. However, your prompt resulted in 214850 tokens.","type":"invalid_request_error","code":"context_length_exceeded"}}
```
- **And** the response SHALL include clear information about the token limit and the actual token count

#### Scenario: User receives specific error for prompt too long (Anthropic format)

- **Given** an OhMyGPT upstream request returns HTTP 400 via Anthropic-compatible endpoint
- **And** the response body contains "prompt is too long: 214850 tokens > 200000 maximum"
- **When** `SanitizeAnthropicError(400, originalError)` is called in `goproxy/internal/ohmygpt/types.go`
- **Then** the system SHALL log the original error (hidden from user): `🔒 [TrollProxy] Original error (hidden): {originalError}`
- **And** the system SHALL detect that the error is a "prompt too long" error
- **And** the system SHALL return the original error message (or slightly cleaned version):
```json
{"type":"error","error":{"type":"invalid_request_error","message":"prompt is too long: 214850 tokens > 200000 maximum"}}
```

#### Scenario: Other 400 errors continue to be sanitized

- **Given** an OhMyGPT upstream request returns HTTP 400
- **And** the response body contains a 400 error that is NOT related to prompt length (e.g., invalid JSON, missing required field)
- **When** `SanitizeError(400, originalError)` or `SanitizeAnthropicError(400, originalError)` is called
- **Then** the system SHALL log the original error (hidden from user)
- **And** the system SHALL return the generic sanitized error:
  - OpenAI Format: `{"error":{"message":"Bad request","type":"invalid_request_error","code":"invalid_request_error"}}`
  - Anthropic Format: `{"type":"error","error":{"type":"invalid_request_error","message":"Bad request"}}`
- **And** the response SHALL NOT expose any upstream implementation details

#### Scenario: Detection of prompt too long errors

- **Given** the system is checking if a 400 error is a "prompt too long" error
- **When** the error string contains any of the following indicators (case-insensitive):
  - "prompt is too long"
  - "context_length_exceeded"
  - "maximum context length"
  - "max_tokens"
  - "token limit"
- **Then** the system SHALL classify this as a prompt length error
- **And** the system SHALL preserve the specific error message
- **When** the error string does NOT contain any of these indicators
- **Then** the system SHALL classify this as a regular 400 error
- **And** the system SHALL return the generic "Bad request" message

#### Scenario: Prompt length error helps user fix their request

- **Given** a user makes a request with a prompt that is too long
- **When** they receive the context length exceeded error
- **Then** the error message SHALL clearly state the maximum allowed tokens
- **And** the error message SHALL clearly state the actual token count that exceeded the limit
- **And** the user SHALL understand they need to reduce their prompt size
- **And** the error message SHALL be consistent with OpenAI/Anthropic standard error formats
