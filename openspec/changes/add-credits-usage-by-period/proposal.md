# Add Credits Usage By Period

## Why
Users need to see how many credits they've used in recent time periods (1h, 24h, 7d, 30d) to monitor their spending. Admins need to see total credits burned across all users filtered by the dashboard time filter.

## What Changes

### User Dashboard (`/dashboard`)
- Display credits used in last 1 hour, 24 hours, 7 days, and 30 days
- Show as a breakdown card similar to token usage

### Admin Dashboard (`/admin`)
- Add "Credits Burned" metric to User Stats card
- Filter by the existing period selector (1h, 24h, 7d, all)

## Files to Modify
- `backend/src/repositories/request-log.repository.ts` - Add method to get credits by period
- `backend/src/routes/user.routes.ts` - Add endpoint for user credits usage
- `backend/src/repositories/user.repository.ts` - Add total credits burned to getUserStats
- `frontend/src/app/(dashboard)/dashboard/page.tsx` - Add credits usage display
- `frontend/src/app/(dashboard)/admin/page.tsx` - Add credits burned metric

## Impact
- Non-breaking change
- Aggregates from existing `request_logs.creditsCost` field
