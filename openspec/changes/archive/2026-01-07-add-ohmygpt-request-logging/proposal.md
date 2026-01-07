# Proposal: Add OhMyGPT API Request Logging

## Summary

Enable API request logging for OhMyGPT requests so that administrators can view OhMyGPT request logs in the admin dashboard (`/admin`). Currently, OhMyGPT requests are not being logged to the `request_logs` collection, making them invisible in the admin interface.

## Problem

As reported by the user (in Vietnamese): "trang /admin hinh nhu API Requests logs khong duoc logs lai nen khong the xem duoc api request log cua ohmygpt"

Translation: "The /admin page shows that API Requests logs are not being logged, so OhMyGPT API request logs cannot be viewed."

### Current Situation

1. **OhMyGPT requests are processed** but not logged to `request_logs` collection
2. **Other upstreams** (main, openhands, troll) properly log requests
3. **Admin dashboard** relies on `request_logs` for request history and analytics
4. **Billing works** for OhMyGPT (credits are deducted, usage is tracked in `ohmygpt_keys` collection)
5. **Request log entries are missing**, creating incomplete visibility

### Root Cause

Looking at the code:

1. **`goproxy/main.go` handlers**:
   - `handleOhMyGPTOpenAIRequest()` (line 1784-1849) - No call to `usage.LogRequestDetailed()`
   - `handleOhMyGPTMessagesRequest()` (line 1853-1927) - No call to `usage.LogRequestDetailed()`

2. **OhMyGPT provider** (`goproxy/internal/ohmygpt/ohmygpt.go`):
   - `ForwardRequest()` and `ForwardMessagesRequest()` don't create request logs
   - Only updates `ohmygpt_keys` collection usage stats

3. **Other upstreams** have proper logging:
   - `handleMainTargetRequestOpenAI()` calls `usage.LogRequestDetailed()` (line 1022)
   - `handleOpenHandsOpenAIRequest()` calls `usage.LogRequestDetailed()` (line 1104)

## Solution

Add request logging for OhMyGPT requests in the GoProxy handler functions, consistent with existing logging patterns for other upstreams.

### Scope

- Add `usage.LogRequestDetailed()` call to `handleOhMyGPTOpenAIRequest()`
- Add `usage.LogRequestDetailed()` call to `handleOhMyGPTMessagesRequest()`
- Include proper parameters: userID, userKeyID, model, tokens, status, latency

### Out of Scope

- Modifying the existing request log schema (it already supports all needed fields)
- Frontend changes (admin UI already displays request logs from `request_logs`)
- Backend API changes (already has endpoints to read request logs)

## Related Components

- `goproxy/main.go` - OhMyGPT request handlers
- `goproxy/internal/usage/tracker.go` - Request logging functions
- `backend/src/repositories/request-log.repository.ts` - Request log queries
- Frontend admin pages consuming `/api/admin/*` endpoints

## Acceptance Criteria

1. OhMyGPT requests (both OpenAI and Anthropic formats) create entries in `request_logs` collection
2. Request logs include: userId, userKeyID, model, inputTokens, outputTokens, cache tokens, creditsCost, statusCode, latencyMs, isSuccess
3. Admin dashboard (`/admin`) shows OhMyGPT requests in request history
4. Model stats endpoint (`/api/admin/model-stats`) includes OhMyGPT models
5. No performance degradation (use existing batched writes via `GetBatcher().QueueRequestLog()`)

## Alternatives Considered

1. **Log in OhMyGPT provider** instead of handlers
   - Rejected: Would require passing additional context (username, userID) to provider
   - Current pattern keeps logging in handler for consistency

2. **Create separate ohmygpt_request_logs collection**
   - Rejected: Unnecessary duplication; existing schema is upstream-agnostic
   - Would require frontend/backend changes to query multiple collections

3. **Skip logging entirely**
   - Rejected: Defeats purpose of admin visibility and debugging

## Impact Assessment

- **Low risk**: Adding logging, not changing request handling logic
- **No breaking changes**: Pure addition, no modifications to existing behavior
- **Storage**: Adds one document per OhMyGPT request to `request_logs` (already TTL-indexed to 30 days)
- **Performance**: Minimal impact using existing batched write system
