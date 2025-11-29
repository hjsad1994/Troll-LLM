## 1. Backend - Enhanced Request Log Model
- [x] 1.1 Update `request-log.model.ts` to add fields: `userId`, `model`, `inputTokens`, `outputTokens`, `cacheWriteTokens`, `cacheHitTokens`, `creditsCost`
- [x] 1.2 Add indexes for efficient querying by userId and createdAt

## 2. Backend - Request History API
- [x] 2.1 Create `request-log.repository.ts` with methods to query logs by user
- [x] 2.2 Add GET `/api/user/request-history` endpoint in `user.routes.ts`
- [x] 2.3 Support pagination (limit, offset) and date filtering

## 3. GoProxy - Enhanced Request Logging
- [x] 3.1 Update `usage.LogRequest()` to accept detailed token breakdown
- [x] 3.2 Pass model ID, input/output/cache tokens, and credits cost to log function
- [x] 3.3 Store userId (username) instead of just userKeyId for easier querying

## 4. Frontend - Request History Page
- [x] 4.1 Create new page at `frontend/src/app/(dashboard)/request-history/page.tsx`
- [x] 4.2 Add `getRequestHistory()` function to `frontend/src/lib/api.ts`
- [x] 4.3 Display table with columns: Time, Model, Input Tokens, Output Tokens, Cache, Cost, Status, Latency
- [x] 4.4 Add pagination controls
- [ ] 4.5 Add date range filter (optional)

## 5. Frontend - Navigation
- [x] 5.1 Add "Request History" menu item to dashboard sidebar/layout
- [x] 5.2 Add icon and link to the new page

## 6. Testing & Verification
- [x] 6.1 Test backend API returns correct data
- [x] 6.2 Test frontend displays request history correctly
- [x] 6.3 Verify pagination works
- [x] 6.4 Run lint checks
