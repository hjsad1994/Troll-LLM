# ohmygpt-failover-removal Specification

## Purpose

Remove the OhMyGPT failover endpoint feature because API keys are now automatically deleted when they fail (401 invalid, 402 quota exhausted, 403 banned). The failover mechanism is no longer needed since keys are immediately replaced from the backup pool rather than being preserved for endpoint switching.

## REMOVED Requirements

### Requirement: Failover-Enabled Key Flag (REMOVED)

The `enableFailover` field has been removed from OhMyGPT key types.

#### Scenario: Create key without failover field
- **Given** the failover feature has been removed
- **When** an admin creates a new OhMyGPT key via POST `/admin/ohmygpt/keys`
- **Then** the system SHALL create the key WITHOUT an `enableFailover` field
- **And** the key SHALL rotate to backup pool immediately when exhausted

### Requirement: Using Failover Key Status (REMOVED)

The `using_failover` status has been removed from OhMyGPT key status enum.

#### Scenario: Status enum no longer includes using_failover
- **Given** the failover feature has been removed
- **When** inspecting the `OhMyGPTKeyStatus` enum
- **Then** the enum SHALL NOT contain `OhMyGPTStatusUsingFailover`
- **And** valid statuses SHALL be: `healthy`, `rate_limited`, `exhausted`, `error`

#### Scenario: Keys with using_failover status are treated as error
- **Given** a legacy key in MongoDB has `status: "using_failover"`
- **When** `IsAvailable()` is called on the key
- **Then** the method SHALL return `false` (treats unknown status as unavailable)
- **And** the key SHALL not be selected for requests

### Requirement: Failover Endpoint Constants (REMOVED)

The failover endpoint URL constants have been removed from the codebase.

#### Scenario: Only primary endpoints defined
- **Given** the OhMyGPT provider is initialized
- **When** reading endpoint constants
- **Then** `OhMyGPTMessagesEndpoint` SHALL be `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/messages`
- **And** `OhMyGPTCompletionsEndpoint` SHALL be `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/chat/completions`
- **And** `OhMyGPTFailoverBaseURL` SHALL NOT exist
- **And** `OhMyGPTFailoverMessagesEndpoint` SHALL NOT exist
- **And** `OhMyGPTFailoverCompletionsEndpoint` SHALL NOT exist

### Requirement: MarkUsingFailover Method (REMOVED)

The method to mark keys as using failover endpoint has been removed.

#### Scenario: MarkUsingFailover method does not exist
- **Given** the failover feature has been removed
- **When** attempting to call `MarkUsingFailover(keyID)`
- **Then** the method SHALL NOT exist
- **And** the compiler SHALL raise an error if called

### Requirement: CheckAndRotateOnError Simplified (MODIFIED)

The error handler now directly rotates keys without checking failover status.

#### Scenario: Quota error (402) triggers immediate rotation
- **Given** an OhMyGPT key receives HTTP 402 (Payment Required)
- **When** `CheckAndRotateOnError(keyID, 402, body)` is called
- **Then** the system SHALL call `RotateKey(keyID, "quota_exhausted")` directly
- **And** the system SHALL NOT check for `EnableFailover` flag
- **And** the system SHALL NOT check key status before rotation
- **And** the system SHALL log: `🚫 [Troll-LLM] OhMyGPT Key {keyID} error 402, rotating...`

#### Scenario: Permanent block (429) triggers immediate rotation
- **Given** an OhMyGPT key receives HTTP 429 with permanent block indicators
- **When** `CheckAndRotateOnError(keyID, 429, body)` is called
- **And** the error body contains "banned", "blocked", "suspended", or "disabled"
- **Then** the system SHALL call `RotateKey(keyID, "permanent_block")` directly
- **And** the system SHALL NOT call `MarkUsingFailover()`
- **And** the system SHALL log the rotation

#### Scenario: Temporary rate limit (429) still applies cooldown
- **Given** an OhMyGPT key receives HTTP 429
- **When** `CheckAndRotateOnError(keyID, 429, body)` is called
- **And** the error indicates temporary rate limiting (not permanent ban)
- **Then** the system SHALL call `MarkRateLimited(keyID)` (existing behavior)
- **And** the system SHALL apply 2-minute cooldown

### Requirement: ForwardRequest Uses Primary Endpoint Only (MODIFIED)

The request forwarder always uses primary endpoints regardless of key status.

#### Scenario: Forward request always uses primary endpoint
- **Given** any key is selected for a request
- **When** `forwardToEndpoint(OhMyGPTMessagesEndpoint, body, isStreaming)` is called
- **Then** the system SHALL send request to `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg/v1/messages`
- **And** the system SHALL NOT check key status for endpoint selection
- **And** the system SHALL log: `📤 [Troll-LLM] OhMyGPT POST {endpoint} (key={keyID}, ...)`

