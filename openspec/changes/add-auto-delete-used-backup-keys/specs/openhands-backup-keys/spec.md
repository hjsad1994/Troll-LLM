# OpenHands Backup Keys Management

## ADDED Requirements

### Requirement: Auto-Delete Used Backup Keys
The system SHALL automatically delete backup keys from `openhands_backup_keys` collection when:
- The key has `isUsed: true` (has been activated for rotation)
- The key's `usedAt` timestamp is older than 24 hours

The cleanup process SHALL run periodically (every hour) as a background job.

#### Scenario: Used key older than 24 hours is deleted
- **WHEN** a backup key has `isUsed: true` AND `usedAt` is more than 24 hours ago
- **THEN** the system deletes the key from the database
- **AND** logs the deletion event with key ID

#### Scenario: Used key within 24 hours is retained
- **WHEN** a backup key has `isUsed: true` AND `usedAt` is less than 24 hours ago
- **THEN** the system retains the key in the database
- **AND** the key remains visible in admin UI with deletion countdown

#### Scenario: Unused keys are never auto-deleted
- **WHEN** a backup key has `isUsed: false`
- **THEN** the system never auto-deletes the key regardless of age

### Requirement: Deletion Time Display
The admin UI SHALL display the scheduled deletion time for used backup keys.

#### Scenario: Show deletion countdown for used keys
- **WHEN** an admin views the backup keys list
- **AND** a key has `isUsed: true`
- **THEN** the UI shows "Deletes in X hours" indicator
- **AND** the countdown is calculated as `usedAt + 24h - now`

#### Scenario: No deletion indicator for available keys
- **WHEN** an admin views the backup keys list
- **AND** a key has `isUsed: false`
- **THEN** no deletion indicator is shown
