# openhands-error-messages Specification

## Purpose

Defines error message handling for OpenHands upstream requests. This specification ensures that actionable validation errors (like image dimension limits) are exposed to users to help them fix their requests, while continuing to sanitize other errors to protect implementation details.
## Requirements
### Requirement: OpenHands Image Dimension Validation Errors

When an OpenHands upstream request via the Anthropic endpoint returns a 400 error indicating that an image dimension exceeds the maximum allowed size, the system SHALL preserve and return the specific error message to users, while continuing to sanitize all other 400 errors to a generic "Bad request" message.

This ensures users understand when their images exceed dimension limits (8000 pixels) and can take corrective action, while still protecting upstream implementation details for other types of 400 errors.

#### Scenario: User receives specific error for image dimension exceeded (Anthropic format)

- **Given** an OpenHands upstream request returns HTTP 400 via Anthropic-compatible endpoint (`/v1/messages`)
- **And** the response body contains an error about image dimensions exceeding the maximum allowed size
- **And** the error message matches patterns: "image dimensions exceed", "exceed max allowed size", or "image.source.base64.data"
- **When** `SanitizeAnthropicError(400, originalError)` is called in `goproxy/internal/openhands/types.go`
- **Then** the system SHALL log the original error (hidden from user): `🔒 [TrollProxy] Original error (hidden): {originalError}`
- **And** the system SHALL detect that the error is an image dimension validation error
- **And** the system SHALL return the original error message unchanged:
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "messages.52.content.2.image.source.base64.data: At least one of the image dimensions exceed max allowed size: 8000 pixels"
  }
}
```
- **And** the response SHALL include the specific field path and dimension limit information

#### Scenario: Other 400 errors continue to be sanitized

- **Given** an OpenHands upstream request returns HTTP 400 via Anthropic-compatible endpoint
- **And** the response body contains a 400 error that is NOT related to image dimensions (e.g., invalid JSON, missing required field, malformed request)
- **When** `SanitizeAnthropicError(400, originalError)` is called
- **Then** the system SHALL log the original error (hidden from user)
- **And** the system SHALL return the generic sanitized error:
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

#### Scenario: Detection of image dimension validation errors

- **Given** the system is checking if a 400 error is an image dimension validation error
- **When** the error string contains any of the following indicators (case-insensitive):
  - "image dimensions exceed"
  - "exceed max allowed size"
  - "image.source.base64.data"
- **Then** the system SHALL classify this as an image dimension validation error
- **And** the system SHALL preserve the specific error message
- **When** the error string does NOT contain any of these indicators
- **Then** the system SHALL classify this as a regular 400 error
- **And** the system SHALL return the generic "Bad request" message

#### Scenario: Image dimension error helps user fix their request

- **Given** a user makes an OpenHands request with an image that exceeds the 8000 pixel dimension limit
- **When** they receive the image dimension exceeded error
- **Then** the error message SHALL clearly indicate which field contains the oversized image
- **And** the error message SHALL clearly state the maximum allowed dimension (8000 pixels)
- **And** the user SHALL understand they need to resize their image
- **And** the error message SHALL be consistent with Anthropic's standard error format

#### Scenario: OpenAI format unaffected

- **Given** an OpenHands request is made via the OpenAI-compatible endpoint (`/v1/chat/completions`)
- **When** the upstream returns a 400 error
- **Then** the error SHALL be handled by `SanitizeError()` (OpenAI format)
- **And** the image dimension error detection SHALL NOT apply to OpenAI format
- **And** existing OpenAI error sanitization behavior SHALL remain unchanged

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

