# ohmygpt-failover-endpoint Specification

## Purpose
TBD - created by archiving change add-ohmygpt-failover-endpoint-archived. Update Purpose after archive.
## Requirements
### Requirement: Failover-Enabled Key Flag

OhMyGPT keys SHALL have an `enableFailover` boolean field that indicates whether the key should use failover endpoint when encountering quota/block errors.

#### Scenario: Create key with failover disabled by default
- **Given** an admin creates a new OhMyGPT key via POST `/admin/ohmygpt/keys`
- **When** the request body does not include `enableFailover` field
- **Then** the system SHALL create the key with `enableFailover: false`
- **And** the key SHALL use existing rotation behavior when exhausted

#### Scenario: Create key with failover enabled
- **Given** an admin creates a new OhMyGPT key via POST `/admin/ohmygpt/keys`
- **When** the request body includes `enableFailover: true`
- **Then** the system SHALL create the key with `enableFailover: true`
- **And** the key SHALL use failover endpoint when quota exhausted

#### Scenario: Update key failover setting
- **Given** an existing OhMyGPT key with `enableFailover: false`
- **When** admin sends PATCH `/admin/ohmygpt/keys/:id` with `{ enableFailover: true }`
- **Then** the system SHALL update the key's `enableFailover` to `true`
- **And** the system SHALL return the updated key object
- **And** the key SHALL be eligible for failover on next error

### Requirement: Using Failover Key Status

OhMyGPT keys SHALL have a new status `using_failover` that indicates the key is currently operating on the backup endpoint.

#### Scenario: Mark key as using_failover on quota error
- **Given** a failover-enabled key (`enableFailover: true`) receives HTTP 402 (Payment Required)
- **When** `CheckAndRotateOnError()` is called
- **Then** the system SHALL NOT rotate the key
- **And** the system SHALL set `status: "using_failover"`
- **And** the system SHALL set `lastError: "Switched to backup endpoint - quota exhausted"`
- **And** the system SHALL update MongoDB
- **And** the system SHALL log: `🔄 [Troll-LLM] OhMyGPT Key {keyID} switched to failover endpoint`

#### Scenario: Mark key as using_failover on permanent block
- **Given** a failover-enabled key (`enableFailover: true`) receives HTTP 429 that indicates permanent blocking (not temporary rate limit)
- **When** the error body contains "banned", "blocked", "suspended", or similar permanent error indicators
- **Then** the system SHALL NOT apply rate limit cooldown
- **And** the system SHALL set `status: "using_failover"`
- **And** the system SHALL log: `🔄 [Troll-LLM] OhMyGPT Key {keyID} switched to failover endpoint (permanent block)`

#### Scenario: IsAvailable returns true for using_failover keys
- **Given** a key has `status: "using_failover"`
- **When** `IsAvailable()` is called on the key
- **Then** the method SHALL return `true`
- **And** the key SHALL be selectable for requests

### Requirement: Failover Endpoint Constants

The system SHALL define hardcoded backup endpoint URLs for both Anthropic and OpenAI formats.

#### Scenario: Primary and backup endpoints defined
- **Given** the OhMyGPT provider is initialized
- **When** reading endpoint constants
- **Then** `OhMyGPTMessagesEndpoint` SHALL be `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/messages`
- **And** `OhMyGPTCompletionsEndpoint` SHALL be `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/chat/completions`
- **And** `OhMyGPTFailoverMessagesEndpoint` SHALL be `https://c-z0-api-01.hash070.com/v1/messages`
- **And** `OhMyGPTFailoverCompletionsEndpoint` SHALL be `https://c-z0-api-01.hash070.com/chat/completions`

#### Scenario: Endpoint selection based on key status
- **Given** a key with `status: "using_failover"` is selected
- **When** `forwardToEndpoint()` is called with Anthropic format request
- **Then** the system SHALL use `OhMyGPTFailoverMessagesEndpoint`
- **And** when called with OpenAI format request
- **Then** the system SHALL use `OhMyGPTFailoverCompletionsEndpoint`

### Requirement: ForwardRequest With Failover Endpoint

The `forwardToEndpoint()` method SHALL select the appropriate endpoint based on the key's current status.

#### Scenario: Forward request with healthy key uses primary endpoint
- **Given** a key with `status: "healthy"` is selected
- **When** `forwardToEndpoint(OhMyGPTMessagesEndpoint, body, isStreaming)` is called
- **Then** the system SHALL send request to `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/messages`
- **And** the system SHALL log: `📤 [Troll-LLM] OhMyGPT POST {endpoint} (key={keyID}, primary, stream={isStreaming})`

