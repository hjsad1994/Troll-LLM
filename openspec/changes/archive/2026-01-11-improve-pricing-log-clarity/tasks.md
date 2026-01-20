# improve-pricing-log-clarity Implementation Tasks

## Task 1: Update DeductCreditsWithCache signature
**File**: `goproxy/internal/usage/tracker.go`
**Action**: Add `modelID` parameter to `DeductCreditsWithCache` function
**Acceptance**:
- Function signature updated to include `modelID string` parameter
- All call sites compile without errors
- No behavior change (only signature update)

## Task 2: Create new log formatter function
**File**: `goproxy/internal/usage/tracker.go`
**Action**: Create `formatDeductionLog` helper function to build detailed log message
**Acceptance**:
- New function `formatDeductionLog(username, modelID, cost, inputTokens, outputTokens, cacheWriteTokens, cacheHitTokens, remainingCredits, source string)` returns formatted log string
- Function retrieves model name from config
- Function retrieves input/output prices from config
- Function retrieves billing multiplier from config
- Function formats: `💰 [username] Deducted $cost for ModelName (in=N @ $P/MTok, out=N @ $P/MTok, multiplier=X) remaining=$X`
- Function handles cache tokens when present (> 0)
- Function handles "from refCredits" source indicator

## Task 3: Update DeductCreditsWithRefCheck to pass modelID
**File**: `goproxy/internal/usage/tracker.go`
**Action**: Update function signature and pass modelID through to batcher
**Acceptance**:
- `DeductCreditsWithRefCheck` signature updated to include `modelID` parameter
- `QueueCreditUpdateWithRef` call updated (if it needs modelID)
- Log statements use new format with model info

## Task 4: Update atomic deduction logging
**File**: `goproxy/internal/usage/tracker.go` in `deductCreditsAtomic` function
**Action**: Replace existing log statements with new detailed format
**Acceptance**:
- Line 349 (split credits): Uses new format with model name, prices, multiplier
- Line 351 (refCredits only): Uses new format with "from refCredits" indicator
- Line 353 (credits only): Uses new format with model details
- All logs include remaining balance (already available after update)

## Task 5: Update batched write logging
**File**: `goproxy/internal/usage/tracker.go` in `DeductCreditsWithRefCheck` and `DeductCreditsWithCache`
**Action**: Update log statements for batched mode
**Acceptance**:
- Line 215 (refCredits batch): Uses new format
- Line 217 (credits batch): Uses new format
- Line 250 (with cache): Uses new format including cache tokens
- Line 252 (without cache): Uses new format

## Task 6: Update OhMyGPT handler call site
**File**: `goproxy/main.go` in OhMyGPT request handler
**Action**: Pass modelID to DeductCreditsWithCache call
**Acceptance**:
- Find `DeductCreditsWithCache` call in OhMyGPT handler
- Add `modelID` as second parameter
- Verify function compiles

## Task 7: Update Troll key handler call site
**File**: `goproxy/main.go` in Troll key request handler
**Action**: Pass modelID to DeductCreditsWithCache call
**Acceptance**:
- Find `DeductCreditsWithCache` call in Troll handler
- Add `modelID` as second parameter
- Verify function compiles

## Task 8: Update OpenHands handler call site
**File**: `goproxy/main.go` in OpenHands request handler
**Action**: Pass modelID to DeductCreditsWithCache call
**Acceptance**:
- Find `DeductCreditsWithCache` call in OpenHands handler
- Add `modelID` as second parameter
- Verify function compiles

## Task 9: Add unit tests for log formatter
**File**: `goproxy/internal/usage/tracker_test.go`
**Action**: Add tests for `formatDeductionLog` function
**Acceptance**:
- Test case for standard request (input + output only)
- Test case for request with cache tokens
- Test case for refCredits deduction
- Test case for split credits + refCredits
- All tests pass

## Task 10: Manual testing and verification
**Action**: Deploy to dev environment and verify logs
**Acceptance**:
- Make test API requests with different models
- Verify log output matches expected format
- Verify prices match model configuration
- Verify remaining balance is accurate
- Check log volume is acceptable

## Task 11: Update documentation
**File**: `goproxy/README.md` or relevant docs
**Action**: Document the new log format for users/admins
**Acceptance**:
- Log format documented with examples
- Explanation of each field provided
- Document includes how to interpret pricing

## Dependencies
- Task 1 must complete before Tasks 2-5 (need signature update)
- Tasks 2-5 can be done in parallel
- Tasks 6-8 can be done in parallel after Task 1
- Task 9 depends on Task 2
- Task 10 depends on all implementation tasks
- Task 11 can be done anytime (documentation)

## Validation Checklist
- [ ] All code compiles without errors
- [ ] All unit tests pass
- [ ] Manual testing shows correct log format
- [ ] Pricing details are accurate
- [ ] Remaining balance is correct
- [ ] No significant performance degradation
- [ ] Log volume increase is acceptable
- [ ] Documentation is updated
