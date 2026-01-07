# Implementation Tasks

## Go Proxy (goproxy)

### 1. Remove Failover Constants
- [x] Remove `OhMyGPTFailoverBaseURL` constant
- [x] Remove `OhMyGPTFailoverMessagesEndpoint` constant
- [x] Remove `OhMyGPTFailoverCompletionsEndpoint` constant

### 2. Remove Failover Status and Type Fields
- [x] Remove `OhMyGPTStatusUsingFailover` constant from `ohmygpt.go`
- [x] Remove `EnableFailover bool` field from `OhMyGPTKey` struct
- [x] Remove `EnableFailover bool` field from `OhMyGPTBackupKey` struct in `backup.go`

### 3. Simplify IsAvailable Method
- [x] Remove special handling for `using_failover` status in `IsAvailable()`
- [x] Keep only `exhausted`, `rate_limited`, and `healthy` status checks

### 4. Remove MarkUsingFailover Method
- [x] Remove entire `MarkUsingFailover(keyID string)` method

### 5. Simplify CheckAndRotateOnError Logic
- [x] Remove all conditional logic checking `EnableFailover` flag
- [x] Remove status check for `OhMyGPTStatusUsingFailover`
- [x] Remove `MarkUsingFailover()` call
- [x] Simplify to always call `RotateKey()` for quota/block errors
- [x] Keep existing `MarkRateLimited()` for temporary rate limits

### 6. Simplify forwardToEndpoint Endpoint Selection
- [x] Remove endpoint selection logic based on key status
- [x] Remove `actualEndpoint` variable and failover endpoint mapping
- [x] Always use primary endpoints (`OhMyGPTMessagesEndpoint`, `OhMyGPTCompletionsEndpoint`)
- [x] Remove `endpointType` variable from log messages
- [x] Simplify log messages to remove "primary" vs "FAILOVER" indicators

### 7. Remove Failover from Stats
- [x] Remove `"using_failover": 0` from stats map initialization
- [x] Remove `case OhMyGPTStatusUsingFailover:` from stats counting switch

### 8. Simplify RotateKey Method
- [x] Remove logic that reads `enableFailover` from failed key
- [x] Remove `enableFailover` field from new key insertion
- [x] Remove failover-related log messages

## Backend (Node.js/Express API)

### 9. Remove enableFailover from TypeScript Interfaces
- [x] Remove `enableFailover?: boolean` from `OhMyGPTKey` interface
- [x] Remove `enableFailover?: boolean` from `OhMyGPTBackupKey` interface

### 10. Remove Failover Functions
- [x] Remove `updateKeyFailover()` function
- [x] Remove `updateBackupKeyFailover()` function

### 11. Simplify createKey Function
- [x] Remove `enableFailover` parameter from function signature
- [x] Remove `enableFailover` field from key object creation

### 12. Simplify resetKeyStats Function
- [x] Remove logic to preserve `enableFailover` setting
- [x] Remove `enableFailover` from update `$set` object

### 13. Simplify getStats Function
- [x] Remove `failoverEnabledKeys` from Promise.all array
- [x] Remove `countDocuments({ enableFailover: true })` query
- [x] Remove `failoverEnabledKeys` from return object

### 14. Simplify getBackupStats Function
- [x] Remove `failoverEnabledCount` from Promise.all array
- [x] Remove `countDocuments({ enableFailover: true })` query
- [x] Remove `failoverEnabledCount` from return object

### 15. Simplify createBackupKey Function
- [x] Remove `enableFailover` parameter from function signature
- [x] Remove `enableFailover` field from backup key object creation

### 16. Remove Failover API Endpoints
- [x] Remove `updateKeyFailoverSchema` zod schema
- [x] Remove PATCH `/admin/ohmygpt/keys/:id` endpoint
- [x] Remove PATCH `/admin/ohmygpt/backup-keys/:id` endpoint
- [x] Remove `enableFailover` field from `createKeySchema`

### 17. Update List Endpoints
- [x] Remove `enableFailover` field from backup keys list response mapping

## Frontend (Next.js/React)

### 18. Remove Failover from TypeScript Interfaces
- [x] Remove `enableFailover?: boolean` from `OhMyGPTKey` interface in `ohmygpt-keys/page.tsx`
- [x] Remove `enableFailover?: boolean` from `OhMyGPTBackupKey` interface in `ohmygpt-backup-keys/page.tsx`

### 19. Remove Failover from OhMyGPT Keys Page
- [x] Remove "Failover" column from keys table
- [x] Remove failover toggle switch rendering
- [x] Remove `toggleFailover()` function
- [x] Remove `enableFailover` from form state
- [x] Remove failover checkbox from add key modal
- [x] Remove failover stat card

### 20. Remove Failover from OhMyGPT Backup Keys Page
- [x] Remove "Failover" column from backup keys table
- [x] Remove failover toggle switch rendering
- [x] Remove `toggleFailover()` function
- [x] Remove `enableFailover` from form state
- [x] Remove failover checkbox from add backup key modal
- [x] Remove failover stat card

### 21. Remove Failover Translations
- [x] Remove `enableFailoverLabel` from English translations
- [x] Remove `enableFailoverLabel` from Vietnamese translations
- [x] Remove any other failover-related translation keys

### 22. Remove Using Failover Status Display
- [x] Remove visual indicator for `using_failover` status (if any remains)
- [x] Simplify status badge display to only show: healthy, rate_limited, exhausted, error

## OpenSpec Cleanup

### 23. Archive Old Change
- [x] Move `openspec/changes/add-ohmygpt-failover-endpoint/` to archive location or rename with `-archived` suffix
- [x] Or delete the folder if archiving is not needed

## Testing and Validation

### 24. Go Proxy Tests
- [ ] Test that keys rotate correctly on 402 errors (no failover, direct rotation)
- [ ] Test that keys rotate correctly on 429 permanent block errors
- [ ] Test that temporary rate limits still apply cooldown
- [ ] Verify stats endpoint doesn't include `using_failover` count
- [ ] Verify endpoint selection always uses primary endpoints

### 25. Backend API Tests
- [ ] Test create key without `enableFailover` field
- [ ] Test stats endpoint doesn't include `failoverEnabledKeys`
- [ ] Test backup keys stats doesn't include `failoverEnabledCount`
- [ ] Verify PATCH endpoints for failover return 404

### 26. Frontend Tests
- [ ] Test OhMyGPT keys page loads without failover column
- [ ] Test add key modal doesn't show failover checkbox
- [ ] Test OhMyGPT backup keys page loads without failover column
- [ ] Test add backup key modal doesn't show failover checkbox

### 27. Integration Testing
- [ ] Test full key lifecycle: add key -> key fails -> key rotates -> new key activated
- [ ] Verify no logs mention "failover endpoint" or "switched to failover"
- [ ] Verify all requests go to primary endpoints only
- [ ] Test UI doesn't have any failover-related controls

### 28. Manual Testing
- [ ] Add OhMyGPT key via UI
- [ ] Add OhMyGPT backup key via UI
- [ ] Trigger key failure and verify rotation (no failover)
- [ ] Check logs confirm primary endpoint usage only
- [ ] Verify stats display correctly (no failover counts)
