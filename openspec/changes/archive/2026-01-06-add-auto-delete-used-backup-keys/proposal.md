# Change: Auto-delete Used OpenHands Backup Keys After 24 Hours

## Why
Currently, when backup keys are used during rotation (marked `isUsed: true` and `activated: true`), they remain in the `openhands_backup_keys` collection indefinitely. This clutters the database and admin UI with stale entries that will never be reused. Auto-deleting these keys after 24 hours keeps the system clean while preserving a grace period for potential troubleshooting.

## What Changes
- Add a background cleanup job in GoProxy that runs periodically (every hour)
- Delete backup keys where `isUsed: true` AND `usedAt` is older than 24 hours
- Log deletion events for audit purposes
- Update admin UI to show "Will be deleted" indicator for keys pending deletion

## Impact
- Affected specs: `openhands-backup-keys` (new capability)
- Affected code:
  - `goproxy/internal/openhands/backup.go` - Add cleanup function
  - `goproxy/main.go` - Start cleanup goroutine
  - `frontend/src/app/(dashboard)/openhands-backup-keys/page.tsx` - Show deletion countdown
  - `backend/src/services/openhands.service.ts` - Add deletion time to response
