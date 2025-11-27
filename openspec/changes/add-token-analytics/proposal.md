# Change: Add Token Analytics Dashboard

## Why
Users need to view token usage statistics over different time periods (1 hour, 24 hours, 7 days) in the Factory Keys admin page. This helps monitor API usage patterns and costs.

## What Changes
- Add API endpoint to get token analytics by time period
- Store request logs with timestamps in MongoDB for aggregation
- Update Factory Keys admin page to display token analytics:
  - Total tokens used in last 1 hour
  - Total tokens used in last 24 hours
  - Total tokens used in last 7 days
- Add visual charts/stats cards for token usage trends

## Impact
- Affected specs: api-proxy
- Affected code: 
  - `backend/src/routes/admin.ts` - Add analytics endpoint
  - `backend/src/services/factorykey.service.ts` - Add analytics queries
  - `backend/static/admin/factory-keys.html` - Add analytics UI
  - `goproxy/internal/usage/tracker.go` - Ensure request logging with timestamps