#### Scenario: Forward request with using_failover key uses backup endpoint
- **Given** a key with `status: "using_failover"` is selected
- **When** `forwardToEndpoint(OhMyGPTMessagesEndpoint, body, isStreaming)` is called
- **Then** the system SHALL send request to `https://c-z0-api-01.hash070.com/v1/messages`
- **And** the system SHALL log: `📤 [Troll-LLM] OhMyGPT POST {endpoint} (key={keyID}, FAILOVER, stream={isStreaming})`

### Requirement: CheckAndRotateOnError With Failover Logic

The error handler SHALL check `enableFailover` flag and current status before deciding to rotate or fail over.

#### Scenario: Quota error (402) with failover-enabled healthy key
- **Given** a key with `enableFailover: true` and `status: "healthy"` receives HTTP 402
- **When** `CheckAndRotateOnError(keyID, 402, body)` is called
- **Then** the system SHALL check the key's current status
- **And** since status is `healthy`, SHALL call `MarkUsingFailover(keyID)`
- **And** the system SHALL NOT delete the key or rotate to backup pool
- **And** the system SHALL log: `🔄 [Troll-LLM] OhMyGPT Key {keyID} switched to failover endpoint (quota exhausted)`

#### Scenario: Quota error (402) with key already using failover
- **Given** a key with `enableFailover: true` and `status: "using_failover"` receives HTTP 402
- **When** `CheckAndRotateOnError(keyID, 402, body)` is called
- **Then** the system SHALL check the key's current status
- **And** since status is already `using_failover`, SHALL call `RotateKey(keyID, "quota_exhausted_on_failover")`
- **And** the system SHALL replace the key with a backup key from ohmygpt_backup_keys pool
- **And** the new key SHALL be created with `enableFailover: true` (inherited from old key)
- **And** the new key SHALL start with `status: "healthy"` (primary endpoint)
- **And** the system SHALL log: `🔄 [Troll-LLM] OhMyGPT Key {keyID} exhausted on failover, rotating to backup key`

#### Scenario: Permanent block (429) with key already using failover
- **Given** a key with `enableFailover: true` and `status: "using_failover"` receives HTTP 429
- **When** `CheckAndRotateOnError(keyID, 429, body)` is called
- **And** the error body contains permanent block indicators
- **Then** the system SHALL call `RotateKey(keyID, "blocked_on_failover")`
- **And** the system SHALL replace the key with a backup key from ohmygpt_backup_keys pool
- **And** the new key SHALL inherit `enableFailover: true`
- **And** the system SHALL log: `🔄 [Troll-LLM] OhMyGPT Key {keyID} blocked on failover, rotating to backup key`

#### Scenario: Rate limit (429) with failover-enabled key
- **Given** a key with `enableFailover: true` receives HTTP 429
- **When** `CheckAndRotateOnError(keyID, 429, body)` is called
- **And** the error indicates temporary rate limiting (not permanent ban)
- **Then** the system SHALL call `MarkRateLimited(keyID)` (existing behavior)
- **And** the system SHALL NOT switch to failover endpoint
- **And** the system SHALL apply 2-minute cooldown

#### Scenario: Permanent block (429) with failover-enabled key
- **Given** a key with `enableFailover: true` receives HTTP 429
- **When** `CheckAndRotateOnError(keyID, 429, body)` is called
- **And** the error body contains "banned", "blocked", "suspended", or "disabled"
- **Then** the system SHALL call `MarkUsingFailover(keyID)`
- **And** the system SHALL NOT apply cooldown
- **And** the system SHALL log permanent block detection

#### Scenario: Error with non-failover key (existing behavior)
- **Given** a key with `enableFailover: false` receives HTTP 402 or 429
- **When** `CheckAndRotateOnError(keyID, statusCode, body)` is called
- **Then** the system SHALL use existing rotation logic
- **And** SHALL mark key as `exhausted` or `rate_limited`
- **And** SHALL rotate to backup key if available

### Requirement: OhMyGPT Key Type Updates

The `OhMyGPTKey` struct SHALL include new fields for failover support.

#### Scenario: OhMyGPTKey struct includes failover fields
- **Given** the `OhMyGPTKey` type is defined
- **When** inspecting struct fields
- **Then** the struct SHALL contain:
  - `EnableFailover bool` with bson tag `enableFailover` and json tag `enable_failover`
  - `Status` SHALL accept new value `OhMyGPTStatusUsingFailover = "using_failover"`
  - `UsingFailover bool` with bson tag `usingFailover` and json tag `using_failover` (derived from status)

#### Scenario: MongoDB schema includes enableFailover field
- **Given** a new OhMyGPT key document is created
- **When** querying the `ohmygpt_keys` collection
- **Then** documents SHALL include `enableFailover` boolean field
- **And** documents SHALL include `status` field accepting "healthy", "rate_limited", "exhausted", "error", "using_failover"