### Requirement: OhMyGPT Key Type Simplified (MODIFIED)

The `OhMyGPTKey` struct no longer includes failover-related fields.

#### Scenario: OhMyGPTKey struct excludes failover fields
- **Given** the `OhMyGPTKey` type is defined
- **When** inspecting struct fields
- **Then** the struct SHALL NOT contain `EnableFailover bool`
- **And** the struct SHALL NOT contain failover-related bson/json tags

### Requirement: OhMyGPT Backup Key Type Simplified (MODIFIED)

The `OhMyGPTBackupKey` struct no longer includes the `enableFailover` field.

#### Scenario: OhMyGPTBackupKey struct excludes enableFailover field
- **Given** the `OhMyGPTBackupKey` type is defined
- **When** inspecting struct fields
- **Then** the struct SHALL NOT contain `EnableFailover bool`
- **And** the struct SHALL NOT contain failover-related bson/json tags

### Requirement: Admin UI - Failover Controls Removed (REMOVED)

The OhMyGPT keys management pages no longer display failover controls.

#### Scenario: Keys table does not show failover column
- **Given** an admin is viewing `/ohmygpt-keys` page
- **When** the keys table loads
- **Then** the system SHALL NOT display a "Failover" column
- **And** each key row SHALL NOT show failover toggle/indicator

#### Scenario: Add key modal does not include failover option
- **Given** an admin clicks "Add Key" button
- **When** the add key modal opens
- **Then** the modal SHALL NOT include a checkbox/toggle for "Enable Failover"
- **And** the create request SHALL NOT include `enableFailover` field

#### Scenario: Backup keys table does not show failover column
- **Given** an admin is viewing `/ohmygpt-backup-keys` page
- **When** the backup keys table loads
- **Then** the system SHALL NOT display a "Failover" column
- **And** each backup key row SHALL NOT show failover toggle/indicator

### Requirement: API Endpoint - Update Failover Setting (REMOVED)

The backend no longer provides an endpoint to update a key's failover setting.

#### Scenario: PATCH endpoint for failover setting removed
- **Given** the backend API is running
- **When** sending PATCH request to `/admin/ohmygpt/keys/:id`
- **Then** the endpoint SHALL return 404 or 405 (Method Not Allowed)
- **And** failover setting SHALL NOT be modifiable via API

### Requirement: Stats Exclude Failover Status (MODIFIED)

The key statistics endpoint no longer includes failover-related counts.

#### Scenario: Stats response excludes failover count
- **Given** an admin requests GET `/admin/ohmygpt/stats`
- **When** the endpoint returns data
- **Then** the response SHALL NOT include `failoverEnabledKeys` count
- **And** the response SHALL include: `totalKeys`, `healthyKeys`

#### Scenario: Backup keys stats exclude failover count
- **Given** an admin requests GET `/admin/ohmygpt/backup-keys/stats`
- **When** the endpoint returns data
- **Then** the response SHALL NOT include `failoverEnabledCount`

### Requirement: RotateKey Does Not Preserve Failover Setting (MODIFIED)

When a key is rotated via `RotateKey()`, the new replacement key does not inherit failover settings.

#### Scenario: Rotate key creates new key without failover field
- **Given** a failed key is being rotated
- **When** `RotateKey(failedKeyID, reason)` is called
- **Then** the system SHALL insert the new key WITHOUT `enableFailover` field
- **And** the new key document SHALL NOT contain `enableFailover`
- **And** the system SHALL NOT log failover inheritance messages

### Requirement: Backup Key Creation Simplified (MODIFIED)

OhMyGPT backup keys are created without the failover capability field.

#### Scenario: Create backup key without failover field
- **Given** an admin creates a new OhMyGPT backup key via POST `/admin/ohmygpt/backup-keys`
- **When** the request body is processed
- **Then** the system SHALL create the backup key WITHOUT `enableFailover` field
- **And** when this backup key is activated, the new key SHALL NOT have failover capability

### Requirement: Reset Key Behavior Unchanged (MODIFIED)

When admin resets a key, failover setting is not preserved because it no longer exists.

#### Scenario: Reset key only resets to healthy
- **Given** a key has any status (including legacy `using_failover`)
- **When** admin sends POST `/admin/ohmygpt/keys/:id/reset`
- **Then** the system SHALL set `status: "healthy"`
- **And** the system SHALL clear `lastError`
- **And** the system SHALL clear `cooldownUntil`
- **And** the system SHALL NOT preserve any failover setting
- **And** the key SHALL use primary endpoint on next request
