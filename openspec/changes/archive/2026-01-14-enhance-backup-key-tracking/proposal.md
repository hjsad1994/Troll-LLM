# Proposal: Enhance Backup Key Tracking

## Change ID
`enhance-backup-key-tracking`

## Status
Proposed

## Summary
Add 24-hour usage statistics for OpenHands backup keys and reduce the automatic deletion time for used keys from 12 hours to 6 hours to improve key pool turnover and provide better visibility into recent key usage patterns.

## Motivation
Currently, administrators lack visibility into recent backup key consumption patterns. When keys fail and backup keys are rotated, used keys remain in the database for 12 hours before automatic cleanup. This proposal addresses two operational concerns:

1. **Operational Visibility**: Admins need to monitor the rate of backup key consumption over the past 24 hours to identify patterns of key failures and ensure sufficient backup key inventory.

2. **Database Hygiene**: The current 12-hour retention period for used keys is excessive for operational needs. Reducing it to 6 hours will:
   - Keep the backup keys collection cleaner
   - Free up used keys faster (if manual restore is not needed)
   - Maintain sufficient time window for manual intervention if needed

## Affected Systems
- **Backend API**: `/admin/openhands/backup-keys` endpoint
- **Frontend UI**: OpenHands Backup Keys page (`/openhands-backup-keys`)
- **Go Proxy**: `CleanupUsedBackupKeys()` function in `goproxy/internal/openhands/backup.go`

## Capabilities

### 1. backup-key-24h-stats
Track and display the number of backup keys used in the past 24 hours.

**Requirements:**
- Backend calculates count of keys where `isUsed=true` and `usedAt` is within the last 24 hours
- Statistic is included in the existing `/admin/openhands/backup-keys` API response
- Frontend displays this metric as a 4th stats card alongside Total/Available/Used

### 2. backup-key-deletion-time
Reduce automatic deletion time for used backup keys from 12 hours to 6 hours.

**Requirements:**
- Update `CleanupUsedBackupKeys()` function to use 6-hour cutoff instead of 12 hours
- Apply to all used keys (both existing and new)
- Update UI countdown display to reflect 6-hour window
- Update documentation/comments mentioning the deletion time

## Success Criteria
- [ ] 24-hour usage statistics visible in admin dashboard
- [ ] API returns `usedIn24h` field in stats object
- [ ] Used backup keys are automatically deleted after 6 hours
- [ ] Existing log messages reflect the new 6-hour retention period
- [ ] UI countdown correctly shows time until deletion (6h window)

## Alternatives Considered
- **Alternative 1**: Keep 12-hour deletion time - Rejected because 6 hours provides sufficient intervention window while improving database hygiene
- **Alternative 2**: Separate API endpoint for statistics - Rejected in favor of including in existing endpoint to reduce API surface area
- **Alternative 3**: Only apply 6h deletion to new keys - Rejected because consistency across all keys is preferable

## Migration Notes
No data migration required. The change will apply immediately to all keys upon deployment:
- Existing used keys older than 6 hours will be cleaned up on the next cleanup job run
- Frontend will continue to work with old backend (missing stat will default to 0)

## Dependencies
None. This is a self-contained enhancement to the existing OpenHands backup keys feature.

## Related Changes
- Original backup keys implementation: `2026-01-05-add-ohmygpt-backup-keys-page`
- Auto-deletion feature: `2026-01-06-add-auto-delete-used-backup-keys`
