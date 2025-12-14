## MODIFIED Requirements

### Requirement: OpenHands Key Pool Management
The system SHALL support multiple OpenHands API keys with round-robin rotation and health monitoring, stored in MongoDB `openhands_keys` collection.

#### Scenario: Load OpenHands keys from MongoDB
- **WHEN** the server starts with `upstream: "openhands"` models configured
- **THEN** all keys from `openhands_keys` collection SHALL be loaded into the pool
- **AND** keys with status "healthy" SHALL be available for selection

#### Scenario: Round-robin key selection
- **WHEN** a request needs an OpenHands API key
- **THEN** the system SHALL select the next healthy key in rotation order
- **AND** skip keys with status "rate_limited", "exhausted", or "error"

#### Scenario: No healthy OpenHands keys available
- **WHEN** all OpenHands keys are unhealthy
- **THEN** the system SHALL return HTTP 503 Service Unavailable
- **AND** response SHALL include error "No healthy OpenHands keys available"
- **AND** error message SHALL NOT reference legacy "ohmygpt" naming

---

### Requirement: OpenHands Key Rotation
The system SHALL automatically rotate failed OpenHands keys using backup keys from `openhands_backup_keys` collection.

#### Scenario: Rotate key with backup available
- **WHEN** an OpenHands key needs rotation
- **AND** `openhands_backup_keys` has unused keys (`isUsed: false`)
- **THEN** the failed key SHALL be deleted from `openhands_keys`
- **AND** a backup key SHALL be inserted into `openhands_keys` with status "healthy"
- **AND** the backup key SHALL be marked as `isUsed: true`

#### Scenario: Rotation without backup
- **WHEN** an OpenHands key needs rotation
- **AND** no backup keys are available
- **THEN** the failed key SHALL be marked as "exhausted"
- **AND** a warning SHALL be logged

#### Scenario: Key bindings use openhands collection
- **WHEN** rotating a key with proxy bindings
- **THEN** bindings SHALL be read from `openhands_bindings` collection
- **AND** new bindings SHALL be written to `openhands_bindings` collection
