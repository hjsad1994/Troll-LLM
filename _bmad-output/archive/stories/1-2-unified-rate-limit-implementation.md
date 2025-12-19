# Story 1.2: Unified Rate Limit Implementation

Status: done

## Story

As an **API user**,
I want all User Keys to have 600 RPM rate limit regardless of any tier value in database,
So that I don't need to worry about tier limitations.

## Acceptance Criteria

1. **AC1:** Given a User Key (`sk-troll-*`) with any tier value in database (dev/pro/null), when 600 requests are made within 60 seconds, then all 600 requests succeed and the 601st request returns 429 status.

2. **AC2:** Given a User Key with tier field having any value (dev/pro/null/missing), when rate limit is checked, then tier is completely ignored and 600 RPM is always applied.

3. **AC3:** Given the legacy `GetFriendKeyOwnerRPM()` function that returns RPM based on Plan, when code is cleaned up, then this function should be removed or deprecated as it contradicts the unified rate limit approach.

4. **AC4:** Given the `ErrFriendKeyOwnerFreeTier` error constant, when code is cleaned up, then this unused error should be removed.

5. **AC5:** All existing tests continue to pass after cleanup.

## Tasks / Subtasks

- [x] Task 1: Remove tier-based RPM logic (AC: 2, 3, 4)
  - [x] 1.1: Remove or deprecate `GetFriendKeyOwnerRPM()` function in `goproxy/internal/userkey/friendkey.go`
  - [x] 1.2: Remove unused `ErrFriendKeyOwnerFreeTier` error constant
  - [x] 1.3: Update comment in `limiter.go` to remove "Dev tier" reference

- [x] Task 2: Verify unified rate limit behavior (AC: 1, 2)
  - [x] 2.1: Add test case for User Key with different tier values (dev/pro/null)
  - [x] 2.2: Verify all tier scenarios get 600 RPM
  - [x] 2.3: Ensure rate limiter ignores any tier information

- [x] Task 3: Regression testing (AC: 5)
  - [x] 3.1: Run all existing tests
  - [x] 3.2: Verify no functionality broken by cleanup

## Dev Notes

### Architecture Requirements

**From architecture-decisions.md:**
- **Tier System Deprecation:** Soft deprecate - Keep field in DB, ignore in code
- **Rate Limit Values:** User Key 600 RPM (constant, not tier-configurable)
- **Key Type Detection:** Use string prefix check, NOT database tier lookup
- **Critical Pattern:** Code completely ignore tier field when validate/authorize

**From PRD:**
- FR18: System can process requests regardless of user tier (Dev/Pro)
- FR20: System can ignore legacy tier field if present in database
- NFR15: Legacy tier field nếu còn trong database không gây error

### Current Codebase Analysis (Story 1.1 Output)

**Completed in Story 1.1:**
- `KeyType` enum với `KeyTypeUser`, `KeyTypeFriend`, `KeyTypeUnknown`
- `GetKeyType(apiKey string)` function using prefix check
- `UserKeyRPM = 600`, `FriendKeyRPM = 60` constants
- `GetRPMForKeyType()` and `GetRPMForAPIKey()` helper functions
- `checkRateLimitWithUsername()` updated to use key type detection

**Remaining Cleanup for Story 1.2:**
1. `GetFriendKeyOwnerRPM()` in `friendkey.go:221-232` - Returns RPM based on Plan (dead code)
2. `ErrFriendKeyOwnerFreeTier` in `friendkey.go:22` - Unused error constant
3. Comment "Dev tier default" in `limiter.go:12` - Outdated comment

### Files to Modify

| File | Change |
|------|--------|
| `goproxy/internal/userkey/friendkey.go` | Remove `GetFriendKeyOwnerRPM()` function (lines 221-232) |
| `goproxy/internal/userkey/friendkey.go` | Remove `ErrFriendKeyOwnerFreeTier` error (line 22) |
| `goproxy/internal/ratelimit/limiter.go` | Update comment to remove "Dev tier" reference |

### Code to Remove

