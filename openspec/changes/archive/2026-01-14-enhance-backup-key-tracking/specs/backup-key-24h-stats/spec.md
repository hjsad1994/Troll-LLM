# Spec: Backup Key 24-Hour Usage Statistics

## Capability
`backup-key-24h-stats`

## Context
This capability adds tracking and display of backup keys used within the past 24 hours. This provides administrators with visibility into recent key consumption patterns to monitor key failure rates and ensure adequate backup key inventory.

## ADDED Requirements

### Requirement: 24-Hour Usage Statistics Tracking

The system SHALL track and report the number of backup keys consumed within the past 24 hours to provide administrators with visibility into recent key usage patterns.

#### Scenario: Backend calculates 24-hour usage count
**Given** the backup keys collection contains keys with various `usedAt` timestamps
**When** the admin requests backup keys data via `GET /admin/openhands/backup-keys`
**Then** the backend MUST count keys where `isUsed=true` AND `usedAt >= (current time - 24 hours)`
**And** include this count in the response as `stats.usedIn24h`

#### Scenario: API response includes 24h statistic
**Given** the admin makes a request to `GET /admin/openhands/backup-keys`
**When** the response is returned
**Then** the `stats` object MUST include a `usedIn24h` field (integer)
**And** the value MUST represent the count of keys used in the past 24 hours
**And** if no keys were used in 24h, the value MUST be `0`

Example response:
```json
{
  "keys": [...],
  "total": 15,
  "available": 8,
  "used": 7,
  "usedIn24h": 3
}
```

#### Scenario: Frontend displays 24h usage as stats card
**Given** the OpenHands Backup Keys page is loaded
**When** the API returns stats including `usedIn24h`
**Then** the frontend MUST display a 4th stats card showing "Used in 24h"
**And** the card MUST be positioned after the "Used" card in the stats grid
**And** the card MUST use styling consistent with other stat cards
**And** the value MUST update when keys are used or when the page is refreshed

#### Scenario: 24h count updates over time
**Given** a backup key was used exactly 25 hours ago
**When** the 24h statistics are calculated
**Then** that key MUST NOT be included in the `usedIn24h` count
**And** only keys with `usedAt` within the rolling 24-hour window MUST be counted

## MODIFIED Requirements

### Requirement: OhMyGPT Backup Keys API Endpoints

The backup keys API endpoint SHALL include 24-hour usage statistics in the response payload.

#### Scenario: List all backup keys with statistics
**Given** an admin user is authenticated
**When** `GET /admin/openhands/backup-keys` is called
**Then** the response MUST include:
- `keys`: array of backup key objects with masked API keys
- `total`: total count of all backup keys
- `available`: count of keys where `isUsed=false`
- `used`: count of keys where `isUsed=true`
- **`usedIn24h`: count of keys where `isUsed=true` AND `usedAt` is within the last 24 hours** *(ADDED)*

## Implementation Notes
- The 24h calculation should use `Date.now() - 24 * 60 * 60 * 1000` for the cutoff timestamp
- The query should filter on `usedAt` field: `{ isUsed: true, usedAt: { $gte: cutoffTime } }`
- Frontend should handle missing `usedIn24h` gracefully (default to 0 for backward compatibility)
- Consider adding an icon to the 24h stats card (e.g., clock or trending icon) to differentiate it visually

## Files Affected
- `backend/src/services/openhands.service.ts` - Add 24h calculation to `getBackupKeyStats()`
- `frontend/src/app/(dashboard)/openhands-backup-keys/page.tsx` - Add 4th stats card for 24h usage
- `frontend/src/lib/i18n.ts` - Add translations for "Used in 24h" label

## Related Specs
- `openspec/specs/ohmygpt-backup-keys-ui/spec.md` - Base backup keys UI specification
- `backup-key-deletion-time` - Companion capability for 6-hour deletion time
