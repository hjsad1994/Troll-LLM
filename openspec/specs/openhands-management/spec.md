# openhands-management Specification

## Purpose
TBD - created by archiving change add-openhands-collections. Update Purpose after archive.
## Requirements
### Requirement: OpenHands Keys CRUD
The system SHALL provide full CRUD operations for OpenHands keys stored in the `openhands_keys` MongoDB collection, accessible via `/admin/openhands/keys` endpoints.

#### Scenario: List all OpenHands keys
- **WHEN** an admin requests GET `/admin/openhands/keys`
- **THEN** the system returns all keys from `openhands_keys` collection with stats (totalKeys, healthyKeys)

#### Scenario: Create new OpenHands key
- **WHEN** an admin posts to `/admin/openhands/keys` with `{id, apiKey}`
- **THEN** the system creates a new key in `openhands_keys` collection with status 'healthy', tokensUsed 0, requestsCount 0

#### Scenario: Delete OpenHands key
- **WHEN** an admin sends DELETE `/admin/openhands/keys/:id`
- **THEN** the system deletes the key from `openhands_keys` and all associated bindings from `openhands_bindings`

#### Scenario: Reset OpenHands key stats
- **WHEN** an admin posts to `/admin/openhands/keys/:id/reset`
- **THEN** the system resets status to 'healthy', tokensUsed to 0, requestsCount to 0, and clears lastError and cooldownUntil

### Requirement: OpenHands Backup Keys CRUD
The system SHALL provide full CRUD operations for OpenHands backup keys stored in the `openhands_backup_keys` MongoDB collection, accessible via `/admin/openhands/backup-keys` endpoints.

#### Scenario: List all backup keys
- **WHEN** an admin requests GET `/admin/openhands/backup-keys`
- **THEN** the system returns all backup keys from `openhands_backup_keys` collection with stats (total, available, used)

#### Scenario: Create backup key
- **WHEN** an admin posts to `/admin/openhands/backup-keys` with `{id, apiKey}`
- **THEN** the system creates a new backup key in `openhands_backup_keys` collection with isUsed false, activated false

#### Scenario: Delete backup key
- **WHEN** an admin sends DELETE `/admin/openhands/backup-keys/:id`
- **THEN** the system deletes the backup key from `openhands_backup_keys` collection

#### Scenario: Restore backup key
- **WHEN** an admin posts to `/admin/openhands/backup-keys/:id/restore`
- **THEN** the system sets isUsed to false, activated to false, and clears usedFor and usedAt fields

### Requirement: OpenHands Bindings CRUD
The system SHALL provide full CRUD operations for OpenHands key-to-proxy bindings stored in the `openhands_bindings` MongoDB collection, accessible via `/admin/openhands/bindings` endpoints.

#### Scenario: List all bindings
- **WHEN** an admin requests GET `/admin/openhands/bindings`
- **THEN** the system returns all bindings from `openhands_bindings` collection enriched with proxy names and key statuses

#### Scenario: Get bindings for specific proxy
- **WHEN** an admin requests GET `/admin/openhands/bindings/:proxyId`
- **THEN** the system returns all bindings for that proxy from `openhands_bindings` collection sorted by priority

#### Scenario: Create new binding
- **WHEN** an admin posts to `/admin/openhands/bindings` with `{proxyId, openhandsKeyId, priority}`
- **THEN** the system creates a new binding in `openhands_bindings` collection with isActive true

#### Scenario: Update binding
- **WHEN** an admin patches `/admin/openhands/bindings/:proxyId/:keyId` with `{priority?, isActive?}`
- **THEN** the system updates the binding in `openhands_bindings` collection

#### Scenario: Delete binding
- **WHEN** an admin sends DELETE `/admin/openhands/bindings/:proxyId/:keyId`
- **THEN** the system deletes the binding from `openhands_bindings` collection

#### Scenario: Delete all bindings for proxy
- **WHEN** an admin sends DELETE `/admin/openhands/bindings/:proxyId`
- **THEN** the system deletes all bindings for that proxy from `openhands_bindings` collection

### Requirement: Collection Independence
The system SHALL maintain separate `openhands_keys`, `openhands_backup_keys`, and `openhands_bindings` collections that are completely independent from the existing `ohmygpt_keys`, `ohmygpt_backup_keys`, and `ohmygpt_key_bindings` collections.

#### Scenario: Parallel operation
- **WHEN** operations are performed on `openhands_*` collections
- **THEN** the `ohmygpt_*` collections remain unmodified and unaffected

#### Scenario: Stats calculation
- **WHEN** stats are requested for OpenHands keys
- **THEN** the system calculates totalKeys, healthyKeys, totalBindings from `openhands_keys` and `openhands_bindings` collections only

