# Story 3.1: Automatic Credit Polling

Status: done

---

## Story

As a TrollLLM user,
I want my credit balance to refresh automatically at regular intervals,
so that I always see up-to-date information without manually refreshing the page.

## Acceptance Criteria

1. **AC1: 30-Second Polling Interval**
   - **Given** I am on the dashboard
   - **When** 30 seconds have passed since the last fetch
   - **Then** the system automatically fetches updated credit data
   - **And** the widget updates with new balance if changed
   - **And** polling does not impact performance (<1% CPU overhead - NFR3)

2. **AC2: Pause Polling When Page Not Visible**
   - **Given** I navigate away from the dashboard tab
   - **When** the browser tab is not visible (hidden)
   - **Then** polling stops to conserve resources
   - **And** no unnecessary API calls are made

3. **AC3: Resume Polling When Page Becomes Active**
   - **Given** I return to the dashboard tab
   - **When** the page becomes visible again
   - **Then** polling resumes automatically
   - **And** an immediate fetch is triggered to get fresh data

4. **AC4: Cleanup on Component Unmount**
   - **Given** I navigate to a different page within the app
   - **When** the dashboard component unmounts
   - **Then** polling interval is properly cleared
   - **And** no memory leaks occur

## Tasks / Subtasks

- [x] **Task 1: Verify Existing Polling Implementation** (AC: #1)
  - [x] 1.1: Review `layout.tsx` - confirm 30s polling exists (line 123-125)
  - [x] 1.2: Review `CreditsStatusWidget.tsx` - confirm 30s polling exists
  - [x] 1.3: Verify interval cleanup on unmount

- [x] **Task 2: Implement Page Visibility Detection** (AC: #2, #3)
  - [x] 2.1: Add `visibilitychange` event listener in `layout.tsx`
  - [x] 2.2: Pause polling when `document.hidden === true`
  - [x] 2.3: Resume polling when `document.hidden === false`
  - [x] 2.4: Trigger immediate fetch when page becomes visible

- [x] **Task 3: Ensure Proper Cleanup** (AC: #4)
  - [x] 3.1: Verify interval is cleared in useEffect cleanup
  - [x] 3.2: Remove visibility event listener on unmount
  - [x] 3.3: Test for memory leaks

- [x] **Task 4: Testing & Validation** (AC: all)
  - [x] 4.1: Test polling runs every 30 seconds
  - [x] 4.2: Test polling pauses when tab is hidden
  - [x] 4.3: Test polling resumes when tab becomes visible
  - [x] 4.4: Verify TypeScript compilation passes
  - [x] 4.5: Verify build succeeds

## Dev Notes

### CRITICAL: Existing Implementation Analysis

**Current State in `layout.tsx` (line 94-126):**
```tsx
useEffect(() => {
  if (!isLoggedIn) return

  const fetchCreditData = async () => {
    // ... fetch logic
  }

  fetchCreditData()

  // Refresh every 30 seconds - ALREADY IMPLEMENTED
  const interval = setInterval(fetchCreditData, 30000)
  return () => clearInterval(interval)
}, [isLoggedIn])
```

**Current State in `CreditsStatusWidget.tsx` (line 131-136):**
```tsx
fetchData()

// Refresh every 30 seconds - ALREADY IMPLEMENTED
const interval = setInterval(fetchData, 30000)
return () => clearInterval(interval)
```

### What's Already Done ✅
- 30-second polling interval (AC1 partial)
- Interval cleanup on unmount (AC4 partial)

### What Needs to Be Added ❌
- Page Visibility API integration (AC2, AC3)
- Immediate fetch when page becomes visible (AC3)

### Implementation Guide

**Page Visibility API Pattern:**
```tsx
// In layout.tsx useEffect
useEffect(() => {
  if (!isLoggedIn) return

  let intervalId: NodeJS.Timeout | null = null

  const fetchCreditData = async () => {
    // ... existing fetch logic
  }

  const startPolling = () => {
    if (intervalId) return // Already polling
    fetchCreditData() // Immediate fetch
    intervalId = setInterval(fetchCreditData, 30000)
  }

  const stopPolling = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopPolling()
    } else {
      startPolling()
    }
  }

  // Initial start
  startPolling()

  // Listen for visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    stopPolling()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [isLoggedIn])
```

### Key Files to Modify

| File | Path | Action |
|------|------|--------|
| Dashboard Layout | `frontend/src/app/(dashboard)/layout.tsx` | MODIFY - Add visibility detection |
| CreditsStatusWidget | `frontend/src/components/CreditsStatusWidget.tsx` | OPTIONAL - May not need changes if layout handles it |

### Architecture Compliance

**Tech Stack:**
- Next.js 14 App Router
- React 18 useEffect hooks
- Page Visibility API (standard browser API)

### NFR Compliance

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR3 | Polling Overhead <1% CPU | 30s interval is efficient, pausing when hidden reduces even more |
| NFR7 | Error Recovery Auto-retry | Existing try/catch, polling will retry on next interval |

### Testing Scenarios

| Scenario | Expected Behavior |
|----------|------------------|
| Stay on dashboard 60s | 2 polling fetches occur |
| Switch to another tab | Polling stops |
| Return to dashboard tab | Immediate fetch + polling resumes |
| Navigate to /checkout | Polling stops (component unmount) |
| Return to /dashboard | New polling starts |

### References

- [Source: _bmad-output/epics.md#Story 3.1] - Acceptance criteria
- [Source: _bmad-output/prd.md#FR14] - Balance updates without refresh
- [Source: _bmad-output/prd.md#FR15] - Refresh at regular intervals
- [Source: _bmad-output/prd.md#NFR3] - Polling overhead <1% CPU
- [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript compilation: PASSED (no errors)

### Completion Notes List

- ✅ Verified existing 30s polling interval was already in place
- ✅ Added Page Visibility API integration with `visibilitychange` event listener
- ✅ Implemented `startPolling()` function that triggers immediate fetch and sets up 30s interval
- ✅ Implemented `stopPolling()` function that clears interval when tab is hidden
- ✅ Added `handleVisibilityChange()` to pause/resume polling based on tab visibility
- ✅ Initial polling only starts if page is visible (`!document.hidden`)
- ✅ Proper cleanup: interval cleared AND event listener removed on unmount
- ✅ Uses `ReturnType<typeof setInterval>` for proper TypeScript typing

### File List

- `frontend/src/app/(dashboard)/layout.tsx` - MODIFIED: Added Page Visibility API integration for smart polling

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-20 | Story created - 30s polling already exists, need visibility detection | Claude Opus 4.5 |
| 2025-12-20 | Implemented Page Visibility API for pause/resume polling | Claude Opus 4.5 |
