# OpenHands Stealth Spec Delta

## ADDED Requirements

### Requirement: Realistic Request Headers

The system SHALL send HTTP headers that match legitimate OpenHands client behavior to avoid detection and blocking.

#### Scenario: Use single authentication header
- **WHEN** making requests to OpenHands API
- **THEN** the system SHALL send only `Authorization: Bearer <key>` header
- **AND** NOT send `x-api-key` header simultaneously
- **AND** match the behavior of official OpenHands clients

#### Scenario: Include User-Agent header
- **WHEN** making requests to OpenHands API
- **THEN** the system SHALL include a valid `User-Agent` header
- **AND** the User-Agent SHALL match the configured value
- **AND** the User-Agent SHALL appear as a legitimate client

#### Scenario: Include common browser headers
- **WHEN** making requests to OpenHands API
- **THEN** the system SHALL include `Accept-Encoding: gzip, deflate, br`
- **AND** include `Accept-Language: en-US,en;q=0.9`
- **AND** include appropriate `Accept` header based on request type

### Requirement: User-Agent Configuration

The system SHALL support configurable User-Agent strings to match legitimate client behavior and avoid fingerprinting.

#### Scenario: Load User-Agent from config
- **WHEN** the proxy initializes
- **THEN** the system SHALL load the `user_agent` value from config
- **AND** use it for all OpenHands requests
- **AND** fall back to a default if not configured

#### Scenario: Multiple User-Agent rotation
- **WHEN** multiple User-Agent strings are configured
- **THEN** the system SHALL rotate through them randomly
- **AND** distribute requests across different User-Agents
- **AND** reduce detection risk through variation

### Requirement: Budget Reset Prevention

The system SHALL avoid triggering OpenHands' detection mechanisms that cause budget resets to $0.

#### Scenario: Avoid detection patterns
- **WHEN** sending requests to OpenHands
- **THEN** the system SHALL match legitimate client header patterns
- **AND** avoid duplicate authentication headers
- **AND** avoid missing common headers
- **AND** prevent automated budget resets

#### Scenario: Monitor budget after header changes
- **WHEN** request headers are updated
- **THEN** the system SHALL monitor if budget is still being reset
- **AND** log any detection events
- **AND** trigger alerts if budget resets continue
