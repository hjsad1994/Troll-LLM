# Story 2.1: Critical Credits Banner Display

Status: done

---

## Story

As a TrollLLM user,
I want to see a prominent alert banner when my credits fall below $2,
so that I am warned before running out of credits unexpectedly.

## Acceptance Criteria

1. **AC1: Banner Visibility When Critical**
   - **Given** my credit balance is less than $2
   - **When** I view the dashboard
   - **Then** a critical alert banner appears below the header
   - **And** the banner is visually prominent with red/critical styling
   - **And** the banner is positioned below the header, above main content

2. **AC2: Banner Content**
   - **Given** the critical banner is displayed
   - **When** I read the banner content
   - **Then** I see my current balance (e.g., "$1.50")
   - **And** I see estimated remaining requests (e.g., "~35 requests remaining")
   - **And** I see a clear "Top-up Now" call-to-action button

3. **AC3: Banner Does Not Block Workflow**
   - **Given** the critical banner is displayed
   - **When** I continue working on the dashboard
   - **Then** the banner does not block or cover any content (NFR12)
   - **And** the dashboard remains fully functional
   - **And** the banner takes minimal vertical space

4. **AC4: Banner Hidden When Not Critical**
   - **Given** my credit balance is $2 or more
   - **When** I view the dashboard
   - **Then** no critical banner is displayed
   - **And** the dashboard layout adjusts normally without banner space

5. **AC5: Banner Accessibility**
   - **Given** the critical banner is displayed
   - **When** a screen reader reads the banner
   - **Then** appropriate `role="alert"` is provided
   - **And** `aria-live="assertive"` announces the critical status
   - **And** the dismiss button has proper `aria-label`

## Tasks / Subtasks

