# Spec: Backup Key Deletion Time Reduction

## Capability
`backup-key-deletion-time`

## Context
This capability reduces the automatic deletion time for used backup keys from 12 hours to 6 hours. The original implementation used 24 hours, but it was later reduced to 12 hours (as seen in the current code). This change further reduces it to 6 hours to improve database hygiene while maintaining sufficient time for manual intervention.

Note: The archived spec `2026-01-06-add-auto-delete-used-backup-keys` references 24 hours, but the actual implementation in `goproxy/internal/openhands/backup.go:145` uses 12 hours.

## MODIFIED Requirements

### Requirement: Auto-Delete Used Backup Keys

The system SHALL automatically delete backup keys from the `openhands_backup_keys` collection when the key has been marked as used (`isUsed: true`) and the `usedAt` timestamp is older than 6 hours. The cleanup process SHALL run periodically (every hour) as a background job.

*Note: This modifies the requirement from archived change `2026-01-06-add-auto-delete-used-backup-keys`, changing the deletion time from 12 hours to 6 hours.*

#### Scenario: Used key older than 6 hours is deleted *(MODIFIED)*
**Given** a backup key exists with `isUsed: true`
**When** the key's `usedAt` timestamp is more than **6 hours** ago
**Then** the cleanup job MUST delete the key from the `openhands_backup_keys` collection
**And** log the deletion event: `"Deleted %d expired backup keys (used > 6h)"`

#### Scenario: Used key within 6 hours is retained *(MODIFIED)*
**Given** a backup key exists with `isUsed: true`
**When** the key's `usedAt` timestamp is less than **6 hours** ago
**Then** the cleanup job MUST NOT delete the key
**And** the key MUST remain visible in admin UI with deletion countdown

#### Scenario: Unused keys are never auto-deleted *(UNCHANGED)*
**Given** a backup key has `isUsed: false`
**When** the cleanup job runs
**Then** the key MUST NEVER be deleted, regardless of age

### Requirement: Deletion Time Display

The admin UI SHALL display the scheduled deletion time for used backup keys based on the 6-hour retention window, allowing administrators to monitor when keys will be automatically removed.

#### Scenario: Show deletion countdown for used keys *(MODIFIED)*
**Given** an admin views the OpenHands Backup Keys page
**When** a key has `isUsed: true` and `usedAt` is set
**Then** the UI MUST display a countdown badge showing "Deletes in Xh Ym"
**And** the countdown MUST be calculated as: `(usedAt + 6h) - now`
**And** the countdown MUST update when the page is refreshed
**And** if the calculated time is ≤ 0, display "Deleting soon..."

#### Scenario: No deletion indicator for available keys *(UNCHANGED)*
**Given** an admin views the OpenHands Backup Keys page
**When** a key has `isUsed: false`
**Then** no deletion countdown MUST be shown

### Requirement: Cleanup Job Logging
The cleanup job SHALL log events with updated time references.

#### Scenario: Successful cleanup logs reflect 6-hour window
**Given** the cleanup job successfully deletes N expired keys
**When** the job logs the result
**Then** the log message MUST include "(used > 6h)" to indicate the retention policy
**And** use the format: `"Deleted %d expired backup keys (used > 6h)"`

## Implementation Notes

### Go Proxy Changes
File: `goproxy/internal/openhands/backup.go`

Line 145 change:
```go
// OLD:
cutoffTime := time.Now().Add(-12 * time.Hour)

// NEW:
cutoffTime := time.Now().Add(-6 * time.Hour)
```

Line 177 change:
```go
// OLD:
log.Printf("🗑️ [OpenHands/Cleanup] Deleted %d expired backup keys (used > 12h)", deleted)

// NEW:
log.Printf("🗑️ [OpenHands/Cleanup] Deleted %d expired backup keys (used > 6h)", deleted)
```

### Frontend Changes
File: `frontend/src/app/(dashboard)/openhands-backup-keys/page.tsx`

The `getDeleteCountdown()` function (line 50) already calculates dynamically based on `deletesAt` timestamp, so no logic change needed. The backend computes `deletesAt = usedAt + 6h` before sending to frontend.

### Backend Changes
File: `backend/src/services/openhands.service.ts`

If the backend calculates `deletesAt` for the frontend, update the calculation:
```typescript
// In listBackupKeys() response mapping
deletesAt: key.usedAt ? new Date(key.usedAt.getTime() + 6 * 60 * 60 * 1000) : undefined
```

## Migration Strategy
**No data migration required.** This change applies immediately:
- On next cleanup job run after deployment, keys used more than 6 hours ago will be deleted
- Existing keys between 6-12 hours old will be deleted on the first post-deployment cleanup
- Frontend countdown will reflect the new 6-hour window immediately

## Testing Checklist
- [ ] Create a used backup key with `usedAt` = 7 hours ago → should be deleted on cleanup
- [ ] Create a used backup key with `usedAt` = 5 hours ago → should NOT be deleted
- [ ] Create an available backup key (`isUsed: false`) → should NEVER be deleted
- [ ] Verify frontend countdown shows "Deletes in Xh Ym" for keys within 6h window
- [ ] Verify logs show "(used > 6h)" message when keys are deleted
- [ ] Verify cleanup job runs on startup and continues periodically

## Files Affected
- `goproxy/internal/openhands/backup.go` - Update cutoff time and log messages
- `backend/src/services/openhands.service.ts` - Update `deletesAt` calculation (if applicable)
- `frontend/src/app/(dashboard)/openhands-backup-keys/page.tsx` - No changes (dynamically calculates countdown)

## Related Specs
- Archived: `openspec/changes/archive/2026-01-06-add-auto-delete-used-backup-keys` - Original 24h deletion spec
- `backup-key-24h-stats` - Companion capability for usage statistics
