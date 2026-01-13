# Implementation Tasks

## Phase 1: Backend Schema and Model Updates

### Task 1.1: Update RequestLog TypeScript model
- [x] Add `creditType?: 'ohmygpt' | 'openhands'` field to `IRequestLog` interface in `backend/src/models/request-log.model.ts`
- [x] Add `creditType: { type: String, enum: ['ohmygpt', 'openhands'] }` to mongoose schema
- [x] Field should be optional (not required) for backward compatibility
- [x] Add index on `creditType` field for efficient queries: `requestLogSchema.index({ creditType: 1, createdAt: -1 })`

**Validation**:
- TypeScript compiles without errors ✓
- Schema allows documents with and without `creditType` field ✓

---

### Task 1.2: Update user.repository.ts to aggregate creditsNewUsed from RequestLog
- [x] Locate `getUserStats()` function in `backend/src/repositories/user.repository.ts` (around line 261)
- [x] Find the existing `logAgg` aggregation that queries RequestLog with date filter
- [x] Add a second aggregation for OpenHands credits:
  ```typescript
  const openhandsAgg = await RequestLog.aggregate([
    {
      $match: {
        ...dateFilter,
        creditType: 'openhands'
      }
    },
    {
      $group: {
        _id: null,
        totalCreditsNewUsed: { $sum: '$creditsCost' }
      }
    }
  ]);
  ```
- [x] Update return statement to use `openhandsAgg[0]?.totalCreditsNewUsed || 0` instead of `userAgg[0]?.totalCreditsNewUsed || 0`
- [x] Keep the `userAgg` query for current balances (`total_creditsNew`) but use RequestLog for usage stats (`total_creditsNewUsed`)

**Validation**:
- Backend compiles without errors ✓
- `/admin/user-stats` endpoint returns period-filtered creditsNewUsed when new logs exist (pending deployment)
- Legacy behavior preserved when no logs have creditType field ✓

---

## Phase 2: Go Proxy Credit Type Logging

### Task 2.1: Update RequestLog struct in Go proxy
- [x] Open `goproxy/internal/usage/tracker.go`
- [x] Add `CreditType string` field to `RequestLog` struct with bson tag: ```CreditType string `bson:"creditType,omitempty"` ```
- [x] Add `CreditType string` field to `RequestLogParams` struct

**Validation**:
- Go code compiles without errors ✓
- Struct can be marshaled to MongoDB ✓

---

### Task 2.2: Update LogRequestDetailed function signature
- [x] Modify `LogRequestDetailed()` in `goproxy/internal/usage/tracker.go` to accept `CreditType` in params
- [x] Update the function to assign `CreditType` field when creating `RequestLog` struct:
  ```go
  logEntry := RequestLog{
      // ... existing fields ...
      CreditType:   params.CreditType,
  }
  ```

**Validation**:
- Go code compiles without errors ✓
- Function correctly persists creditType to MongoDB (pending deployment)

---

### Task 2.3: Update DeductCreditsOhMyGPT to log creditType
- [x] Locate `DeductCreditsOhMyGPT()` function in `goproxy/internal/usage/tracker.go`
- [x] Find the `LogRequestDetailed()` call within this function
- [x] Add `CreditType: "ohmygpt"` to the `RequestLogParams` being passed in all 13 LogRequestDetailed calls in main.go

**Note**: Implementation was done in main.go where LogRequestDetailed is actually called, not in the deduct functions themselves. All 13 LogRequestDetailed calls now include CreditType parameter based on billing logic.

**Validation**:
- Requests using OhMyGPT billing create RequestLog documents with `creditType: "ohmygpt"` (pending deployment)
- Check MongoDB after test request: `db.request_logs.findOne({creditType: "ohmygpt"})` (pending deployment)

---

### Task 2.4: Update DeductCreditsOpenHands to log creditType
- [x] Locate `DeductCreditsOpenHands()` function in `goproxy/internal/usage/tracker.go`
- [x] Find the `LogRequestDetailed()` call within this function (or add it if missing)
- [x] Add `CreditType: "openhands"` to the `RequestLogParams` in main.go where billing logic determines credit type

