# Add Admin Metrics Time Filter

## Why
Currently the admin dashboard at `/admin` only displays total token usage without any time-based filtering. Admins need to view metrics for specific time periods (1 hour, 24 hours, 7 days) to monitor recent activity and identify usage patterns.

## What Changes
Add a time period filter to the admin dashboard that allows filtering metrics by:
- Last 1 hour
- Last 24 hours
- Last 7 days
- All time (default)

The backend already supports this via the `/admin/metrics?period=1h|24h|7d|all` endpoint.

## Files to Modify
- `frontend/src/app/(dashboard)/admin/page.tsx` - Add period filter UI and state

## Impact
- UI-only change on frontend
- No backend changes required (API already supports period parameter)
- Non-breaking change
