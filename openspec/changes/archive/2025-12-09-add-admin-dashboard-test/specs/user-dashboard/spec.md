## ADDED Requirements

### Requirement: User Dashboard Test Page
The system SHALL provide a user dashboard test page at `/dashboard-test` that displays detailed request analytics for the current user.

#### Scenario: User access own data
- **WHEN** a logged-in user accesses `/dashboard-test`
- **THEN** the system SHALL display detailed analytics for **that user only**

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user attempts to access `/dashboard-test`
- **THEN** the system SHALL redirect them to `/login`

### Requirement: User Detailed Usage Statistics Endpoint
The system SHALL provide an endpoint `GET /user/detailed-usage` that returns aggregated request metrics for the authenticated user.

#### Scenario: Get detailed usage by period
- **WHEN** user calls `GET /user/detailed-usage?period=24h`
- **THEN** the system SHALL return metrics for **current user only**:
  - `inputTokens`: Sum of all input tokens in the period
  - `outputTokens`: Sum of all output tokens in the period
  - `cacheWriteTokens`: Sum of all cache write tokens in the period
  - `cacheHitTokens`: Sum of all cache hit tokens in the period
  - `creditsBurned`: Sum of all credits cost in the period
  - `requestCount`: Total number of requests in the period

#### Scenario: Supported periods
- **WHEN** user specifies period parameter
- **THEN** the system SHALL support: `1h`, `24h`, `7d`, `30d`
- **AND** default to `24h` if not specified

#### Scenario: Data isolation
- **WHEN** user calls the endpoint
- **THEN** the system SHALL only return data where `userId` matches the authenticated user
- **AND** SHALL NOT expose any other user's data

### Requirement: Detailed Usage Display Card
The dashboard test page SHALL display a card showing detailed usage breakdown.

#### Scenario: Display detailed metrics
- **WHEN** user views the dashboard test page
- **THEN** the system SHALL display a card with:
  - Input Tokens (formatted with K/M/B suffix for large numbers)
  - Output Tokens (formatted with K/M/B suffix)
  - Cache Write Tokens (formatted with K/M/B suffix)
  - Cache Hit Tokens (formatted with K/M/B suffix)
  - Credits Burned (formatted as USD with 2 decimal places)
  - Request Count

#### Scenario: Period selector
- **WHEN** user clicks on a period button (1h, 24h, 7d, 30d)
- **THEN** the system SHALL update all displayed metrics to reflect the selected period
