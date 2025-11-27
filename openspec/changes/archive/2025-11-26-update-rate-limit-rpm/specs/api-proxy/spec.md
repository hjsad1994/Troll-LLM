## MODIFIED Requirements

### Requirement: Rate Limiting
The system SHALL enforce a fixed 20 RPM (requests per minute) limit for all User API keys using sliding window algorithm.

#### Scenario: Request within rate limit
- **WHEN** user sends request with valid API key
- **AND** user has made fewer than 20 requests in the last 60 seconds
- **THEN** request SHALL be processed normally
- **AND** `X-RateLimit-Limit: 20` header SHALL be included
- **AND** `X-RateLimit-Remaining: {remaining}` header SHALL be included

#### Scenario: Rate limit exceeded
- **WHEN** user sends 21st request within 60 seconds
- **THEN** system SHALL return HTTP 429 Too Many Requests
- **AND** response SHALL include `Retry-After` header with seconds to wait
- **AND** response SHALL include `X-RateLimit-Limit: 20` header
- **AND** response SHALL include `X-RateLimit-Remaining: 0` header
- **AND** response body SHALL include error message "Rate limit exceeded. Please wait before making another request."

#### Scenario: Rate limit reset after window
- **WHEN** 60 seconds have passed since first request in window
- **THEN** rate limit counter SHALL reset
- **AND** user can make new requests up to 5 RPM

#### Scenario: Rate limit per API key
- **WHEN** multiple users make requests simultaneously
- **THEN** each API key SHALL have independent rate limit counter
- **AND** one user's rate limit SHALL NOT affect other users

## REMOVED Requirements

### Requirement: Two-Tier Rate Limiting
**Reason**: Simplifying to single 5 RPM limit for all users. Two-tier system (Dev: 30 RPM, Pro: 120 RPM) no longer needed.
**Migration**: All existing keys will use the new 5 RPM limit regardless of tier prefix.
