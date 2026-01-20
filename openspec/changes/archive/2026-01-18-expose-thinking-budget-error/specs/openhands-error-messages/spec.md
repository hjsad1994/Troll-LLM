## ADDED Requirements

### Requirement: OpenHands Thinking Budget Token Validation Errors

When an OpenHands upstream request via the Anthropic endpoint returns a 400 error indicating that `max_tokens` must be greater than `thinking.budget_tokens`, the system SHALL preserve and return the specific error message to users, while continuing to sanitize other 400 errors to a generic "Bad request" message.

This ensures users understand when their extended thinking configuration violates Anthropic's constraints (`max_tokens` must be greater than `thinking.budget_tokens`) and can take corrective action by either increasing `max_tokens` or decreasing `thinking.budget_tokens`.

#### Scenario: User receives specific error for thinking budget token constraint violation

- **Given** an OpenHands upstream request returns HTTP 400 via Anthropic-compatible endpoint (`/v1/messages`)
- **And** the response body contains an error about `max_tokens` and `thinking.budget_tokens` constraint
- **And** the error message matches patterns: "max_tokens" AND "budget_tokens", or "thinking.budget_tokens"
- **When** `SanitizeAnthropicError(400, originalError)` is called in `goproxy/internal/openhands/types.go`
- **Then** the system SHALL log the original error (hidden from user): `🔒 [TrollProxy] Original error (hidden): {originalError}`
- **And** the system SHALL detect that the error is a thinking budget token validation error
- **And** the system SHALL return the original error message unchanged:
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "`max_tokens` must be greater than `thinking.budget_tokens`. Please consult our documentation at https://docs.claude.com/en/docs/build-with-claude/extended-thinking#max-tokens-and-context-window-size"
  }
}
```
- **And** the response SHALL include the documentation link to help users understand the constraint

#### Scenario: Detection of thinking budget token validation errors

- **Given** the system is checking if a 400 error is a thinking budget token validation error
- **When** the error string contains the following indicators (case-insensitive):
  - "max_tokens" AND "budget_tokens"
  - OR "thinking.budget_tokens"
- **Then** the system SHALL classify this as a thinking budget token validation error
- **And** the system SHALL preserve the specific error message
- **When** the error string does NOT contain these indicators
- **Then** the system SHALL continue to other error detection logic (e.g., image dimension errors)
- **Or** return the generic "Bad request" message if no actionable error patterns match

#### Scenario: Thinking budget error helps user fix their request

- **Given** a user makes an OpenHands request with extended thinking enabled
- **And** their `max_tokens` value is less than or equal to their `thinking.budget_tokens` value
- **When** they receive the thinking budget token validation error
- **Then** the error message SHALL clearly explain the constraint: `max_tokens` must be greater than `thinking.budget_tokens`
- **And** the error message SHALL include a link to Anthropic's documentation
- **And** the user SHALL understand they need to either increase `max_tokens` or decrease `thinking.budget_tokens`

#### Scenario: Other 400 errors remain unaffected

- **Given** an OpenHands upstream request returns HTTP 400
- **And** the error is NOT related to thinking budget tokens
- **And** the error is NOT related to image dimensions (already handled)
- **When** `SanitizeAnthropicError(400, originalError)` is called
- **Then** the system SHALL return the generic sanitized error:
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "Bad request"
  }
}
```
- **And** the response SHALL NOT expose any upstream implementation details