- [x] **Task 1: Create CriticalCreditsBanner Component** (AC: #1, #2, #5)
  - [x] 1.1: Create new file `frontend/src/components/CriticalCreditsBanner.tsx`
  - [x] 1.2: Define props interface: `balance`, `estimatedRequests`, `onTopUp`, `onDismiss`
  - [x] 1.3: Implement banner container with critical red styling (bg-red-50, border-red-200)
  - [x] 1.4: Add warning icon (⚠️ or AlertTriangle from lucide-react)
  - [x] 1.5: Display current balance formatted as "$X.XX"
  - [x] 1.6: Display estimated requests using `formatEstimatedRequests` from CreditsStatusWidget
  - [x] 1.7: Add "Top-up Now" button with primary styling
  - [x] 1.8: Add dismiss (X) button for closing banner
  - [x] 1.9: Add accessibility attributes: `role="alert"`, `aria-live="assertive"`

- [x] **Task 2: Integrate Banner into Dashboard Layout** (AC: #1, #3, #4)
  - [x] 2.1: Identify dashboard layout file (likely `frontend/src/app/(dashboard)/layout.tsx` or similar)
  - [x] 2.2: Import CriticalCreditsBanner component
  - [x] 2.3: Add banner below header, above main content area
  - [x] 2.4: Conditionally render banner only when `balance < 2`
  - [x] 2.5: Pass balance and estimatedRequests from credit data
  - [x] 2.6: Ensure layout adjusts when banner is shown/hidden (no layout shift)

- [x] **Task 3: Connect Banner to Credit Data** (AC: #2, #4)
  - [x] 3.1: Determine data source - either prop from parent or useEffect fetch
  - [x] 3.2: Option A: Lift state up from CreditsStatusWidget (share credit data)
  - [x] 3.3: Option B: Create shared context/hook for credit data
  - [x] 3.4: Ensure banner shows same balance as widget (consistent data)
  - [x] 3.5: Handle loading state - don't show banner while data loading

- [x] **Task 4: Implement Top-up Navigation** (AC: #2)
  - [x] 4.1: Connect "Top-up Now" button to `/checkout` page
  - [x] 4.2: Use Next.js Link or router.push for navigation
  - [x] 4.3: Verify checkout page exists and is accessible

- [x] **Task 5: Testing & Validation** (AC: all)
  - [x] 5.1: Test banner appears when balance < $2
  - [x] 5.2: Test banner hidden when balance >= $2
  - [x] 5.3: Verify banner doesn't block content
  - [x] 5.4: Test accessibility with screen reader
  - [x] 5.5: Test Top-up navigation works
  - [x] 5.6: Verify build passes without TypeScript errors

## Dev Notes

### CRITICAL: Epic 1 Learnings (Apply to Epic 2)

**From Story 1-1 (Done):**
- CreditsStatusWidget integrated into `Header.tsx` at line ~109
- Widget uses `size="sm"` in header context
- Conditional render pattern: `{isLoggedIn && <Component />}`
- API: `getUserProfile()` returns `credits` and `refCredits`

**From Story 1-2 (Done):**
- Traffic light thresholds: `>$5` green, `$2-5` yellow, `<$2` red
- Critical threshold is `balance < 2`
- WCAG AA accessibility patterns established: `role`, `aria-live`, `aria-label`

**From Story 1-3 (Done):**
- `getDetailedUsage('7d')` API returns usage data for estimation
- `formatEstimatedRequests()` helper exported from CreditsStatusWidget
- Parallel fetch pattern: `Promise.all([getUserProfile(), getDetailedUsage()])`

**From Story 1-4 (Done):**
- Error state handling with `error` state variable
- Auto-retry on 30s interval continues even on error
- Loading/error states maintain consistent dimensions (no layout shift)

### Architecture Compliance

**Tech Stack (MUST follow):**
- Next.js 14 App Router
- React 18, TypeScript
- TailwindCSS with CSS variables
- Component location: `frontend/src/components/`

**File Locations:**
| File | Path | Action |
|------|------|--------|
| New Banner Component | `frontend/src/components/CriticalCreditsBanner.tsx` | CREATE |
| Dashboard Layout | `frontend/src/app/(dashboard)/layout.tsx` or page | MODIFY |
| CreditsStatusWidget | `frontend/src/components/CreditsStatusWidget.tsx` | IMPORT helpers |

### UX Design Spec Requirements

**From UX Design Specification - CriticalCreditsBanner:**
```typescript
interface CriticalCreditsBannerProps {
  balance: number;
  estimatedRequests: number;
  onTopUp: () => void;
  onDismiss: () => void;
  isDismissed?: boolean;
}
```

**Behavior:**
- Trigger: Balance < $2
- Dismissable per session (localStorage)
- Reappears next session
- `role="alert"`, `aria-live="assertive"` (urgent notification)

**Color Tokens:**
```css
/* Critical state */
bg-red-50 dark:bg-red-950
border-red-200 dark:border-red-800
text-red-800 dark:text-red-200
```

### Implementation Guide

**Banner Component Structure:**
```tsx
'use client'

import { X } from 'lucide-react'
import Link from 'next/link'
import { formatEstimatedRequests } from './CreditsStatusWidget'

interface CriticalCreditsBannerProps {
  balance: number
  estimatedRequests: number | null
  onDismiss: () => void
}

export default function CriticalCreditsBanner({
  balance,
  estimatedRequests,
  onDismiss
}: CriticalCreditsBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Warning icon */}
          <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>

          {/* Message */}
          <p className="text-sm text-red-800 dark:text-red-200">
            <span className="font-medium">Credits running low!</span>
            {' '}Balance: ${balance.toFixed(2)}
            {estimatedRequests !== null && (
              <span className="text-red-600 dark:text-red-400">
                {' '}• {formatEstimatedRequests(estimatedRequests)} requests remaining
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Top-up CTA */}
          <Link
            href="/checkout"
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            Top-up Now
          </Link>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            aria-label="Dismiss critical credits alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Data Flow Considerations

**Option A: Prop Drilling (Simpler)**
- Dashboard layout fetches credit data
- Passes to both Header (widget) and Banner
- Keeps data consistent

**Option B: Shared Context (More Complex)**
- Create CreditContext with balance, estimatedRequests
- Both components consume from context
- Better for many consumers

**Recommendation:** Start with Option A (prop drilling) for simplicity. Refactor to context in Epic 3 if needed for real-time updates.

### Layout Integration Points

**Dashboard Layout Structure (Expected):**
```tsx
// frontend/src/app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div>
      <Header />
      {/* ADD BANNER HERE */}
      {balance < 2 && !isDismissed && (
        <CriticalCreditsBanner
          balance={balance}
          estimatedRequests={estimatedRequests}
          onDismiss={() => setIsDismissed(true)}
        />
      )}
      <main>{children}</main>
    </div>
  )
}
```

### Testing Requirements

**Manual Testing Checklist:**
1. Set balance < $2 → Banner appears
2. Set balance >= $2 → Banner hidden
3. Click "Top-up Now" → Navigate to /checkout
4. Banner doesn't cover content below
5. Screen reader announces alert
6. Banner is dismissable (Story 2.2 will add persistence)

**Build Verification:**
- TypeScript compilation passes
- No console errors
- Banner renders correctly

### Potential Pitfalls

1. **Data Consistency:** Ensure banner shows same balance as widget - use same data source
2. **Layout Shift:** Banner appearing/disappearing shouldn't cause content to jump
3. **Z-Index:** Banner should be below header tooltip (z-50) but above content
4. **Mobile Responsive:** Banner should work on mobile - may need to stack elements
5. **Dark Mode:** Verify colors work in both light and dark themes

### NFR Compliance

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR12 | Non-intrusive (doesn't block workflow) | Banner below header, dismissable |
| NFR8 | State Persistence (localStorage) | Handled in Story 2.2 |
| NFR10 | Color Contrast WCAG AA | Use red-800 on red-50 background |

### References

- [Source: _bmad-output/epics.md#Story 2.1] - Acceptance criteria
- [Source: _bmad-output/prd.md#FR7] - Prominent alert when critical
- [Source: _bmad-output/prd.md#NFR12] - Non-intrusive banner
- [Source: _bmad-output/ux-design-specification.md#CriticalCreditsBanner] - Component spec
- [Source: frontend/src/components/CreditsStatusWidget.tsx] - Reuse formatEstimatedRequests
- [Source: _bmad-output/stories/1-4-*.md] - Error handling patterns

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript compilation: PASSED (npx tsc --noEmit)
- Next.js build: Compiled successfully, types validated

### Completion Notes List

1. **CriticalCreditsBanner Component Created** - New component at `frontend/src/components/CriticalCreditsBanner.tsx` with:
   - Props interface: `balance`, `estimatedRequests`, `onDismiss`
   - Critical red styling with dark mode support (bg-red-50/bg-red-950, border-red-200/border-red-800)
   - Warning icon (⚠️ emoji)
   - Balance display formatted as "$X.XX"
   - Estimated requests using `formatEstimatedRequests` helper
   - "Top-up Now" button with Link to `/checkout`
   - Dismiss button with SVG X icon
   - Full accessibility: `role="alert"`, `aria-live="assertive"`, `aria-label` on dismiss button

2. **Dashboard Layout Integration** - Modified `frontend/src/app/(dashboard)/layout.tsx`:
   - Added credit data fetching with `getUserProfile()` and `getDetailedUsage('7d')`
   - Parallel fetch using `Promise.all` (consistent with CreditsStatusWidget pattern)
   - Conditional banner render: only when `balance < 2` and not dismissed and not loading
   - Auto-refresh every 30 seconds
   - Flex column layout to accommodate banner without layout shift

3. **Data Architecture** - Implemented Option A (prop drilling) as recommended:
   - Layout fetches credit data and passes to banner
   - Uses same API calls as CreditsStatusWidget for data consistency
   - Loading state prevents banner flash during initial load

4. **Top-up Navigation** - Next.js Link component to `/checkout` page (verified exists)

5. **Note:** Used inline SVG for X icon instead of lucide-react (not installed in project), following existing codebase pattern from Header.tsx

### File List

| File | Action | Description |
|------|--------|-------------|
| frontend/src/components/CriticalCreditsBanner.tsx | CREATE | New banner component with accessibility |
| frontend/src/app/(dashboard)/layout.tsx | MODIFY | Added credit data fetching and banner integration |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-20 | Story created with comprehensive context from Epic 1 and UX spec | Claude Opus 4.5 |
| 2025-12-20 | Story implementation completed - all tasks done, ready for review | Claude Opus 4.5 |
| 2025-12-20 | Story marked as done | Tai |
