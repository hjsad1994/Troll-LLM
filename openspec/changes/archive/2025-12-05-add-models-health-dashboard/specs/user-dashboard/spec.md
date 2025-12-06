## ADDED Requirements

### Requirement: Models Health Display on Dashboard
The system SHALL display a list of available AI models with their health status on the user dashboard.

#### Scenario: View models section on dashboard
- **WHEN** authenticated user visits `/dashboard`
- **THEN** the system SHALL display a "Models" section
- **AND** show all available AI models from the system configuration
- **AND** for each model display: name, type (anthropic/openai), health status

#### Scenario: Display healthy model indicator
- **WHEN** a model's upstream endpoint is reachable and responding
- **THEN** the system SHALL display a green indicator (dot or badge)
- **AND** show status text "Healthy" or equivalent visual indicator

#### Scenario: Display unhealthy model indicator
- **WHEN** a model's upstream endpoint is unreachable or returning errors
- **THEN** the system SHALL display a red indicator (dot or badge)
- **AND** show status text "Unhealthy" or equivalent visual indicator

#### Scenario: Loading state for models
- **WHEN** dashboard is loading model health data
- **THEN** the system SHALL display loading skeleton or spinner
- **AND** show placeholder cards for models

#### Scenario: Auto-refresh model health
- **WHEN** user is viewing the dashboard
- **THEN** the system SHALL refresh model health status every 30 seconds
- **AND** update UI without full page reload

---

### Requirement: Models Health API Endpoint
The system SHALL provide an API endpoint for fetching model list with health status.

#### Scenario: Get models with health status
- **WHEN** user calls `GET /api/models/health`
- **THEN** response SHALL include array of model objects
- **AND** each object contains: id, name, type, isHealthy, lastCheckedAt

#### Scenario: Health check implementation
- **WHEN** health check runs for a model
- **THEN** the system SHALL attempt to reach the model's upstream endpoint
- **AND** set isHealthy to true if response received within 5 seconds
- **AND** set isHealthy to false if timeout or error occurs
- **AND** update lastCheckedAt timestamp
