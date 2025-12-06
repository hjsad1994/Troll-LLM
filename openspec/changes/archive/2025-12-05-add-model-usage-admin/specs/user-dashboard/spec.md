## ADDED Requirements

### Requirement: Admin Dashboard - Model Usage Statistics
The admin dashboard SHALL display usage statistics broken down by AI model.

#### Scenario: Display model usage table
- **WHEN** admin views the dashboard at `/admin`
- **THEN** the page SHALL display a "Model Usage" section
- **AND** show a table/list of all models used in the selected period
- **AND** for each model display: Input Tokens, Output Tokens, Total Tokens, Credits Burned, Request Count
- **AND** sort models by total tokens descending (most used first)

#### Scenario: Model usage respects period filter
- **WHEN** admin selects a time period (1h, 24h, 7d, all)
- **THEN** the model usage statistics SHALL be filtered to that period
- **AND** only show models with requests in that period

#### Scenario: Empty model usage
- **WHEN** no requests exist in the selected period
- **THEN** the system SHALL display "No model usage data" message

### Requirement: Model Stats API Endpoint
The system SHALL provide an API endpoint for fetching model usage statistics.

#### Scenario: Get model stats
- **WHEN** admin calls `GET /admin/model-stats?period=24h`
- **THEN** response SHALL include array of model stats objects
- **AND** each object contains: model, inputTokens, outputTokens, totalTokens, creditsBurned, requestCount
- **AND** results are sorted by totalTokens descending
