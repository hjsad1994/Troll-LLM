# Tasks: Auto-delete Used OpenHands Backup Keys

## 1. Backend - GoProxy Cleanup Job
- [x] 1.1 Add `CleanupUsedBackupKeys()` function in `goproxy/internal/openhands/backup.go`
- [x] 1.2 Function queries for `isUsed: true` AND `usedAt < (now - 24h)`
- [x] 1.3 Delete matching documents and log count
- [x] 1.4 Start cleanup goroutine in `goproxy/main.go` that runs every hour

## 2. Backend - API Response Enhancement
- [x] 2.1 Add `deletesAt` field to backup key response (usedAt + 24h)
- [x] 2.2 Update `openhandsBackupKeysHandler()` to include deletion time

## 3. Frontend - UI Indicator
- [x] 3.1 Show "Deletes in X hours" badge for used keys in admin table
- [x] 3.2 Update status column to show deletion countdown

## 4. Testing & Validation
- [ ] 4.1 Manually test cleanup by setting a key's usedAt to > 24h ago
- [ ] 4.2 Verify logs show deletion events
- [ ] 4.3 Verify UI shows correct countdown
