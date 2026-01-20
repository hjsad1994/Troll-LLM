# ohmygpt-auto-recovery Specification

## Purpose

Automatically recover OhMyGPT API keys from rate-limited status after their cooldown period expires, eliminating the need for manual admin intervention.

## ADDED Requirements

### Requirement: Rate Limit Cooldown Duration

When an OhMyGPT API key is rate-limited by the upstream provider, the system SHALL set a cooldown duration of **2 minutes** before the key can automatically recover.

#### Scenario: Mark key as rate-limited with 2-minute cooldown
- **Given** an OhMyGPT API key receives a 429 response from upstream
- **When** the `MarkRateLimited(keyID)` method is called
- **Then** the system SHALL set the key status to `rate_limited`
- **And** the system SHALL set `cooldownUntil` to `now + 2 minutes`
- **And** the system SHALL update the key in MongoDB with status and cooldown
- **And** the system SHALL log: `⚠️ [Troll-LLM] OhMyGPT Key {keyID} rate limited (cooldown: 2m0s)`

### Requirement: Auto-Recovery Background Service

The system SHALL run a background service that periodically checks for rate-limited keys with expired cooldowns and automatically resets them to healthy status.

#### Scenario: Start auto-recovery service on provider initialization
- **Given** the OhMyGPT provider is being configured via `ConfigureOhMyGPT()`
- **When** initialization completes successfully
- **Then** the system SHALL start a background goroutine for auto-recovery
- **And** the service SHALL check for expired cooldowns every 30 seconds
- **And** the system SHALL log: `🔄 [Troll-LLM] OhMyGPT Auto-recovery service started (interval: 30s)`

#### Scenario: Auto-recover rate-limited keys with expired cooldowns
- **Given** the auto-recovery service is running
- **And** one or more keys have `status: "rate_limited"`
- **And** at least one key has `cooldownUntil < now`
- **When** the recovery check executes (every 30 seconds)
- **Then** the system SHALL query MongoDB for keys where:
  - `status = "rate_limited"`
  - `cooldownUntil < now`
- **And** the system SHALL update all matching keys to:
  - `status: "healthy"`
  - `lastError: ""`
  - `cooldownUntil: null`
- **And** the system SHALL update the in-memory key objects to match
- **And** the system SHALL log for each recovered key: `✅ [Troll-LLM] OhMyGPT Auto-recovered key {keyID} from rate_limited`
- **And** the system SHALL log summary: `🔄 [Troll-LLM] OhMyGPT Auto-recovered {count} keys in {duration}ms`

#### Scenario: No keys require recovery
- **Given** the auto-recovery service is running
- **And** no keys have expired cooldowns
- **When** the recovery check executes
- **Then** the system SHALL skip database updates
- **And** the system SHALL NOT log recovery actions
- **And** the service SHALL sleep until next interval

#### Scenario: Handle database errors during recovery
- **Given** the auto-recovery service is running
- **And** MongoDB query or update fails
- **When** the database error occurs
- **Then** the system SHALL log the error: `⚠️ [Troll-LLM] OhMyGPT Auto-recovery failed: {error}`
- **And** the service SHALL continue running and retry next interval
- **And** the system SHALL NOT crash or stop the background goroutine

### Requirement: Cooldown Expiry Availability

A key in `rate_limited` status SHALL become available for selection immediately after its cooldown expires, even before the next auto-recovery cycle runs.

#### Scenario: Key available after cooldown expires (before recovery)
- **Given** a key has `status: "rate_limited"`
- **And** `cooldownUntil` was set to 2 minutes ago
- **When** `IsAvailable()` is called on the key
- **Then** the method SHALL return `true`
- **And** the key SHALL be selectable by `SelectKey()`
- **And** the key SHALL be used for the next request
- **Note:** The status remains `rate_limited` until auto-recovery runs, but the key is functional

### Requirement: In-Memory Synchronization

When keys are auto-recovered in MongoDB, the in-memory key pool SHALL be updated to reflect the recovered status.

#### Scenario: Sync in-memory keys after database recovery
- **Given** auto-recovery service updates keys in MongoDB
- **And** the provider has N keys loaded in memory
- **When** database update succeeds
- **Then** the system SHALL acquire `p.mu` lock
- **And** the system SHALL update matching in-memory key objects:
  - `key.Status = OhMyGPTStatusHealthy`
  - `key.LastError = ""`
  - `key.CooldownUntil = nil`
- **And** the system SHALL release the lock
- **And** the next call to `GetStats()` SHALL show increased `healthy` count

