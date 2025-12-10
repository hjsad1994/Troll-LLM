# Change: Add OhmyGPT Backup Keys Management

## Why
Hiện tại khi OhmyGPT key chết (quota exhausted, rate limited permanently), không có cơ chế tự động thay thế. Cần backup keys để tự động rotate khi key chết, giống như Troll upstream đang làm với `backup_keys` collection.

## What Changes

### Backend (goproxy)
- **New MongoDB collection**: `ohmygpt_backup_keys` - lưu backup keys cho OhmyGPT
- **New API endpoints**:
  - `GET /admin/ohmygpt/backup-keys` - List backup keys
  - `POST /admin/ohmygpt/backup-keys` - Add backup key
  - `DELETE /admin/ohmygpt/backup-keys/:id` - Delete backup key
  - `POST /admin/ohmygpt/backup-keys/:id/restore` - Restore key to pool
- **Update OhmyGPT rotation**: Khi key chết, tự động load từ backup

### Frontend
- **Update `/admin/bindings` page**: Thêm section "OhmyGPT Backup Keys"
- Hoặc **New tab/section** trong existing bindings page

## Impact
- Affected files: `goproxy/internal/ohmygpt/ohmygpt.go`, `goproxy/main.go`
- New files: `goproxy/internal/ohmygpt/backup.go`
- Frontend: `frontend/src/app/(dashboard)/admin/bindings/page.tsx`
- MongoDB: New collection `ohmygpt_backup_keys`

## Reference: Troll Backup Keys Logic
```go
// From keypool/rotation.go
func (p *KeyPool) RotateKey(failedKeyID string, reason string) (string, error) {
    // 1. Find available backup key
    backupKey := findBackupKey()
    // 2. Delete failed key from ohmygpt_keys
    // 3. Insert backup key into ohmygpt_keys
    // 4. Create new proxy binding
    // 5. Mark backup key as used
    return backupKey.ID, nil
}
```