```go
// friendkey.go:22 - REMOVE
ErrFriendKeyOwnerFreeTier  = errors.New("friend key owner is free tier")

// friendkey.go:221-232 - REMOVE ENTIRE FUNCTION
func GetFriendKeyOwnerRPM(owner *FriendKeyOwner) int {
	switch owner.Plan {
	case "pro-troll":
		return 600
	case "pro":
		return 300
	case "dev":
		return 150
	default:
		return 0
	}
}
```

### Previous Story Learnings (Story 1.1)

**Implementation Approach:**
- Key type detection via string prefix (~16ns performance)
- Rate limit constants: `UserKeyRPM=600`, `FriendKeyRPM=60`
- RefCredits bonus (1000 RPM) only applies to User Keys
- Tests include: unit tests, integration tests, benchmark tests

**Files Created in Story 1.1:**
- `goproxy/internal/userkey/keytype_test.go`
- `goproxy/internal/ratelimit/rpm_test.go`
- `goproxy/internal/ratelimit/integration_test.go`

**Files Modified in Story 1.1:**
- `goproxy/internal/userkey/model.go`
- `goproxy/internal/ratelimit/limiter.go`
- `goproxy/main.go`

### Testing Standards

- Run existing tests to ensure no regression
- Add test case verifying tier is ignored
- Test prefixes: `sk-troll-*` (with various tier values in mock)
- All tests must pass before marking complete

### Code Conventions

- Use Go idioms consistent with existing codebase
- Remove dead code completely (no commented-out code)
- Update comments to reflect current behavior

### Project Structure Notes

- Changes confined to `goproxy/internal/userkey/` and `goproxy/internal/ratelimit/`
- No new dependencies required
- Backwards compatible - existing keys continue working

### References

- [Source: _bmad-output/architecture-decisions.md#Tier-System-Deprecation]
- [Source: _bmad-output/epics.md#Story-1.2]
- [Source: _bmad-output/stories/1-1-key-type-detection.md - Previous Story]
- [Source: goproxy/internal/userkey/friendkey.go#GetFriendKeyOwnerRPM]
- [Source: goproxy/internal/ratelimit/limiter.go#DefaultRPM-comment]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

**Implementation Date:** 2025-12-17

**Task 1 - Remove tier-based RPM logic:**
- Removed dead code function `GetFriendKeyOwnerRPM()` from `friendkey.go` (lines 221-232)
- Removed unused error constant `ErrFriendKeyOwnerFreeTier` from `friendkey.go` (line 22)
- Updated comment in `limiter.go` line 12 from "Dev tier default" to "fallback rate limit for unknown key types"

**Task 2 - Verify unified rate limit behavior:**
- Added new test function `TestUserKeyRPMIgnoresTier` in `rpm_test.go`
- Test verifies User Keys with various tier indicators (dev/pro/pro-troll/null) all receive 600 RPM
- Test confirms rate limiter uses only key prefix, completely ignoring tier field
- All 6 tier scenarios tested and passed

**Task 3 - Regression testing:**
- All existing tests pass (15 tests in ratelimit, 2 tests in userkey)
- New test `TestUserKeyRPMIgnoresTier` passes with all 6 sub-tests
- Build compiles successfully with no errors

**Acceptance Criteria Verification:**
- AC1: ✅ User Keys get 600 RPM regardless of tier (verified by test)
- AC2: ✅ Tier field completely ignored (key prefix detection only)
- AC3: ✅ `GetFriendKeyOwnerRPM()` function removed
- AC4: ✅ `ErrFriendKeyOwnerFreeTier` error constant removed
- AC5: ✅ All existing tests continue to pass

### File List

**Modified:**
- `goproxy/internal/userkey/friendkey.go` - Removed `GetFriendKeyOwnerRPM()` function and `ErrFriendKeyOwnerFreeTier` error
- `goproxy/internal/ratelimit/limiter.go` - Updated comment to remove "Dev tier" reference
- `goproxy/internal/ratelimit/rpm_test.go` - Added `TestUserKeyRPMIgnoresTier` test function

### Change Log

- 2025-12-17: Story 1.2 implementation complete - Removed tier-based RPM logic, verified unified 600 RPM for all User Keys

