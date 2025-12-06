# Change: Add Models Display with Health Check on Dashboard

## Why
Users and admins need visibility into available AI models and their health status directly from the dashboard. This helps understand which models are available and operational before making API requests.

## What Changes
- Add a new "Models Status" section on the user dashboard page (`/dashboard`)
- Add a new "Models Status" section on the admin dashboard page (`/admin`)
- Fetch list of models from goproxy config (exposed via new API endpoint)
- Display health status for each model (healthy = green, unhealthy = red)
- Implement periodic health check for model endpoints

## Impact
- Affected specs: `specs/user-dashboard/spec.md`
- Affected code:
  - `backend/src/routes/` - New models endpoint
  - `backend/src/controllers/` - Models controller
  - `backend/src/services/` - Models health service
  - `frontend/src/app/(dashboard)/dashboard/page.tsx` - Models section UI
  - `frontend/src/app/(dashboard)/admin/page.tsx` - Models section UI for admin
  - `frontend/src/lib/api.ts` - API client for models