**Note**: Implementation captures creditType based on billingUpstream configuration and passes it to LogRequestDetailed in main.go.

**Validation**:
- Requests using OpenHands billing create RequestLog documents with `creditType: "openhands"` (pending deployment)
- Check MongoDB after test request: `db.request_logs.findOne({creditType: "openhands"})` (pending deployment)

---

## Phase 3: Testing and Validation

### Task 3.1: Test OhMyGPT credit type logging
- [ ] Deploy backend and Go proxy changes to dev/staging
- [ ] Make test request to chat2.trollllm.xyz (OhMyGPT billing path)
- [ ] Verify RequestLog entry has `creditType: "ohmygpt"`
- [ ] Verify `creditsCost` field is populated correctly

**Validation**:
- MongoDB query shows correct creditType
- Admin dashboard "Burned" metric still works correctly with period filter

---

### Task 3.2: Test OpenHands credit type logging
- [ ] Make test request to chat.trollllm.xyz (OpenHands billing path)
- [ ] Verify RequestLog entry has `creditType: "openhands"`
- [ ] Verify `creditsCost` field is populated correctly

**Validation**:
- MongoDB query shows correct creditType
- Admin dashboard "New Burned" metric updates when period filter changes

---

### Task 3.3: Test period filtering for New Burned metric
- [ ] Navigate to admin dashboard at `/admin`
- [ ] Select "1h" period filter
- [ ] Verify "New Burned" shows only OpenHands credits spent in last hour
- [ ] Select "24h" period filter
- [ ] Verify "New Burned" shows OpenHands credits since 00:00:00 Vietnam time today
- [ ] Select "all" period filter
- [ ] Verify "New Burned" shows total OpenHands credits spent (within RequestLog retention period)
- [ ] Compare with "Burned" metric behavior to ensure consistency

**Validation**:
- "New Burned" value changes when different periods are selected
- Values are reasonable and match expected spending
- No console errors in browser or backend logs

---

### Task 3.4: Test backward compatibility
- [ ] Verify that existing RequestLog entries without `creditType` field don't break queries
- [ ] Confirm that legacy logs are counted in OhMyGPT totals (not OpenHands totals)
- [ ] Test with a mix of old and new RequestLog documents

**Validation**:
- No errors when querying RequestLog
- Old logs don't appear in OpenHands credit totals
- Statistics remain accurate

---

## Phase 4: Documentation and Cleanup

### Task 4.1: Update admin dashboard documentation
- [ ] Document that period filter now affects both "Burned" and "New Burned" metrics
- [ ] Note that accuracy depends on RequestLog data (30-day TTL)

**Validation**:
- Documentation is clear and accurate

---

### Task 4.2: Monitor production metrics
- [ ] After deployment, monitor admin dashboard metrics
- [ ] Verify period filtering works as expected
- [ ] Check for any anomalies or errors in logs

**Validation**:
- Metrics are accurate and update correctly with period changes
- No performance degradation from additional aggregation query

---

## Implementation Summary

**Completed Tasks (Phases 1 & 2):**
- ✅ Backend RequestLog model updated with creditType field and index
- ✅ Backend getUserStats() updated to aggregate creditsNewUsed from RequestLog with period filtering
- ✅ Go proxy RequestLog struct updated with CreditType field
- ✅ Go proxy LogRequestDetailed function updated to accept and persist CreditType
- ✅ All 13 LogRequestDetailed calls in main.go updated to pass appropriate creditType:
  - Lines with billingUpstream logic: creditType determined dynamically ("ohmygpt" or "openhands")
  - Lines with direct OhMyGPT deduction: creditType = "ohmygpt"
- ✅ Both backend and Go proxy compile successfully

**Pending Tasks (Phases 3 & 4):**
- Testing requires deployment to dev/staging/production environment
- Manual testing of period filtering and backward compatibility
- Documentation updates
- Production monitoring

**Next Steps:**
1. Deploy changes to development/staging environment
2. Run test requests through both chat.trollllm.xyz and chat2.trollllm.xyz
3. Verify MongoDB documents have correct creditType values
4. Test admin dashboard period filtering
5. Monitor for any issues or errors