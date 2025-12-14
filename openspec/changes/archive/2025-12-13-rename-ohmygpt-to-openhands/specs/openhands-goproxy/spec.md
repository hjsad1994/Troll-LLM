# openhands-goproxy Specification

## Purpose
Define the Go proxy internal package structure and naming conventions for OpenHands key pool management. This renames the internal package from `ohmygpt` to `openhands` while preserving all functionality including key rotation and backup key activation logic.

## MODIFIED Requirements

### Requirement: OpenHands Package Structure
The Go proxy SHALL use `internal/openhands` package for OpenHands key pool management.

#### Scenario: Package declaration
- **WHEN** Go files in the package are compiled
- **THEN** package declaration SHALL be `package openhands`
- **AND** directory path SHALL be `goproxy/internal/openhands/`

#### Scenario: Import path
- **WHEN** main.go or other files import the package
- **THEN** import SHALL be `"goproxy/internal/openhands"`
- **AND** usage SHALL be `openhands.GetPool()`, `openhands.SelectKey()`, etc.

### Requirement: OpenHands Pool Initialization
The system SHALL initialize OpenHands key pool from MongoDB on startup and reload.

#### Scenario: Package files
- **WHEN** package is structured
- **THEN** SHALL contain files: `openhands.go`, `backup.go`, `types.go`, `registry.go`
- **AND** each file SHALL use `package openhands` declaration

#### Scenario: Log messages
- **WHEN** Go proxy logs OpenHands operations
- **THEN** log messages SHALL reference "OpenHands" instead of "OhmyGPT"
- **EXAMPLE**: `"✅ [OpenHands] Loaded X keys"`, `"❌ [OpenHands] No healthy keys available"`

### Requirement: Backup Key Rotation Logic Preservation
The system SHALL preserve existing backup key auto-rotation logic when renaming package.

#### Scenario: Backup key activation
- **WHEN** an OpenHands key fails with 401/402/403 error
- **THEN** system SHALL automatically activate an available backup key
- **AND** mark backup key as `isUsed: true` with `usedFor: <failed-key-id>`
- **AND** logic SHALL remain unchanged from ohmygpt implementation

#### Scenario: Key selection from pool
- **WHEN** proxy needs to select OpenHands key for request
- **THEN** system SHALL call `openhands.GetPool().SelectKey()`
- **AND** selection logic SHALL remain unchanged

## ADDED Requirements

### Requirement: MongoDB Collection Names
The system SHALL continue using existing MongoDB collection names for OpenHands keys and backups.

#### Scenario: Collections used
- **WHEN** Go proxy queries MongoDB
- **THEN** SHALL query collections that store OpenHands keys and backup keys
- **AND** collection names MAY remain as-is or be renamed (implementation decision)

#### Scenario: Binding field names
- **WHEN** Go proxy reads bindings from MongoDB
- **THEN** SHALL read `openhandsKeyId` field from bindings collection
- **AND** support backward compatible field names if needed during migration
