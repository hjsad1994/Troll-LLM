# Implementation Tasks

## Backend (GoProxy - Go)

### 1. Update OhMyGPT Types and Constants
- [x] Add `OhMyGPTStatusUsingFailover = "using_failover"` constant
- [x] Add `OhMyGPTFailoverMessagesEndpoint` constant (`https://c-z0-api-01.hash070.com/v1/messages`)
- [x] Add `OhMyGPTFailoverCompletionsEndpoint` constant (`https://c-z0-api-01.hash070.com/chat/completions`)
- [x] Add `EnableFailover bool` field to `OhMyGPTKey` struct with bson/json tags
- [x] Update `IsAvailable()` to return `true` for `using_failover` status

### 2. Add MarkUsingFailover Method
- [x] Implement `MarkUsingFailover(keyID string)` method
- [x] Set status to `OhMyGPTStatusUsingFailover`
- [x] Set `LastError` to "Switched to backup endpoint"
- [x] Clear `CooldownUntil`
- [x] Update MongoDB via `updateKeyStatus()`
- [x] Add log message for failover switch

### 3. Update CheckAndRotateOnError Logic
- [x] Check key's current status AND `EnableFailover` flag before rotation
- [x] For quota errors (402) with failover-enabled key:
  - If status is `healthy`, call `MarkUsingFailover()` (switch to backup endpoint)
  - If status is `using_failover`, call `RotateKey()` (rotate to backup key pool)
- [x] For permanent blocks (429 with banned/blocked keywords) with failover-enabled:
  - If status is `healthy`, call `MarkUsingFailover()`
  - If status is `using_failover`, call `RotateKey()`
- [x] For temporary rate limits (429): keep existing `MarkRateLimited()` behavior
- [x] Ensure non-failover keys use existing rotation logic

### 3.1 Update RotateKey to Preserve EnableFailover
- [x] Read failed key's `enableFailover` value before deletion
- [x] When inserting new key from backup pool, include `enableFailover` field
- [x] New key inherits `enableFailover` setting from failed key
- [x] Add log message indicating failover setting inheritance

### 3.2 Update RotateKey to Read Backup Key's EnableFailover
- [x] When selecting backup key for rotation, read backup key's `enableFailover` value
- [x] If backup key has `enableFailover: true`, create new key with that setting
- [x] If backup key has `enableFailover: false` or not set, default to `false`
- [x] Add log message indicating backup key failover setting inheritance

### 3.3 Update OhMyGPTBackupKey Type
- [x] Add `EnableFailover bool` field to `OhMyGPTBackupKey` struct
- [x] Add bson tag `enableFailover` and json tag `enable_failover`
- [x] Update `AddOhMyGPTBackupKey()` to accept `enableFailover` parameter
- [x] Update `ListOhMyGPTBackupKeys()` to include `enableFailover` in returned objects

### 4. Update Endpoint Selection in Forward Logic
- [x] Modify `forwardToEndpoint()` to check key status
- [x] If key status is `using_failover`, use failover endpoints
- [x] Otherwise, use primary endpoints
- [x] Update log messages to indicate "primary" vs "FAILOVER" endpoint usage

### 5. Update LoadKeys for Backward Compatibility
- [x] When loading keys from MongoDB, default `EnableFailover` to `false` if field not present
- [x] Ensure existing keys without field continue working

## Backend (Node.js/Express API)

### 6. Update MongoDB Schema and Model
- [x] Add `enableFailover` boolean field to key schema (default: `false`)
- [x] Update validation schema for create/update operations
- [x] Add `enableFailover` to key return object

### 7. Add PATCH Endpoint for Failover Setting
- [x] Create PATCH `/admin/ohmygpt/keys/:id` endpoint
- [x] Validate request body with zod schema (`enableFailover: boolean`)
- [x] Update key in MongoDB with new `enableFailover` value
- [x] Return updated key object
- [x] Handle 400 (validation error) and 404 (key not found)

### 8. Update Stats Endpoint
- [x] Add `failoverEnabledKeys` count to GET `/admin/ohmygpt/stats` response
- [x] Count keys where `enableFailover: true`

### 9. Update Reset Key Endpoint
- [x] Ensure POST `/admin/ohmygpt/keys/:id/reset` preserves `enableFailover` setting
- [x] Reset to `healthy` status (not `using_failover`)