#### Scenario: Multiple keys recovered in batch
- **Given** 5 keys are rate-limited with expired cooldowns
- **When** auto-recovery service executes
- **Then** the system SHALL update all 5 keys in a single MongoDB `UpdateMany` operation
- **And** the system SHALL update all 5 keys in memory
- **And** the system SHALL log 5 recovery messages
- **And** `GetStats()` SHALL show all 5 keys as `healthy`

### Requirement: Idempotent Recovery Operations

The auto-recovery service SHALL be idempotent, handling concurrent executions safely without duplicate updates or errors.

#### Scenario: Concurrent recovery attempts on same key
- **Given** a key has expired cooldown and is being recovered
- **And** the recovery service runs while another process also tries to recover the key
- **When** both processes attempt to update the key to `healthy`
- **Then** the system SHALL complete both updates successfully
- **And** the key status SHALL be `healthy`
- **And** the system SHALL NOT log errors or create duplicate records
- **And** the key SHALL remain available in the pool

#### Scenario: Key already healthy when recovery runs
- **Given** a key is already `status: "healthy"`
- **And** the auto-recovery service queries for expired cooldowns
- **When** the query executes
- **Then** the key SHALL NOT match the query (status is not `rate_limited`)
- **And** the key SHALL NOT be updated
- **And** no logs SHALL be generated for this key

### Requirement: Configuration Constants

Auto-recovery timing and cooldown duration SHALL be configurable via constants in the OhMyGPT provider.

#### Scenario: Configure cooldown and check interval
- **Given** the OhMyGPT provider is initialized
- **When** reading configuration constants
- **Then** `RateLimitCooldownDuration` SHALL be `2 * time.Minute`
- **And** `AutoRecoveryCheckInterval` SHALL be `30 * time.Second`
- **And** these constants SHALL be used in `MarkRateLimited()` and auto-recovery loop

### Requirement: Graceful Shutdown

The auto-recovery service SHALL handle graceful shutdown without causing race conditions or incomplete updates.

#### Scenario: Stop auto-recovery service on shutdown
- **Given** the auto-recovery service is running
- **When** the application receives shutdown signal
- **Then** the service SHALL complete current recovery cycle
- **And** the service SHALL exit the goroutine cleanly
- **And** the service SHALL NOT start new recovery cycles
- **And** in-memory locks SHALL be released

### Requirement: Observability and Logging

All auto-recovery operations SHALL be logged with sufficient detail for monitoring and debugging.

#### Scenario: Log recovery service lifecycle
- **Given** the auto-recovery service starts
- **When** `StartAutoRecovery()` is called
- **Then** the system SHALL log: `🔄 [Troll-LLM] OhMyGPT Auto-recovery service started (interval: {interval})`
- **And** when the service stops (if applicable), log: `🛑 [Troll-LLM] OhMyGPT Auto-recovery service stopped`

#### Scenario: Log detailed recovery metrics
- **Given** auto-recovery service recovers keys
- **When** recovery cycle completes
- **Then** the system SHALL log:
  - Count of keys recovered
  - Duration of recovery operation in milliseconds
  - List of recovered key IDs (if count ≤ 5) or summary (if count > 5)
- **Example:** `🔄 [Troll-LLM] OhMyGPT Auto-recovered 3 keys in 12ms (key1, key2, key3)`

### Requirement: No Manual Reset Required

After auto-recovery implementation, admin SHALL NOT need to manually reset rate-limited keys via the admin interface.

#### Scenario: Auto-recovery eliminates manual reset need
- **Given** keys are rate-limited during normal operation
- **And** 2+ minutes have passed since rate limit
- **When** auto-recovery service runs
- **Then** keys SHALL automatically return to `healthy` status
- **And** admin SHALL NOT need to visit `/ohmygpt-keys` page
- **And** admin SHALL NOT need to click "Reset" button
- **And** the keys SHALL function normally without intervention

### Requirement: Backward Compatibility

The auto-recovery feature SHALL not break existing functionality or API contracts.

#### Scenario: Existing admin reset still works
- **Given** auto-recovery service is running
- **And** admin manually clicks "Reset" on a rate-limited key via admin UI
- **When** the reset request is sent to `/admin/ohmygpt/keys/:id/reset`
- **Then** the system SHALL update the key to `healthy` immediately
- **And** auto-recovery SHALL NOT interfere with manual reset
- **And** the key SHALL be available for selection

#### Scenario: Existing rate limit behavior unchanged
- **Given** a key receives 429 response from upstream
- **When** `CheckAndRotateOnError()` is called
- **Then** the system SHALL call `MarkRateLimited(keyID)`
- **And** the key SHALL be marked with `status: "rate_limited"`
- **And** `cooldownUntil` SHALL be set to `now + 2 minutes`
- **And** the system SHALL attempt retry with next available key
- **Note:** This behavior is unchanged, only cooldown duration changed (60s → 2m)