### Requirement: OhMyGPT Backup Key Type Updates

The `OhMyGPTBackupKey` struct SHALL include `enableFailover` field to pre-configure failover capability.

#### Scenario: OhMyGPTBackupKey struct includes enableFailover field
- **Given** the `OhMyGPTBackupKey` type is defined
- **When** inspecting struct fields
- **Then** the struct SHALL contain:
  - `EnableFailover bool` with bson tag `enableFailover` and json tag `enable_failover`
- **And** the field SHALL default to `false`

#### Scenario: MongoDB backup keys schema includes enableFailover
- **Given** a new OhMyGPT backup key document is created
- **When** querying the `ohmygpt_backup_keys` collection
- **Then** documents SHALL include `enableFailover` boolean field
- **And** existing documents without the field SHALL default to `false`

### Requirement: MarkUsingFailover Method

The provider SHALL have a method to mark a key as using failover endpoint.

#### Scenario: MarkUsingFailover updates status and logs
- **Given** a key is currently `status: "healthy"` or `status: "rate_limited"`
- **When** `MarkUsingFailover(keyID)` is called
- **Then** the system SHALL set `key.Status = OhMyGPTStatusUsingFailover`
- **And** the system SHALL set `key.LastError = "Switched to backup endpoint"`
- **And** the system SHALL set `key.CooldownUntil = nil`
- **And** the system SHALL update MongoDB async via `updateKeyStatus()`
- **And** the system SHALL log: `🔄 [Troll-LLM] OhMyGPT Key {keyID} switched to failover endpoint`

### Requirement: Admin UI - Failover Toggle

The OhMyGPT keys management page SHALL allow admin to toggle failover setting for each key.

#### Scenario: Display failover status in keys table
- **Given** an admin is viewing `/ohmygpt-keys` page
- **When** the keys table loads
- **Then** the system SHALL display a "Failover" column
- **And** each key SHALL show indicator: "Enabled" or "Disabled"
- **And** failover-enabled keys SHALL have special badge/indicator

#### Scenario: Toggle failover via switch/button
- **Given** an admin is on the OhMyGPT keys page
- **When** clicking the failover toggle for a key
- **Then** the system SHALL send PATCH `/admin/ohmygpt/keys/:id` with `{ enableFailover: true/false }`
- **And** on success, SHALL show success toast and update the display
- **And** on error, SHALL show error toast

#### Scenario: Add key modal includes failover option
- **Given** an admin clicks "Add Key" button
- **When** the add key modal opens
- **Then** the modal SHALL include a checkbox/toggle for "Enable Failover"
- **And** the checkbox SHALL be unchecked by default
- **And** when checked, SHALL include `enableFailover: true` in create request

### Requirement: API Endpoint - Update Failover Setting

The backend SHALL provide an endpoint to update a key's failover setting.

#### Scenario: PATCH endpoint for failover setting
- **Given** the backend API is running
- **When** sending PATCH request to `/admin/ohmygpt/keys/:id`
- **And** request body contains `{ enableFailover: true }`
- **Then** the system SHALL validate the input
- **And** SHALL update the key in MongoDB
- **And** SHALL return 200 with updated key object
- **And** on validation error, SHALL return 400
- **And** if key not found, SHALL return 404

### Requirement: Stats Include Failover Status

The key statistics endpoint SHALL include count of failover-enabled keys.

#### Scenario: Stats response includes failover count
- **Given** an admin requests GET `/admin/ohmygpt/stats`
- **When** the endpoint returns data
- **Then** the response SHALL include `failoverEnabledKeys` count
- **And** the count SHALL reflect keys with `enableFailover: true`

### Requirement: Backward Compatibility

The failover feature SHALL not break existing functionality for keys without failover enabled.

#### Scenario: Existing keys without enableFailover field
- **Given** existing OhMyGPT keys in MongoDB without `enableFailover` field
- **When** keys are loaded via `LoadKeys()`
- **Then** the system SHALL default `EnableFailover` to `false`
- **And** keys SHALL continue using existing rotation behavior
- **And** no migration SHALL be required

#### Scenario: Existing rotation behavior unchanged
- **Given** a key with `enableFailover: false` receives quota error
- **When** `CheckAndRotateOnError()` is called
- **Then** the system SHALL use existing `MarkExhausted()` and rotation logic
- **And** the system SHALL NOT switch to failover endpoint
- **And** the system SHALL attempt to rotate to backup key pool

### Requirement: Reset Key With Failover Status

When admin resets a key with `using_failover` status, it SHALL return to `healthy` using primary endpoint.

