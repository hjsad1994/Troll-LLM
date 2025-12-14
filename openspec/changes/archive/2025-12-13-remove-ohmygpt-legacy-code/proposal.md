# Change: Remove OhMyGPT Legacy Code References

## Why
The system previously had an "ohmygpt" upstream provider which has been renamed to "openhands". However, legacy code references to `ohmygpt` collection names, function names, and UI text remain in the codebase. These must be removed to:
1. Ensure consistency with the current naming conventions
2. Prevent confusion for users and developers
3. Ensure all components (goproxy, frontend) correctly reference `openhands` instead of `ohmygpt`

## What Changes

### GoProxy (Backend)
- **BREAKING**: Remove `OhmyGPTKeysCollection()` function from `db/mongodb.go`
- Update `internal/openhands/openhands.go` to remove error message referencing "ohmygpt_keys"
- Update `internal/openhands/backup.go` to use `openhands_backup_keys` instead of `ohmygpt_backup_keys`
- Update `internal/openhands/backup.go` to use `openhands_bindings` instead of `ohmygpt_key_bindings`

### Frontend
- Update `frontend/src/lib/i18n.ts`:
  - Rename `ohmygptBackupKeys` key to `openhandsBackupKeys`
  - Update all user-facing text from "OhmyGPT" to "OpenHands" (English and Vietnamese)
- Update `frontend/src/app/(dashboard)/openhands-backup-keys/page.tsx`:
  - Change references from `t.ohmygptBackupKeys` to `t.openhandsBackupKeys`
- Update `frontend/src/app/(dashboard)/admin/bindings/page.tsx`:
  - Fix toast message referencing `ohmygpt_keys`

## Impact
- Affected specs: `api-proxy`
- Affected code:
  - `goproxy/db/mongodb.go:91-93` - Remove `OhmyGPTKeysCollection` function
  - `goproxy/internal/openhands/openhands.go:435` - Fix error message
  - `goproxy/internal/openhands/backup.go:34` - Change collection name
  - `goproxy/internal/openhands/backup.go:161` - Change collection name
  - `frontend/src/lib/i18n.ts:849-892, 2035-2078` - Update i18n keys and text
  - `frontend/src/app/(dashboard)/openhands-backup-keys/page.tsx` - Update translation key references
  - `frontend/src/app/(dashboard)/admin/bindings/page.tsx:231` - Fix toast message

## Migration
- No data migration needed as the openhands code already uses `openhands_keys` collection via `db.OpenHandsKeysCollection()`
- The backup keys collection needs to be renamed from `ohmygpt_backup_keys` to `openhands_backup_keys` in MongoDB (manual operation)
- The bindings collection needs to be renamed from `ohmygpt_key_bindings` to `openhands_bindings` in MongoDB (manual operation)
