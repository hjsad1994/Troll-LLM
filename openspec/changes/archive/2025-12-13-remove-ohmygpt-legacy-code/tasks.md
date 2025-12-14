## 1. GoProxy - Update Database Module
- [x] 1.1 Remove `OhmyGPTKeysCollection()` function from `db/mongodb.go`

## 2. GoProxy - Update OpenHands Module
- [x] 2.1 Fix error message in `openhands.go:435` to reference correct collection name
- [x] 2.2 Update `backup.go` to use `openhands_backup_keys` collection instead of `ohmygpt_backup_keys`
- [x] 2.3 Update `backup.go` to use `openhands_bindings` collection instead of `ohmygpt_key_bindings`

## 3. Frontend - Update i18n translations
- [x] 3.1 Rename `ohmygptBackupKeys` key to `openhandsBackupKeys` in i18n.ts (English section)
- [x] 3.2 Update all English text from "OhmyGPT" to "OpenHands"
- [x] 3.3 Rename `ohmygptBackupKeys` key to `openhandsBackupKeys` in i18n.ts (Vietnamese section)
- [x] 3.4 Update all Vietnamese text from "OhmyGPT" to "OpenHands"

## 4. Frontend - Update Components
- [x] 4.1 Update `openhands-backup-keys/page.tsx` to use `t.openhandsBackupKeys` instead of `t.ohmygptBackupKeys`
- [x] 4.2 Update `admin/bindings/page.tsx` toast message to show "openhands_keys" instead of "ohmygpt_keys"

## 5. Database Migration (Manual)
- [ ] 5.1 Rename `ohmygpt_backup_keys` collection to `openhands_backup_keys` in MongoDB
- [ ] 5.2 Rename `ohmygpt_key_bindings` collection to `openhands_bindings` in MongoDB

## 6. Verification
- [x] 6.1 Search codebase for any remaining "ohmygpt" references - NONE FOUND ✅
- [ ] 6.2 Build and test the goproxy application
- [ ] 6.3 Build and test the frontend application