#### Scenario: Reset key using failover returns to primary
- **Given** a key has `status: "using_failover"`
- **When** admin sends POST `/admin/ohmygpt/keys/:id/reset`
- **Then** the system SHALL set `status: "healthy"`
- **And** the system SHALL clear `lastError`
- **And** the system SHALL clear `cooldownUntil`
- **And** the key SHALL use primary endpoint on next request
- **And** `enableFailover` setting SHALL be preserved

### Requirement: RotateKey Preserves Failover Setting

When a key is rotated via `RotateKey()`, the new replacement key SHALL inherit the `enableFailover` setting from the failed key.

#### Scenario: Rotate failover-enabled key preserves setting
- **Given** a failed key has `enableFailover: true`
- **When** `RotateKey(failedKeyID, reason)` is called
- **Then** the system SHALL read the failed key's `enableFailover` value
- **And** the system SHALL insert the new key with `enableFailover: true`
- **And** the new key document SHALL include `enableFailover: true`
- **And** the system SHALL log: `✅ [OhMyGPT/Rotation] New key inherits enableFailover=true`

#### Scenario: Rotate non-failover key preserves setting
- **Given** a failed key has `enableFailover: false` or field not set
- **When** `RotateKey(failedKeyID, reason)` is called
- **Then** the system SHALL insert the new key with `enableFailover: false`
- **And** the new key SHALL NOT use failover endpoint when exhausted

### Requirement: Backup Key Failover Configuration

OhMyGPT backup keys SHALL support `enableFailover` field that determines whether the key will use failover endpoint when activated.

#### Scenario: Create backup key with failover disabled by default
- **Given** an admin creates a new OhMyGPT backup key via POST `/admin/ohmygpt/backup-keys`
- **When** the request body does not include `enableFailover` field
- **Then** the system SHALL create the backup key with `enableFailover: false`
- **And** when this backup key is activated, the new key SHALL NOT have failover capability

#### Scenario: Create backup key with failover enabled
- **Given** an admin creates a new OhMyGPT backup key via POST `/admin/ohmygpt/backup-keys`
- **When** the request body includes `enableFailover: true`
- **Then** the system SHALL create the backup key with `enableFailover: true`
- **And** when this backup key is activated via `RotateKey()`, the new key SHALL inherit `enableFailover: true`

#### Scenario: Update backup key failover setting
- **Given** an existing OhMyGPT backup key with `enableFailover: false`
- **When** admin sends PATCH `/admin/ohmygpt/backup-keys/:id` with `{ enableFailover: true }`
- **Then** the system SHALL update the backup key's `enableFailover` to `true`
- **And** the system SHALL return the updated backup key object

#### Scenario: Backup key inherits enableFailover on activation
- **Given** a backup key exists with `enableFailover: true`
- **And** a primary key fails and triggers `RotateKey()`
- **When** `RotateKey()` selects this backup key for activation
- **Then** the system SHALL read the backup key's `enableFailover` value
- **And** the system SHALL create the new key with `enableFailover: true` (inherited from backup key)
- **And** the system SHALL log: `✅ [OhMyGPT/Rotation] New key inherits enableFailover=true from backup key {backupKeyID}`

#### Scenario: Backup keys list includes failover status
- **Given** an admin requests GET `/admin/ohmygpt/backup-keys`
- **When** the endpoint returns data
- **Then** each backup key object SHALL include `enableFailover` boolean field
- **And** the stats SHALL include `failoverEnabledCount` count

### Requirement: Backup Keys UI - Failover Toggle

The OhMyGPT backup keys management page SHALL allow admin to toggle failover setting for each backup key.

#### Scenario: Display failover status in backup keys table
- **Given** an admin is viewing `/ohmygpt-backup-keys` page
- **When** the backup keys table loads
- **Then** the system SHALL display a "Failover" column
- **And** each backup key SHALL show indicator: "Enabled" or "Disabled"
- **And** failover-enabled backup keys SHALL have special badge/indicator

#### Scenario: Toggle backup key failover via switch/button
- **Given** an admin is on the OhMyGPT backup keys page
- **When** clicking the failover toggle for a backup key
- **Then** the system SHALL send PATCH `/admin/ohmygpt/backup-keys/:id` with `{ enableFailover: true/false }`
- **And** on success, SHALL show success toast and update the display

#### Scenario: Add backup key modal includes failover option
- **Given** an admin clicks "Add Backup Key" button
- **When** the add backup key modal opens
- **Then** the modal SHALL include a checkbox/toggle for "Enable Failover"
- **And** the checkbox SHALL be unchecked by default
- **And** when checked, SHALL include `enableFailover: true` in create request

#### Scenario: Backup key stats include failover count
- **Given** an admin is viewing `/ohmygpt-backup-keys` page
- **When** the page loads
- **Then** the system SHALL display an additional stat card: "Failover Enabled"
- **And** the stat SHALL show count of backup keys with `enableFailover: true`

