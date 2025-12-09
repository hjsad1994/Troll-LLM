## 1. Backend Implementation
- [x] 1.1 Add `getDetailedUsageByPeriod(userId: string, period: string)` method to `request-log.repository.ts`
  - Returns: inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens, creditsBurned, requestCount
- [x] 1.2 Add `GET /user/detailed-usage` endpoint to `user.routes.ts` (requires JWT auth)
  - Query params: `?period=1h|24h|7d|30d`
  - Returns detailed breakdown for **current user only**

## 2. Frontend Implementation
- [x] 2.1 Create `frontend/src/app/(dashboard)/dashboard-test/page.tsx` (clone from dashboard)
- [x] 2.2 Layout uses parent dashboard layout (no separate layout needed)
- [x] 2.3 Add API function `getDetailedUsage(period)` to `lib/api.ts`
- [x] 2.4 Replace Credits Usage card with Detailed Usage card showing:
  - Input Tokens
  - Output Tokens
  - Cache Write Tokens
  - Cache Hit Tokens
  - Credits Burned
  - Request Count
- [x] 2.5 Add translations for new labels (en + vi)

## 3. Navigation (Blocked)
- [x] 3.1 Do NOT add to Sidebar yet (page accessible via direct URL only for testing)

## 4. Validation
- [ ] 4.1 Test user can only see their own data
- [ ] 4.2 Test period switching (1h, 24h, 7d, 30d)
- [ ] 4.3 Verify data accuracy matches request_logs aggregation for that user
