# ohmygpt-error-messages Specification

## Purpose

Defines error message responses returned to users when OhMyGPT upstream requests fail, ensuring messages are accurate, not misleading, and don't expose upstream provider details.

## ADDED Requirements

### Requirement: OhMyGPT 402 Error Message

When an OhMyGPT upstream API key returns a 402 (Payment Required) error due to insufficient balance or quota, the system SHALL return a generic upstream error message that does NOT mention purchasing credits or user billing actions.

The error message returned to users is "Upstream service error. Please try again." instead of mentioning credits or billing, which more accurately reflects that the issue is with the upstream provider's key quota, not the user's TrollLLM account balance.

#### Scenario: User receives sanitized 402 error (OpenAI format)
- **Given** an OhMyGPT upstream request returns HTTP 402
- **And** the response body contains OhMyGPT's error message about insufficient balance/quota
- **When** `SanitizeError(402, originalError)` is called in `goproxy/internal/ohmygpt/types.go`
- **Then** the system SHALL log the original error (hidden from user): `🔒 [TrollProxy] Original error (hidden): {originalError}`
- **And** the system SHALL return the following JSON response:
```json
{"error":{"message":"Upstream service error. Please try again.","type":"upstream_error","code":"upstream_error"}}
```
- **And** the response SHALL NOT mention "credits", "purchase", "billing", or "balance"
- **And** the response SHALL NOT expose OhMyGPT's billing URL or provider name

#### Scenario: User receives sanitized 402 error (Anthropic format)
- **Given** an OhMyGPT upstream request returns HTTP 402 via Anthropic-compatible endpoint
- **And** the response body contains OhMyGPT's error message about insufficient balance/quota
- **When** `SanitizeAnthropicError(402, originalError)` is called in `goproxy/internal/ohmygpt/types.go`
- **Then** the system SHALL log the original error (hidden from user): `🔒 [TrollProxy] Original error (hidden): {originalError}`
- **And** the system SHALL return the following JSON response:
```json
{"type":"error","error":{"type":"upstream_error","message":"Upstream service error. Please try again."}}
```
- **And** the response SHALL NOT mention "credits", "purchase", "billing", or "balance"
- **And** the response SHALL NOT expose OhMyGPT's billing URL or provider name

#### Scenario: Auto-rotation still works after 402 error
- **Given** an OhMyGPT upstream request returns HTTP 402
- **When** `CheckAndRotateOnError()` is called
- **Then** the system SHALL mark the key for rotation (status change)
- **And** the system SHALL attempt to retry with the next available backup key
- **And** if a backup key is available, the request SHALL succeed on retry
- **And** the user SHALL NOT see the 402 error if retry succeeds
- **Note:** Error message change only affects cases where all keys are exhausted and no retry is possible

#### Scenario: Error message clarity for Vietnamese users
- **Given** a Vietnamese-speaking user receives a 402 error
- **When** the error message is displayed
- **Then** "Upstream service error. Please try again." translates to "Lỗi dịch vụ phía trên. Vui lòng thử lại."
- **And** the message SHALL NOT translate to "hết tiền" (out of money) which was misleading
- **And** users SHALL understand it's a temporary upstream issue, not their account balance issue

#### Scenario: Other error status codes unchanged
- **Given** the system handles other HTTP error status codes (400, 401, 403, 429, 500, etc.)
- **When** `SanitizeError()` or `SanitizeAnthropicError()` is called with status codes other than 402
- **Then** the existing error messages SHALL remain unchanged
- **And** only the 402 case SHALL be modified by this change
