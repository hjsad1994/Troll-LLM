# OhmyGPT Backup Keys Specification

## ADDED Requirements

### Requirement: OhmyGPT Backup Keys Storage
The system SHALL store OhmyGPT backup keys in MongoDB collection `ohmygpt_backup_keys` with the following schema:
- `_id`: Unique key identifier (string)
- `apiKey`: The actual OhmyGPT API key (string)
- `isUsed`: Whether the key has been used for rotation (boolean)
- `activated`: Whether the key has been moved to active pool (boolean)
- `usedFor`: ID of the failed key this backup replaced (string, optional)
- `usedAt`: Timestamp when the key was used (datetime, optional)
- `createdAt`: Timestamp when the backup key was created (datetime)

#### Scenario: Store new backup key
- **WHEN** admin adds a new backup key via API
- **THEN** system stores the key with `isUsed: false` and `activated: false`
- **AND** `createdAt` is set to current timestamp

### Requirement: OhmyGPT Backup Keys API
The system SHALL provide REST API endpoints for managing OhmyGPT backup keys:
- `GET /admin/ohmygpt/backup-keys` - List all backup keys with stats
- `POST /admin/ohmygpt/backup-keys` - Create new backup key
- `DELETE /admin/ohmygpt/backup-keys/:id` - Delete backup key
- `POST /admin/ohmygpt/backup-keys/:id/restore` - Restore used key back to available

#### Scenario: List backup keys
- **WHEN** admin requests GET /admin/ohmygpt/backup-keys
- **THEN** system returns list of backup keys with masked API keys
- **AND** includes stats: total, available (isUsed: false), used (isUsed: true)

#### Scenario: Add backup key
- **WHEN** admin POSTs new backup key with id and apiKey
- **THEN** system validates the key format
- **AND** stores the key in `ohmygpt_backup_keys` collection
- **AND** returns success response

#### Scenario: Delete backup key
- **WHEN** admin DELETEs a backup key by id
- **THEN** system removes the key from `ohmygpt_backup_keys` collection

### Requirement: OhmyGPT Key Rotation
The system SHALL automatically rotate failed OhmyGPT keys using backup keys when available.

The rotation process:
1. Detect key failure (quota exhausted, permanent rate limit, invalid key)
2. Find available backup key (isUsed: false)
3. Remove failed key from `ohmygpt_keys` collection
4. Insert backup key into `ohmygpt_keys` collection
5. Update proxy binding to use new key
6. Mark backup key as used (isUsed: true, activated: true, usedFor: failedKeyID)
7. Reload in-memory key pool

#### Scenario: Automatic rotation on key failure
- **WHEN** OhmyGPT key fails with quota exhausted (402) or invalid key (401)
- **AND** backup keys are available
- **THEN** system automatically rotates to backup key
- **AND** logs rotation event
- **AND** service continues without interruption

#### Scenario: No backup keys available
- **WHEN** OhmyGPT key fails
- **AND** no backup keys are available
- **THEN** system marks the key as exhausted
- **AND** logs warning about no backup keys
- **AND** continues with remaining keys (if any)

### Requirement: Admin UI for Backup Keys
The admin bindings page SHALL include a section for managing OhmyGPT backup keys with:
- Stats cards showing Total, Available, and Used counts
- Table listing all backup keys with masked API keys
- Add button to create new backup key
- Delete button to remove backup key
- Restore button to move used key back to available pool

#### Scenario: View backup keys in admin
- **WHEN** admin visits /admin/bindings page
- **THEN** OhmyGPT Backup Keys section is visible
- **AND** shows current stats and key list

#### Scenario: Add backup key via UI
- **WHEN** admin clicks Add button and fills form
- **THEN** new backup key is created
- **AND** table updates to show new key
