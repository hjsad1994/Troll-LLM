## ADDED Requirements

### Requirement: Request History View
The system SHALL provide users with visibility into their API request history showing detailed cost breakdown.

#### Scenario: View request history page
- **WHEN** authenticated user navigates to `/dashboard/request-history`
- **THEN** the system SHALL display a table of recent API requests
- **AND** show columns: Time, Model, Input Tokens, Output Tokens, Cache (Write/Hit), Credits Cost, Status, Latency
- **AND** sort by most recent first (descending by createdAt)

#### Scenario: Display request details
- **WHEN** request history table is displayed
- **THEN** each row SHALL show:
  - `createdAt`: formatted as "YYYY-MM-DD HH:mm:ss"
  - `model`: model ID used (e.g., "claude-sonnet-4-20250514")
  - `inputTokens`: number of input tokens
  - `outputTokens`: number of output tokens
  - `cacheWriteTokens`: cache write tokens (if any)
  - `cacheHitTokens`: cache hit tokens (if any)
  - `creditsCost`: cost in credits (formatted as $X.XXXXXX)
  - `statusCode`: HTTP status (200, 400, 500, etc.)
  - `latencyMs`: response time in milliseconds

#### Scenario: Paginate request history
- **WHEN** user has more than 20 requests
- **THEN** the system SHALL paginate results with 20 items per page
- **AND** show pagination controls (Previous, Next, page numbers)
- **AND** display total count of requests

#### Scenario: Empty request history
- **WHEN** user has no API requests
- **THEN** the system SHALL display message "No requests yet"
- **AND** show helpful text about how to make API calls

---

### Requirement: Request History API
The system SHALL provide an API endpoint for fetching user's request history.

#### Scenario: Get request history
- **WHEN** authenticated user calls `GET /api/user/request-history`
- **THEN** response SHALL include:
  - `requests`: array of request log objects
  - `total`: total count of user's requests
  - `page`: current page number
  - `limit`: items per page
  - `totalPages`: total number of pages

#### Scenario: Pagination parameters
- **WHEN** user calls `GET /api/user/request-history?page=2&limit=20`
- **THEN** the system SHALL return the specified page
- **AND** default limit is 20, max limit is 100
- **AND** default page is 1

#### Scenario: Date range filtering
- **WHEN** user calls `GET /api/user/request-history?from=2025-01-01&to=2025-01-31`
- **THEN** the system SHALL filter requests within the date range
- **AND** dates are in ISO 8601 format

---

### Requirement: Enhanced Request Logging
The system SHALL log detailed information for each API request.

#### Scenario: Log request with token breakdown
- **WHEN** API proxy completes a request
- **THEN** the system SHALL log:
  - `userId`: username of the user making the request
  - `userKeyId`: the API key ID used
  - `factoryKeyId`: the factory key used
  - `model`: model ID requested
  - `inputTokens`: number of input tokens
  - `outputTokens`: number of output tokens
  - `cacheWriteTokens`: cache write tokens (0 if none)
  - `cacheHitTokens`: cache hit tokens (0 if none)
  - `creditsCost`: total credits cost for this request
  - `statusCode`: HTTP response status
  - `latencyMs`: request duration in milliseconds
  - `isSuccess`: boolean (statusCode === 200)
  - `createdAt`: timestamp

#### Scenario: Request log retention
- **WHEN** request logs are stored
- **THEN** logs SHALL be retained for 30 days
- **AND** automatically expire after TTL (MongoDB TTL index)

---

### Requirement: Dashboard Navigation - Request History
The system SHALL include Request History in the dashboard navigation.

#### Scenario: Show Request History menu item
- **WHEN** user views dashboard sidebar/navigation
- **THEN** "Request History" menu item SHALL be visible
- **AND** link to `/dashboard/request-history`
- **AND** display appropriate icon (e.g., clock/history icon)

#### Scenario: Active state for Request History menu
- **WHEN** user is on `/dashboard/request-history` page
- **THEN** the "Request History" menu item SHALL be highlighted as active
