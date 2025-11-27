## ADDED Requirements

### Requirement: Token Analytics API
The system SHALL provide an API endpoint to retrieve token usage analytics for factory keys.

#### Scenario: Get token analytics
- **WHEN** admin requests `GET /admin/factory-keys/analytics`
- **THEN** the system SHALL return token usage statistics including:
  - `tokens_1h`: Total tokens used in the last 1 hour
  - `tokens_24h`: Total tokens used in the last 24 hours  
  - `tokens_7d`: Total tokens used in the last 7 days
  - `requests_1h`: Total requests in the last 1 hour
  - `requests_24h`: Total requests in the last 24 hours
  - `requests_7d`: Total requests in the last 7 days

#### Scenario: Analytics by factory key
- **WHEN** admin requests `GET /admin/factory-keys/:id/analytics`
- **THEN** the system SHALL return token usage statistics for that specific factory key

### Requirement: Request Logging for Analytics
The system SHALL log each API request with timestamp and token usage for analytics aggregation.

#### Scenario: Log request with factory key
- **WHEN** a request is processed through the proxy
- **THEN** the system SHALL log:
  - `factoryKeyId`: The factory key used
  - `userKeyId`: The user key that made the request
  - `tokensUsed`: Number of tokens consumed
  - `createdAt`: Timestamp of the request

### Requirement: Token Analytics Dashboard UI
The admin page SHALL display token usage analytics for factory keys.

#### Scenario: Display analytics cards
- **WHEN** admin visits `/admin/factory-keys.html`
- **THEN** the page SHALL display analytics cards showing:
  - Tokens used in last 1 hour
  - Tokens used in last 24 hours
  - Tokens used in last 7 days

#### Scenario: Auto-refresh analytics
- **WHEN** the analytics page is open
- **THEN** the data SHALL refresh automatically every 60 seconds
