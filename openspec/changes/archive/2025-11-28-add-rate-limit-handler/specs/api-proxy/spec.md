## ADDED Requirements

### Requirement: Rate Limit Enforcement
The system SHALL enforce rate limits based on user tier before processing API requests.

#### Scenario: Dev tier rate limit
- **WHEN** a Dev tier user makes requests exceeding 20 RPM
- **THEN** return HTTP 429 with Retry-After header

#### Scenario: Pro tier rate limit
- **WHEN** a Pro tier user makes requests exceeding 60 RPM
- **THEN** return HTTP 429 with Retry-After header

#### Scenario: Unknown user default limit
- **WHEN** a user without UserKey record makes requests exceeding 20 RPM
- **THEN** return HTTP 429 with default rate limit applied

### Requirement: Rate Limit Headers
The system SHALL include rate limit information in API response headers.

#### Scenario: Rate limit headers in response
- **WHEN** any API request is processed
- **THEN** response includes X-RateLimit-Limit, X-RateLimit-Remaining headers

#### Scenario: Retry-After on rate limit exceeded
- **WHEN** rate limit is exceeded
- **THEN** response includes Retry-After header with seconds to wait
