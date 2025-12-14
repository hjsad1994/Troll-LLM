## 1. Backend Service Updates
- [x] 1.1 Update `listKeys()` to use `openhands_keys` collection
- [x] 1.2 Update `getKey()` to use `openhands_keys` collection
- [x] 1.3 Update `createKey()` to use `openhands_keys` collection
- [x] 1.4 Update `updateKey()` to use `openhands_keys` collection
- [x] 1.5 Update `deleteKey()` to use `openhands_keys` and `openhands_bindings` collections
- [x] 1.6 Update `resetKeyStats()` to use `openhands_keys` collection

## 2. Backup Keys Service Updates
- [x] 2.1 Update `listBackupKeys()` to use `openhands_backup_keys` collection
- [x] 2.2 Update `getBackupKeyStats()` to use `openhands_backup_keys` collection
- [x] 2.3 Update `createBackupKey()` to use `openhands_backup_keys` collection
- [x] 2.4 Update `deleteBackupKey()` to use `openhands_backup_keys` collection
- [x] 2.5 Update `restoreBackupKey()` to use `openhands_backup_keys` collection

## 3. Bindings Service Updates
- [x] 3.1 Update `listBindings()` to use `openhands_bindings` collection
- [x] 3.2 Update `getBindingsForProxy()` to use `openhands_bindings` collection
- [x] 3.3 Update `createBinding()` to use `openhands_bindings` collection
- [x] 3.4 Update `updateBinding()` to use `openhands_bindings` collection
- [x] 3.5 Update `deleteBinding()` to use `openhands_bindings` collection
- [x] 3.6 Update `deleteAllBindingsForProxy()` to use `openhands_bindings` collection

## 4. Stats Service Updates
- [x] 4.1 Update `getStats()` to use `openhands_keys` and `openhands_bindings` collections

## 5. Testing & Verification
- [x] 5.1 Test CRUD operations on `/admin/openhands/keys` endpoint
- [x] 5.2 Test CRUD operations on `/admin/openhands/backup-keys` endpoint
- [x] 5.3 Test CRUD operations on `/admin/openhands/bindings` endpoint
- [x] 5.4 Verify frontend pages load and display data correctly
- [x] 5.5 Verify stats are calculated correctly from new collections
- [x] 5.6 Verify existing `ohmygpt_*` collections remain unaffected
