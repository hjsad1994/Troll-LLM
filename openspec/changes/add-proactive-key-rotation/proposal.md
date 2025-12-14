# Change: Add Proactive Key Rotation for OpenHands

## Why
Currently, OpenHands key rotation only triggers AFTER a request fails with `ExceededBudget` error (HTTP 400). This causes users to experience a failed request before the system rotates to a backup key. We need proactive rotation that detects when a key is approaching its budget limit and rotates BEFORE failure occurs.

## What Changes
- Add `spendEstimate` and `budgetLimit` fields to `openhands_keys` collection
- Track estimated spend after each successful request by calculating cost from token usage
- Check spend threshold (96% of budget) before sending requests
- Proactively rotate to backup key when threshold is reached
- Add admin endpoint to configure budget limit per key

## Impact
- Affected specs: `openhands-management`
- Affected code:
  - `goproxy/internal/openhandspool/model.go` - Add new fields to OpenHandsKey struct
  - `goproxy/internal/openhandspool/pool.go` - Add spend tracking and threshold check
  - `goproxy/internal/openhandspool/rotation.go` - Add proactive rotation logic
  - `goproxy/main.go` - Update handlers to use proactive rotation
  - `backend/src/services/openhands.service.ts` - Add budget configuration endpoint