### 10. Update Create Key Endpoint
- [x] Accept optional `enableFailover` field in POST body
- [x] Default to `false` if not provided
- [x] Store in MongoDB on key creation

### 11. Update Backup Keys API (Node.js/Express)
- [x] Add `enableFailover` field to backup keys schema (default: `false`)
- [x] Update create backup key endpoint to accept `enableFailover`
- [x] Add PATCH `/admin/ohmygpt/backup-keys/:id` endpoint for updating failover setting
- [x] Update list backup keys endpoint to include `enableFailover` in response
- [x] Update stats endpoint to include `failoverEnabledCount` for backup keys
- [x] Ensure backward compatibility (existing backup keys default to `false`)

## Frontend (Next.js/React)

### 12. Update OhMyGPT Keys Page UI
- [x] Add "Failover" column to keys table (desktop view)
- [ ] Add failover indicator to key cards (mobile view)
- [x] Display "Enabled" badge for failover-enabled keys (toggle switch)
- [x] Display "Disabled" text for non-failover keys (toggle switch)

### 13. Add Failover Toggle Component
- [x] Add switch/toggle button for each key row
- [x] On toggle, send PATCH request to `/admin/ohmygpt/keys/:id`
- [x] Show success/error toast on response
- [x] Reload keys after successful update

### 14. Update Add Key Modal
- [x] Add checkbox/toggle for "Enable Failover" option
- [x] Default checkbox to unchecked
- [x] Include `enableFailover` in create request when checked
- [x] Update validation schema

### 15. Update Stats Cards
- [x] Add "Failover" stat card showing count of failover-enabled keys
- [x] Fetch from stats API response

### 16. Update OhMyGPT Backup Keys Page UI
- [ ] Add "Failover" column to backup keys table
- [ ] Add failover toggle for each backup key
- [ ] Add "Failover Enabled" stat card to backup keys page
- [ ] Update add backup key modal to include failover checkbox
- [ ] On toggle, send PATCH request to `/admin/ohmygpt/backup-keys/:id`

### 17. Update Translations
- [ ] Add English translations for failover-related labels
- [ ] Add Vietnamese translations for failover-related labels
- [ ] Keys: `failover`, `failoverEnabled`, `failoverDisabled`, `failoverColumn`, `enableFailoverLabel`, etc.

### 18. Update Using Failover Status Display
- [x] Add visual indicator for `using_failover` status (orange badge in table)
- [x] Different color/badge for failover status (orange)
- [x] Show in status column of keys table

## Testing and Validation

### 19. Backend Go Tests
- [ ] Test `MarkUsingFailover()` sets correct status
- [ ] Test `IsAvailable()` returns true for `using_failover`
- [ ] Test endpoint selection based on key status
- [ ] Test failover logic in `CheckAndRotateOnError()`
- [ ] Test backward compatibility (keys without `enableFailover` field)
- [ ] Test backup key `enableFailover` inheritance during rotation

### 20. Backend API Tests
- [ ] Test PATCH `/admin/ohmygpt/keys/:id` with valid data
- [ ] Test validation errors
- [ ] Test stats endpoint includes `failoverEnabledKeys`
- [ ] Test create key with/without `enableFailover`
- [ ] Test PATCH `/admin/ohmygpt/backup-keys/:id` for failover setting
- [ ] Test backup keys API includes `enableFailover` in response

### 21. Integration Testing
- [ ] Test failover flow: healthy key gets 402, switches to backup endpoint
- [ ] Test failover-then-rotate: key on backup endpoint gets 402 again, rotates to new key
- [ ] Test new key inherits enableFailover setting from failed key
- [ ] Test new key inherits enableFailover from backup key during rotation
- [ ] Test non-failover key: key gets 402, rotates to new key
- [ ] Test UI toggle updates backend correctly (both keys and backup keys)
- [ ] Test reset returns key to primary endpoint
- [ ] Test both `/v1/messages` and `/chat/completions` endpoints

### 22. Manual Testing
- [ ] Add failover-enabled key via UI
- [ ] Add failover-enabled backup key via UI
- [ ] Trigger quota error on healthy key and verify failover switch
- [ ] Verify backup endpoint is used via logs
- [ ] Trigger quota error again while on backup endpoint - verify key rotation
- [ ] Verify new key inherits enableFailover setting
- [ ] Test reset key functionality
- [ ] Verify stats display correctly for both keys and backup keys
