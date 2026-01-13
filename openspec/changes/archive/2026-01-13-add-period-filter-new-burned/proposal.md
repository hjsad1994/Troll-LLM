# Change Proposal: add-period-filter-new-burned

## Overview

Add period-based filtering (1h, 3h, 8h, 24h, 7d, all) for the "New Burned" (creditsNewUsed) metric in the admin dashboard, allowing admins to see OpenHands credit spending broken down by time period similar to how the regular "Burned" metric works.

## Problem Statement

The admin dashboard at `http://localhost:8080/admin` displays a "New Burned" metric showing total creditsNewUsed (OpenHands credits spent), but this metric currently only shows the lifetime total and doesn't respond to the period filter dropdown (1h, 3h, 8h, 24h, 7d, all).

**Current behavior:**
- "Burned" (OhMyGPT credits) respects the period filter and shows spending for the selected timeframe
- "New Burned" (OpenHands credits) ignores the period filter and always shows the lifetime total from the user's `creditsNewUsed` field

**Expected behavior:**
- Both "Burned" and "New Burned" should respect the period filter
- When admin selects "1h", they should see OpenHands credits spent in the last hour
- When admin selects "24h", they should see OpenHands credits spent since 00:00:00 Vietnam time today

## Root Cause Analysis

The issue stems from how the system tracks credit usage:

1. **OhMyGPT credits** (`credits`/`creditsUsed`):
   - Usage is logged in the `RequestLog` collection with `creditsCost` field
   - Period filtering works by querying RequestLog with date range
   - `getUserStats()` aggregates `creditsCost` from RequestLog based on period

2. **OpenHands credits** (`creditsNew`/`creditsNewUsed`):
   - Usage updates the cumulative `creditsNewUsed` field in the User document
   - No field in RequestLog distinguishes OpenHands requests from OhMyGPT requests
   - `getUserStats()` returns the lifetime `creditsNewUsed` total regardless of period
   - Period filtering cannot work without a way to identify which requests used OpenHands credits

**Key insight**: The RequestLog model tracks `creditsCost` but doesn't track which credit system (OhMyGPT vs OpenHands) was used for billing.

## Solution Design

Add a `creditType` field to the RequestLog model to track which credit system was charged, enabling period-based queries for both credit types.

### Architecture Changes

**RequestLog Model Extension**:
```typescript
interface IRequestLog {
  // ... existing fields ...
  creditsCost?: number;           // USD cost deducted
  creditType?: 'ohmygpt' | 'openhands';  // NEW: which credit system was charged
}
```

**Go Proxy Changes**:
- Update `LogRequestDetailed()` to include `creditType` parameter
- Update `DeductCreditsOhMyGPT()` to log requests with `creditType: "ohmygpt"`
- Update `DeductCreditsOpenHands()` to log requests with `creditType: "openhands"`

**Backend Changes**:
- Update `getUserStats()` to aggregate creditsNewUsed from RequestLog where `creditType == 'openhands'`
- Apply date filter to OpenHands credit aggregation based on period parameter
- Maintain backward compatibility for existing logs without `creditType` field

### Why This Approach

**Alternatives considered**:

1. **Use `upstream` field**: Not reliable because both chat.trollllm.xyz and chat2.trollllm.xyz use OpenHands upstream but different credit systems
2. **Infer from model name**: Fragile and doesn't match actual billing behavior
3. **Create separate collection**: Adds complexity and duplication
4. **Accept limitation**: Doesn't meet user requirements for visibility into OpenHands spending

**Selected approach benefits**:
- Minimal schema change (one optional field)
- Directly tracks billing behavior, not inference
- Backward compatible (existing logs default to ohmygpt for legacy compatibility)
- Enables accurate period-based reporting for both credit systems
- Aligns with existing RequestLog pattern (already tracks user, tokens, cost)

## Affected Components

- **Go Proxy** (goproxy):
  - `internal/usage/tracker.go`: Add `creditType` to RequestLog struct and logging functions
  - Both containers (goproxy-ohmygpt, goproxy-openhands) must log the appropriate creditType

- **Backend** (Node.js/TypeScript):
  - `src/models/request-log.model.ts`: Add `creditType` field to schema
  - `src/repositories/user.repository.ts`: Update `getUserStats()` to aggregate creditsNewUsed from RequestLog with period filter

- **Frontend** (Next.js):
  - No changes required (already displays the metric and has period filter UI)

## Migration Strategy

**For existing RequestLog documents**:
- Add `creditType` field as optional (not required)
- Existing logs without `creditType` will be treated as 'ohmygpt' for backward compatibility
- New requests will always include `creditType` field
- No data migration script needed (aggregation handles null/undefined gracefully)

**Deployment sequence**:
1. Deploy backend with updated RequestLog model (optional field)
2. Deploy Go proxy with creditType logging
3. Wait for new logs to accumulate
4. Period filtering becomes accurate as new data is logged

## Validation Plan

**Acceptance criteria**:
1. When admin selects "1h" filter, "New Burned" shows OpenHands credits spent in last hour
2. When admin selects "24h" filter, "New Burned" shows OpenHands credits spent since 00:00:00 Vietnam time today
3. "New Burned" metric changes when different periods are selected
4. Existing "Burned" metric continues to work correctly
5. New RequestLog entries include `creditType` field

**Testing approach**:
1. Deploy changes to staging/development
2. Make test requests on both chat.trollllm.xyz (OpenHands) and chat2.trollllm.xyz (OhMyGPT)
3. Verify RequestLog entries have correct `creditType` values
4. Check admin dashboard with different period filters
5. Validate metrics match expected spending for each period
6. Confirm backward compatibility with existing logs

## Open Questions

None - approach is clear and minimal.

## Related Changes

- Builds on existing admin-creditsnew-stats feature (displays New Burned metric)
- Aligns with fix-24h-billing-filter changes (proper Vietnam timezone handling for 24h period)
- Complements unify-chat2-to-openhands-upstream (billing routing clarity)
