# Change: Add Model Usage Statistics to Admin Dashboard

## Why
Admin needs visibility into which AI models are being used most/least to understand usage patterns, optimize costs, and make informed decisions about model availability. Currently, there's no breakdown of token usage and credits burned per model.

## What Changes
- Add new API endpoint `GET /admin/model-stats` to aggregate usage by model
- Add "Model Usage" section to admin dashboard showing per-model statistics
- Display for each model: Input Tokens, Output Tokens, Total Tokens, Credits Burned, Request Count
- Support period filtering (1h, 24h, 7d, all) consistent with existing admin metrics

## Impact
- Affected specs: `user-dashboard`
- Affected code:
  - `backend/src/repositories/request-log.repository.ts` - Add getModelStats method
  - `backend/src/routes/admin.routes.ts` - Add /admin/model-stats endpoint
  - `frontend/src/lib/api.ts` - Add ModelStats interface and fetch function
  - `frontend/src/app/(dashboard)/admin/page.tsx` - Add Model Usage section
