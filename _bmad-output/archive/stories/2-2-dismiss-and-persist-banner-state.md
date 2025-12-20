# Story 2.2: Dismiss and Persist Banner State

Status: done

---

## Story

As a TrollLLM user,
I want to dismiss the critical credit banner and have it stay dismissed for my session,
so that I am not annoyed by repeated warnings after I've acknowledged the alert.

## Acceptance Criteria

1. **AC1: Banner Dismiss Functionality**
   - **Given** the critical banner is displayed
   - **When** I click the dismiss (X) button
   - **Then** the banner hides immediately
   - **And** no visual glitch or layout shift occurs

2. **AC2: Session Persistence via localStorage**
   - **Given** I have dismissed the critical banner
   - **When** I navigate to other pages within the dashboard
   - **Then** the banner does not reappear during my current session
   - **And** the dismiss state is stored in localStorage (NFR8)

3. **AC3: Banner Returns on New Session**
   - **Given** I dismissed the banner in a previous session
   - **When** I log in to a new session (new browser tab/window or after logout)
   - **And** my credits are still in critical state (< $2)
   - **Then** the banner reappears to warn me again
   - **And** the per-session dismissal pattern is maintained

4. **AC4: Banner Re-appears at Lower Threshold (FR9)**
   - **Given** I dismissed the banner when credits were at $1.50
   - **When** my credits drop to a NEW lower amount (e.g., $0.80)
   - **Then** the banner reappears to warn about the new critical level
   - **And** this ensures users are warned when situation gets worse

5. **AC5: Dismiss Button Accessibility**
   - **Given** the dismiss button is displayed
   - **When** I focus on it with keyboard
   - **Then** it has visible focus indicator
   - **And** pressing Enter/Space triggers dismiss
   - **And** `aria-label="Dismiss critical credits alert"` is present

## Tasks / Subtasks

