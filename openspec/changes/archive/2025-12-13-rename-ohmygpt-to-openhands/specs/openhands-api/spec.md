# openhands-api Specification

## Purpose
Define the OpenHands key management API endpoints for managing OpenHands keys, backup keys, and proxy bindings. These endpoints replace the previous OhmyGPT endpoints with identical functionality.

## MODIFIED Requirements

### Requirement: OpenHands Key Management API
The system SHALL provide REST API endpoints for managing OpenHands API keys at `/admin/openhands/*`.

#### Scenario: List all OpenHands keys
- **WHEN** admin sends GET request to `/admin/openhands/keys`
- **THEN** system SHALL return list of all OpenHands keys with masked API keys
- **AND** response SHALL include stats: `totalKeys`, `healthyKeys`

#### Scenario: Create OpenHands key
- **WHEN** admin sends POST to `/admin/openhands/keys` with `{ id, apiKey }`
- **THEN** system SHALL create new OpenHands key in database
- **AND** return created key with masked API key

#### Scenario: Delete OpenHands key
- **WHEN** admin sends DELETE to `/admin/openhands/keys/:id`
- **THEN** system SHALL delete the key and all its bindings
- **AND** return success confirmation

#### Scenario: Reset OpenHands key stats
- **WHEN** admin sends POST to `/admin/openhands/keys/:id/reset`
- **THEN** system SHALL reset `tokensUsed` and `requestsCount` to 0
- **AND** return success confirmation

### Requirement: OpenHands Backup Key Management API
The system SHALL provide REST API endpoints for managing OpenHands backup keys for automatic rotation at `/admin/openhands/backup-keys`.

#### Scenario: List backup keys
- **WHEN** admin sends GET to `/admin/openhands/backup-keys`
- **THEN** system SHALL return all backup keys with masked API keys
- **AND** include stats: `total`, `available`, `used`

#### Scenario: Create backup key
- **WHEN** admin sends POST to `/admin/openhands/backup-keys` with `{ id, apiKey }`
- **THEN** system SHALL create backup key with `isUsed: false`, `activated: false`
- **AND** return created key with masked API key

#### Scenario: Delete backup key
- **WHEN** admin sends DELETE to `/admin/openhands/backup-keys/:id`
- **THEN** system SHALL delete the backup key
- **AND** return success confirmation

#### Scenario: Restore backup key to available
- **WHEN** admin sends POST to `/admin/openhands/backup-keys/:id/restore`
- **THEN** system SHALL set `isUsed: false` and `usedFor: null`
- **AND** key becomes available for auto-rotation again

### Requirement: OpenHands Proxy Bindings API
The system SHALL provide REST API endpoints for binding OpenHands keys to proxies at `/admin/openhands/bindings`.

#### Scenario: List all bindings
- **WHEN** admin sends GET to `/admin/openhands/bindings`
- **THEN** system SHALL return all bindings with enriched data (proxyName, keyStatus)
- **AND** include grouped view by proxy

#### Scenario: Get bindings for specific proxy
- **WHEN** admin sends GET to `/admin/openhands/bindings/:proxyId`
- **THEN** system SHALL return all bindings for that proxy sorted by priority

#### Scenario: Create binding
- **WHEN** admin sends POST to `/admin/openhands/bindings` with `{ proxyId, openhandsKeyId, priority }`
- **THEN** system SHALL create binding with `isActive: true` by default
- **AND** validate priority is between 1-10

#### Scenario: Update binding
- **WHEN** admin sends PATCH to `/admin/openhands/bindings/:proxyId/:keyId` with `{ priority?, isActive? }`
- **THEN** system SHALL update specified fields
- **AND** return updated binding

#### Scenario: Delete binding
- **WHEN** admin sends DELETE to `/admin/openhands/bindings/:proxyId/:keyId`
- **THEN** system SHALL delete the binding
- **AND** return success confirmation

#### Scenario: Delete all bindings for proxy
- **WHEN** admin sends DELETE to `/admin/openhands/bindings/:proxyId`
- **THEN** system SHALL delete all bindings for that proxy
- **AND** return count of deleted bindings

### Requirement: OpenHands Pool Reload API
The system SHALL provide endpoint to reload OpenHands key pools on Go proxy.

#### Scenario: Reload Go proxy pools
- **WHEN** admin sends POST to `/admin/openhands/reload`
- **THEN** backend SHALL forward request to Go proxy `/reload` endpoint
- **AND** return reload statistics: `proxy_count`, `ohmygpt_keys` (note: Go proxy field name may still be ohmygpt_keys internally)

## ADDED Requirements

### Requirement: Database Field Name Migration
The system SHALL use `openhandsKeyId` field name in bindings collection instead of `ohmygptKeyId`.

#### Scenario: Creating new binding
- **WHEN** admin creates binding via `/admin/openhands/bindings`
- **THEN** binding document SHALL store key reference as `openhandsKeyId` field

#### Scenario: Querying bindings
- **WHEN** system queries bindings from database
- **THEN** queries SHALL use `openhandsKeyId` field name
- **AND** support backward compatibility if needed during transition
