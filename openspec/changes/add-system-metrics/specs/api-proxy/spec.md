## ADDED Requirements

### Requirement: System-wide Metrics API
The system SHALL provide an API endpoint to retrieve aggregated metrics for the entire proxy system.

#### Scenario: Admin retrieves system metrics
- **WHEN** admin calls `GET /admin/metrics`
- **THEN** response SHALL include total_requests count
- **AND** response SHALL include total_tokens sum
- **AND** response SHALL include avg_latency_ms (average request latency)
- **AND** response SHALL include success_rate (percentage of successful requests)

#### Scenario: Admin retrieves metrics with time period
- **WHEN** admin calls `GET /admin/metrics?period=24h`
- **THEN** response SHALL include metrics for specified period only
- **AND** valid periods are: `1h`, `24h`, `7d`, `all`
- **AND** default period is `all` if not specified

#### Scenario: No requests logged
- **WHEN** admin calls `GET /admin/metrics` with no request logs
- **THEN** response SHALL return zero values for all metrics
- **AND** success_rate SHALL be 0

---

### Requirement: Request Latency Tracking
The system SHALL track latency for each API request.

#### Scenario: Latency measured for request
- **WHEN** a request is processed through the proxy
- **THEN** latency SHALL be measured from request start to response complete
- **AND** latency SHALL be stored in `request_logs.latencyMs` field

#### Scenario: Latency included in request log
- **WHEN** request completes (success or failure)
- **THEN** request log SHALL include `latencyMs` in milliseconds
- **AND** request log SHALL include `isSuccess` boolean (true for 2xx status)

---

### Requirement: System Metrics Dashboard
The system SHALL display system-wide metrics on the admin Dashboard.

#### Scenario: Dashboard shows metrics cards
- **WHEN** admin views Dashboard page
- **THEN** page SHALL display Total Requests card
- **AND** page SHALL display Total Tokens card
- **AND** page SHALL display Avg Latency card (in ms)
- **AND** page SHALL display Success Rate card (as percentage)

#### Scenario: Dashboard auto-refreshes metrics
- **WHEN** admin is viewing Dashboard page
- **THEN** metrics SHALL auto-refresh every 30 seconds
- **AND** page SHALL not require manual reload

#### Scenario: Large numbers formatted
- **WHEN** metrics contain large values (>1000)
- **THEN** numbers SHALL be formatted with K/M suffixes
- **AND** latency SHALL show "ms" suffix
- **AND** success rate SHALL show "%" suffix

---

## MODIFIED Requirements

### Requirement: User Usage Check
The system SHALL allow users to check their token usage via API and Web UI.

#### Scenario: Check usage via API
- **WHEN** user calls `GET /api/usage?key=sk-xxx-xxx`
- **THEN** response SHALL include masked key (sk-xxx-***xxx)
- **AND** response SHALL include tier, rpm_limit, total_tokens, tokens_used, tokens_remaining
- **AND** response SHALL include usage_percent and is_exhausted flag

#### Scenario: Check usage via Web UI
- **WHEN** user visits `GET /usage`
- **THEN** a web page SHALL be displayed with input field for API key
- **AND** user can enter key to see usage with progress bar

#### Scenario: Invalid key usage check
- **WHEN** user calls `GET /api/usage` with invalid or revoked key
- **THEN** response SHALL return error "Invalid API key"

#### Scenario: Dashboard shows system metrics
- **WHEN** admin views Dashboard at root `/`
- **THEN** Dashboard SHALL display system-wide metrics (Total Requests, Total Tokens, Avg Latency, Success Rate)
- **AND** Dashboard SHALL display existing stats (User Keys, Factory Keys, Proxies, System Health)
