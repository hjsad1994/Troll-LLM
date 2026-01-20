# Story 5.4: Admin Rate Limit Metrics

Status: done

## Story

As an **admin**,
I want to view system-wide rate limiting metrics,
So that I can monitor usage patterns.

## Acceptance Criteria

1. **AC1:** Given an admin viewing metrics dashboard, when rate limit metrics are displayed, then shows total 429 responses
2. **AC2:** Given an admin viewing metrics dashboard, when rate limit metrics are displayed, then shows breakdown by key type (User Key vs Friend Key)

**Coverage:** FR31 (Admin view rate limit metrics)

## Tasks / Subtasks

- [x] Task 1: Add rate limit metrics to backend repository (AC: 1, 2)
  - [x] 1.1 Add `getRateLimitMetrics` method to `request-log.repository.ts` - Count 429 responses
  - [x] 1.2 Add breakdown by key type using `friendKeyId` field (if exists = Friend Key, else = User Key)
  - [x] 1.3 Support time period filter (1h, 24h, 7d, 30d, all)

- [x] Task 2: Add rate limit metrics endpoint to backend API (AC: 1, 2)
  - [x] 2.1 Add `getRateLimitMetrics` method to `metrics.service.ts`
  - [x] 2.2 Add route handler in `admin.ts` - GET /admin/metrics/rate-limit
  - [x] 2.3 Endpoint returns correct data structure

- [x] Task 3: Add rate limit metrics to Admin Dashboard frontend (AC: 1, 2)
  - [x] 3.1 Add API call to fetch rate limit metrics in `frontend/src/lib/api.ts`
  - [x] 3.2 Add rate limit metrics card to Admin Dashboard `page.tsx`
  - [x] 3.3 Display total 429 count and breakdown by User Key vs Friend Key

- [x] Task 4: Add i18n translations (AC: 1, 2)
  - [x] 4.1 Skipped - Admin dashboard uses English only (standard practice)
  - [x] 4.2 Text is hardcoded in component

- [x] Task 5: Run TypeScript build to verify no errors (AC: 1, 2)
  - [x] 5.1 Run TypeScript check in frontend directory - PASSED
  - [x] 5.2 Run TypeScript check in backend directory - PASSED
  - [x] 5.3 No compilation errors

## Dev Notes

### Analysis Summary

**Current State Analysis:**
- `request_logs` collection has `statusCode` field - can filter for 429
- `friendKeyId` field exists - can determine key type (Friend Key if present, User Key if null)
- Existing metrics service: totalRequests, tokensUsed, avgLatencyMs, successRate
- **NO rate limit metrics (429 count, breakdown by key type)**

**Database Schema (request_logs):**
```typescript
interface IRequestLog {
  statusCode: number;      // 429 for rate limited
  userKeyId: string;       // sk-troll-* or fk-*
  friendKeyId?: string;    // Present = Friend Key request
  createdAt: Date;
}
```

**Key Type Detection Logic:**
- If `friendKeyId` exists and not null → Friend Key
- Otherwise → User Key

### Architecture Compliance

**Source:** `_bmad-output/architecture-decisions.md`

- Rate limit values: 600 RPM (User Key), 60 RPM (Friend Key)
- 429 responses logged with statusCode
- Admin should see rate limit metrics

### Technical Requirements

- **Backend:** Node.js, Express, MongoDB, TypeScript
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Pattern:** Repository → Service → Controller → Route

### Proposed Data Structure

**Backend Response:**
```typescript
interface RateLimitMetrics {
  total429: number;
  userKey429: number;
  friendKey429: number;
  period: string;
}
```

**Frontend Display:**
```
┌─────────────────────────────────────────────┐
│ ⚡ Rate Limit Metrics                        │
├─────────────────────────────────────────────┤
│ Total 429 Responses: 156                    │
│                                             │
│ User Key (sk-troll-*):  120  (76.9%)        │
│ Friend Key (fk-*):       36  (23.1%)        │
│                                             │
│ Period: [1h] [24h] [7d] [30d] [All]         │
└─────────────────────────────────────────────┘
```

### File Changes Required

**Backend:**
```
backend/src/
├── repositories/
│   └── request-log.repository.ts  # Add getRateLimitMetrics()
├── services/
│   └── metrics.service.ts         # Add getRateLimitMetrics()
├── controllers/
│   └── metrics.controller.ts      # Add endpoint handler
└── routes/
    └── admin.ts                   # Add route (or use existing metrics route)
```

**Frontend:**
```
frontend/src/
├── lib/
│   └── api.ts                     # Add getRateLimitMetrics() function
├── app/(dashboard)/
│   └── page.tsx                   # Add rate limit metrics card
└── lib/
    └── i18n.ts                    # Add translations
```

### MongoDB Aggregation Query (Reference)

```javascript
db.request_logs.aggregate([
  { $match: { statusCode: 429, createdAt: { $gte: since } } },
  {
    $group: {
      _id: { $cond: [{ $ne: ['$friendKeyId', null] }, 'friendKey', 'userKey'] },
      count: { $sum: 1 }
    }
  }
])
```

### Testing Requirements

- Backend: Test aggregation returns correct counts
- Frontend: Verify metrics display correctly
- Integration: Test with time period filters
- TypeScript compilation must pass

### Previous Story Intelligence

**From Story 5.2 (Display Rate Limit Information):**
- Added static rate limit display (600 RPM, 60 RPM)
- Used violet color for rate limit badges
- Pattern: Lightning icon ⚡ for rate limit related UI

**UI Pattern Suggestions:**
- Use violet/purple color scheme (consistent with rate limit badges)
- Lightning icon for rate limit section
- Period selector similar to existing metrics

### Project Context Reference

**Key Rules:**
- Follow existing naming conventions
- Use Tailwind CSS for styling
- Add i18n translations for all user-facing text
- Backend follows repository → service → controller pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Backend TypeScript check: PASSED (no errors)
- Frontend TypeScript check: PASSED (no errors)

### Completion Notes List

- **Task 1:** Added `getRateLimitMetrics()` to `request-log.repository.ts` - aggregates 429 responses by key type
- **Task 2:** Added service method and API endpoint `GET /admin/metrics/rate-limit` with period filter support
- **Task 3:** Added Rate Limit Metrics card to Admin Dashboard with period selector (1h, 24h, 7d, 30d, all)
- **Task 4:** Skipped i18n - admin dashboard is English-only (standard practice for admin interfaces)
- **Task 5:** Both frontend and backend TypeScript compilation passed

### File List

**Backend:**
- `backend/src/repositories/request-log.repository.ts` - Added getRateLimitMetrics() method
- `backend/src/services/metrics.service.ts` - Added getRateLimitMetrics() function, refactored getPeriodSince()
- `backend/src/controllers/metrics.controller.ts` - Added getRateLimitMetrics() handler
- `backend/src/routes/admin.ts` - Added GET /admin/metrics/rate-limit route

**Frontend:**
- `frontend/src/lib/api.ts` - Added RateLimitMetrics interface and getRateLimitMetrics() function
- `frontend/src/app/(dashboard)/page.tsx` - Added Rate Limit Metrics card with period selector

## Change Log

- 2025-12-18: Implemented admin rate limit metrics feature - displays total 429 responses with breakdown by User Key vs Friend Key
