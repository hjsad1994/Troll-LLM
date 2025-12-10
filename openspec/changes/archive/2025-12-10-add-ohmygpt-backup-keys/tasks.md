# Tasks: Add OhmyGPT Backup Keys

## 1. Backend - MongoDB & Models

- [ ] 1.1 Define `OhmyGPTBackupKey` struct in `ohmygpt/backup.go`
- [ ] 1.2 Create MongoDB collection helper `OhmyGPTBackupKeysCollection()`

## 2. Backend - API Endpoints

- [ ] 2.1 `GET /admin/ohmygpt/backup-keys` - List all backup keys with stats
- [ ] 2.2 `POST /admin/ohmygpt/backup-keys` - Add new backup key
- [ ] 2.3 `DELETE /admin/ohmygpt/backup-keys/:id` - Delete backup key
- [ ] 2.4 `POST /admin/ohmygpt/backup-keys/:id/restore` - Restore key to active pool

## 3. Backend - Rotation Logic

- [ ] 3.1 Create `RotateOhmyGPTKey(failedKeyID, reason)` function
- [ ] 3.2 Update `CheckAndRotateOnError()` to use backup keys
- [ ] 3.3 Logic flow:
  - Find available backup key (isUsed: false)
  - Delete failed key from `ohmygpt_keys`
  - Insert backup key into `ohmygpt_keys`
  - Update proxy binding
  - Mark backup key as used (activated: true)
  - Reload in-memory key pool

## 4. Frontend - Admin Bindings Page

- [ ] 4.1 Add "OhmyGPT Backup Keys" section to `/admin/bindings`
- [ ] 4.2 Stats cards: Total, Available, Used
- [ ] 4.3 Table with columns: ID, API Key (masked), Status, Used For, Created, Actions
- [ ] 4.4 Add Key modal form
- [ ] 4.5 Delete and Restore actions

## 5. Testing

- [ ] 5.1 Build backend without errors
- [ ] 5.2 Test API endpoints with curl
- [ ] 5.3 Test frontend UI
- [ ] 5.4 Test rotation: simulate key failure and verify backup rotation

## Reference: Existing Troll Backup Structure

```typescript
// Frontend: BackupKey interface
interface BackupKey {
  id: string
  maskedApiKey: string
  isUsed: boolean
  activated: boolean
  usedFor?: string
  usedAt?: string
  createdAt: string
}

// Backend: BackupKey struct
type BackupKey struct {
  ID        string    `bson:"_id"`
  APIKey    string    `bson:"apiKey"`
  IsUsed    bool      `bson:"isUsed"`
  Activated bool      `bson:"activated"`
  UsedFor   string    `bson:"usedFor"`
  UsedAt    time.Time `bson:"usedAt"`
  CreatedAt time.Time `bson:"createdAt"`
}
```
