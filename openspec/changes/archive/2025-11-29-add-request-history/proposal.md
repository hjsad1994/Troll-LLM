# Change: Add Request History to User Dashboard

## Why
Users currently cannot see detailed cost breakdown of their API requests. They need visibility into how much each request costs (input tokens, output tokens, total credits) to manage their usage and budget effectively.

## What Changes
- **Backend**: Enhance `request_logs` schema to store detailed token/cost information
- **Backend**: Add new API endpoint `/api/user/request-history` to fetch user's request logs
- **GoProxy**: Update request logging to include detailed token breakdown and credits cost
- **Frontend**: Add "Request History" menu/page in dashboard showing request logs with:
  - Timestamp
  - Model used
  - Input tokens
  - Output tokens  
  - Cache tokens (write/hit)
  - Credits cost
  - Status (success/error)
  - Latency

## Impact
- Affected specs: `user-dashboard`
- Affected code:
  - `backend/src/models/request-log.model.ts` - Enhanced schema
  - `backend/src/routes/user.routes.ts` - New endpoint
  - `backend/src/repositories/` - New repository for request logs
  - `goproxy/internal/usage/` - Enhanced logging
  - `frontend/src/app/(dashboard)/request-history/` - New page
  - `frontend/src/lib/api.ts` - New API functions
  - `frontend/src/app/(dashboard)/layout.tsx` - Add menu item