- [x] **Task 1: Implement localStorage Persistence Logic** (AC: #2, #3)
  - [x] 1.1: Create localStorage key `trollllm_banner_dismissed` to store dismiss state
  - [x] 1.2: Store object with `{ dismissed: boolean, balance: number, timestamp: number }`
  - [x] 1.3: On component mount, read localStorage to check if banner was dismissed
  - [x] 1.4: Implement session detection (check if timestamp is from current session)
  - [x] 1.5: Clear dismiss state on logout or new session start

- [x] **Task 2: Update Dashboard Layout for Persistence** (AC: #1, #2)
  - [x] 2.1: Modify `frontend/src/app/(dashboard)/layout.tsx` to read dismiss state from localStorage
  - [x] 2.2: Initialize `isBannerDismissed` from localStorage on component mount
  - [x] 2.3: Update `onDismiss` handler to save to localStorage
  - [x] 2.4: Ensure banner visibility respects both balance threshold AND dismiss state

- [x] **Task 3: Implement Lower Threshold Re-appearance** (AC: #4)
  - [x] 3.1: Store the balance at which banner was dismissed in localStorage
  - [x] 3.2: Compare current balance with stored dismissed balance
  - [x] 3.3: If current balance < stored balance (dropped further), reset dismiss state
  - [x] 3.4: Show banner again to warn about worsening situation

- [x] **Task 4: Verify Dismiss Button Accessibility** (AC: #5)
  - [x] 4.1: Ensure dismiss button is keyboard focusable (tabindex)
  - [x] 4.2: Verify Enter/Space key triggers onClick
  - [x] 4.3: Confirm `aria-label` is present on dismiss button
  - [x] 4.4: Add visible focus ring styling if missing

- [x] **Task 5: Testing & Validation** (AC: all)
  - [x] 5.1: Test dismiss hides banner immediately
  - [x] 5.2: Test banner stays dismissed on page navigation within dashboard
  - [x] 5.3: Test banner reappears in new session (new tab)
  - [x] 5.4: Test banner reappears when balance drops lower
  - [x] 5.5: Test keyboard accessibility (Tab, Enter/Space)
  - [x] 5.6: Verify TypeScript compilation passes

## Dev Notes

### CRITICAL: Story 2-1 Implementation Context

**From Story 2-1 (Done) - Current Implementation:**
- `CriticalCreditsBanner` component at `frontend/src/components/CriticalCreditsBanner.tsx`
- Dashboard layout at `frontend/src/app/(dashboard)/layout.tsx` manages:
  - `isBannerDismissed` state (currently in-memory only, resets on refresh)
  - `onDismiss={() => setIsBannerDismissed(true)}` handler
- Banner renders when: `!creditDataLoading && balance !== null && balance < 2 && !isBannerDismissed`
- Dismiss button already has `aria-label="Dismiss critical credits alert"`

**Key Files to Modify:**
| File | Path | Action |
|------|------|--------|
| Dashboard Layout | `frontend/src/app/(dashboard)/layout.tsx` | MODIFY - Add localStorage logic |
| CriticalCreditsBanner | `frontend/src/components/CriticalCreditsBanner.tsx` | VERIFY accessibility (may not need changes) |

### Implementation Guide

**localStorage Key Structure:**
```typescript
const BANNER_DISMISS_KEY = 'trollllm_banner_dismissed'

interface BannerDismissState {
  dismissed: boolean
  dismissedAtBalance: number  // Balance when dismissed
  sessionId: string          // Unique session identifier
}
```

**Session Detection Strategy:**
```typescript
// Generate session ID on app load (store in sessionStorage)
const SESSION_ID_KEY = 'trollllm_session_id'

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}
```

**Implementation in Dashboard Layout:**
```tsx
// frontend/src/app/(dashboard)/layout.tsx

const BANNER_DISMISS_KEY = 'trollllm_banner_dismissed'
const SESSION_ID_KEY = 'trollllm_session_id'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

function getBannerDismissState(): { dismissed: boolean; dismissedAtBalance: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(BANNER_DISMISS_KEY)
    if (!stored) return null
    const state = JSON.parse(stored)
    // Check if same session
    if (state.sessionId !== getSessionId()) {
      // New session - clear dismiss state
      localStorage.removeItem(BANNER_DISMISS_KEY)
      return null
    }
    return { dismissed: state.dismissed, dismissedAtBalance: state.dismissedAtBalance }
  } catch {
    return null
  }
}

function saveBannerDismissState(balance: number): void {
  if (typeof window === 'undefined') return
  const state = {
    dismissed: true,
    dismissedAtBalance: balance,
    sessionId: getSessionId()
  }
  localStorage.setItem(BANNER_DISMISS_KEY, JSON.stringify(state))
}

// In component:
useEffect(() => {
  const storedState = getBannerDismissState()
  if (storedState) {
    // Check if balance dropped lower than when dismissed
    if (balance !== null && balance < storedState.dismissedAtBalance) {
      // Balance dropped - reset dismiss state, show banner again
      localStorage.removeItem(BANNER_DISMISS_KEY)
      setIsBannerDismissed(false)
    } else {
      setIsBannerDismissed(storedState.dismissed)
    }
  }
}, [balance])

// Update onDismiss:
const handleDismiss = () => {
  setIsBannerDismissed(true)
  if (balance !== null) {
    saveBannerDismissState(balance)
  }
}
```

### Architecture Compliance

**Tech Stack (MUST follow):**
- Next.js 14 App Router
- React 18, TypeScript
- TailwindCSS with CSS variables
- localStorage for persistence, sessionStorage for session ID

**Storage Keys:**
- `trollllm_banner_dismissed` - localStorage - Dismiss state with balance
- `trollllm_session_id` - sessionStorage - Current session identifier

### NFR Compliance

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR8 | State Persistence (localStorage) | Store dismiss state in localStorage |
| NFR12 | Non-intrusive (doesn't block workflow) | Banner remains dismissable |

### Potential Pitfalls

1. **SSR Compatibility:** localStorage/sessionStorage not available on server - guard with `typeof window !== 'undefined'`
2. **Race Condition:** Balance might load after dismiss state check - use useEffect dependency on balance
3. **JSON Parse Error:** Invalid localStorage data - wrap in try/catch
4. **Session ID Collision:** Very unlikely but possible - include timestamp + random string

### Testing Scenarios

| Scenario | Expected Behavior |
|----------|------------------|
| Dismiss banner, refresh page | Banner stays hidden (same session) |
| Dismiss banner, navigate within dashboard | Banner stays hidden |
| Dismiss banner, open new tab | Banner reappears (new session) |
| Dismiss at $1.50, balance drops to $0.80 | Banner reappears |
| Dismiss at $1.50, balance stays $1.50 | Banner stays hidden |
| Dismiss at $1.50, balance increases to $3 | Banner hidden (no longer critical anyway) |

### References

- [Source: _bmad-output/epics.md#Story 2.2] - Acceptance criteria
- [Source: _bmad-output/prd.md#FR8] - Dismiss alerts requirement
- [Source: _bmad-output/prd.md#FR9] - Re-display at lower thresholds
- [Source: _bmad-output/prd.md#NFR8] - State persistence localStorage
- [Source: _bmad-output/ux-design-specification.md#CriticalCreditsBanner] - Component spec
- [Source: _bmad-output/stories/2-1-*.md] - Previous story implementation details

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript compilation: PASSED (no errors)
- Next.js build: PASSED (all routes built successfully)

### Completion Notes List

- ✅ Implemented localStorage persistence with `trollllm_banner_dismissed` key
- ✅ Used sessionStorage for session ID (`trollllm_session_id`) to detect new sessions
- ✅ Banner dismiss state includes: dismissed flag, dismissedAtBalance, sessionId
- ✅ Banner re-appears when balance drops lower than when dismissed (AC4)
- ✅ New session (new tab/window) clears dismiss state, banner reappears (AC3)
- ✅ Added visible focus ring styling to dismiss button (red focus ring with offset)
- ✅ Button already had aria-label="Dismiss critical credits alert"
- ✅ Native button element handles Enter/Space keyboard events automatically

### File List

- `frontend/src/app/(dashboard)/layout.tsx` - MODIFIED: Added localStorage persistence logic, session detection, lower threshold re-appearance
- `frontend/src/components/CriticalCreditsBanner.tsx` - MODIFIED: Added focus ring styling for accessibility

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-20 | Story created with comprehensive context from Story 2-1 and UX spec | Claude Opus 4.5 |
| 2025-12-20 | Implemented all tasks: localStorage persistence, session detection, lower threshold re-appearance, accessibility improvements | Claude Opus 4.5 |
