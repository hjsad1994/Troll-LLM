---
stepsCompleted: [1, 2, 3, 4]
status: complete
inputDocuments:
  - '_bmad-output/prd.md'
  - '_bmad-output/archive/architecture.md'
  - '_bmad-output/ux-design-specification.md'
project_name: 'TrollLLM'
user_name: 'Tai'
date: '2025-12-20'
---

# TrollLLM - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for TrollLLM, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Credit Status Display**
- FR1: Users can view their current credit balance in the dashboard header
- FR2: Users can see a color-coded status indicator (green/yellow/red) representing credit health
- FR3: Users can see estimated remaining requests based on their usage history
- FR4: Users can view credit status without navigating away from current page

**Credit Thresholds & Alerts**
- FR5: System can determine credit status based on predefined thresholds ($5, $2)
- FR6: Users can see visual distinction between OK (>$5), Low ($2-5), and Critical (<$2) states
- FR7: Users can receive prominent alert when credits fall below critical threshold
- FR8: Users can dismiss critical credit alerts
- FR9: System can re-display alerts when credits drop to lower thresholds

**Usage Estimation**
- FR10: System can calculate average cost per request from user's recent history
- FR11: System can estimate remaining requests based on current balance and average cost
- FR12: Users can see "~X requests remaining" estimation
- FR13: System can handle users with no usage history (fallback display)

**Real-time Updates**
- FR14: Users can see credit balance updates without manual page refresh
- FR15: System can refresh credit data at regular intervals (polling)
- FR16: System can trigger immediate refresh after payment success
- FR17: Users can see updated status indicator immediately after credit changes

**Navigation & Actions**
- FR18: Users can navigate to top-up page directly from credit widget
- FR19: Users can navigate to top-up page from critical alert banner
- FR20: Users can access credit details from widget (optional click-through)

**Error Handling**
- FR21: Users can see fallback UI when credit data fails to load
- FR22: System can gracefully degrade without crashing dashboard
- FR23: Users can see loading state while credit data is being fetched

### NonFunctional Requirements

**Performance**
- NFR1: Widget Load Time <100ms - Time from dashboard load to widget visible
- NFR2: Data Refresh <500ms - Time to fetch and update credit data
- NFR3: Polling Overhead <1% CPU - Background polling không impact performance
- NFR4: UI Responsiveness No jank - Status changes render instantly (<16ms)

**Reliability**
- NFR5: Widget Availability 99.9% - Widget displays correctly khi dashboard loads
- NFR6: Graceful Degradation 100% - Dashboard không crash nếu widget fails
- NFR7: Error Recovery Auto-retry - Failed fetches retry sau 30s
- NFR8: State Persistence - Banner dismiss state persists trong localStorage

**Usability**
- NFR9: Visual Clarity - Users hiểu status trong <1s (instant recognition)
- NFR10: Color Contrast WCAG AA - Sufficient contrast cho readability
- NFR11: Mobile Friendly - Widget usable trên mobile screens (responsive)
- NFR12: Non-intrusive - Banner không block workflow (dismissable)

**Compatibility**
- NFR13: Browser Support - Chrome, Firefox, Safari, Edge (latest versions)
- NFR14: Existing UI Zero regression - Không break existing dashboard components
- NFR15: API Compatibility - Backward compatible với existing `/api/user/me` endpoint

### Additional Requirements

**From Architecture (Brownfield Integration):**
- Integrate với existing Next.js 14 dashboard (App Router)
- Sử dụng existing React 18, TailwindCSS, TypeScript stack
- Tận dụng existing `/api/user/me` endpoint để lấy credit balance
- Không cần starter template - extend existing codebase
- Frontend location: `frontend/src/components/` cho new components
- Existing i18n support (next-intl) - components cần support Vietnamese

**From UX Design (Component & Styling):**
- Design System: shadcn/ui + Tailwind CSS
- Custom components cần implement:
  - `CreditsStatusWidget` - Traffic Light Widget cho header
  - `CriticalCreditsBanner` - Dismissable alert banner
  - `StatusDot` - Reusable status indicator
- Color tokens cho status:
  - Green (#22c55e): Credits > $5
  - Yellow (#eab308): Credits $2-5
  - Red (#ef4444): Credits < $2
- Typography: Inter (primary), JetBrains Mono (code)
- Accessibility: WCAG AA compliance, focus states, keyboard navigation
- Responsive: Desktop-first, mobile adaptations
- Banner behavior: Dismissable per session (localStorage), reappears next session

**Technical Implementation Notes:**
- Polling strategy: 30s interval + immediate refresh sau payment
- State management: Local component state + localStorage cho banner dismiss
- Error handling: Fallback UI, graceful degradation, auto-retry after 30s

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | View credit balance in header |
| FR2 | Epic 1 | Color-coded status indicator |
| FR3 | Epic 1 | Estimated remaining requests |
| FR4 | Epic 1 | View status without navigating |
| FR5 | Epic 1 | Determine status by thresholds |
| FR6 | Epic 1 | Visual distinction OK/Low/Critical |
| FR7 | Epic 2 | Prominent alert when critical |
| FR8 | Epic 2 | Dismiss alerts |
| FR9 | Epic 2 | Re-display alerts at lower thresholds |
| FR10 | Epic 1 | Calculate average cost per request |
| FR11 | Epic 1 | Estimate remaining requests |
| FR12 | Epic 1 | Display "~X requests remaining" |
| FR13 | Epic 1 | Handle users with no history |
| FR14 | Epic 3 | Balance updates without refresh |
| FR15 | Epic 3 | Refresh at regular intervals |
| FR16 | Epic 3 | Immediate refresh after payment |
| FR17 | Epic 3 | Updated indicator after changes |
| FR18 | Epic 2 | Navigate to top-up from widget |
| FR19 | Epic 2 | Navigate to top-up from banner |
| FR20 | Epic 2 | Access credit details from widget |
| FR21 | Epic 1 | Fallback UI when data fails |
| FR22 | Epic 1 | Graceful degradation |
| FR23 | Epic 1 | Loading state while fetching |

## Epic List

### Epic 1: Credit Status Visibility
Users có thể xem ngay lập tức trạng thái credits của mình khi mở dashboard - biết còn bao nhiêu tiền và ước tính còn bao nhiêu requests.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR10, FR11, FR12, FR13, FR21, FR22, FR23

**User Value:** Giải quyết core problem "không biết còn bao nhiêu credits" - users glance và know instantly.

**Components:** CreditsStatusWidget, StatusDot

---

### Epic 2: Proactive Credit Alerts
Users nhận được cảnh báo chủ động khi credits thấp, có thể dismiss và được nhắc lại khi cần - không bao giờ bị surprise hết credits.

**FRs covered:** FR7, FR8, FR9, FR18, FR19, FR20

**User Value:** Chuyển từ reactive (discover khi fail) sang proactive (warn trước khi xảy ra).

**Components:** CriticalCreditsBanner

---

### Epic 3: Real-time Credit Updates
Users thấy balance cập nhật tự động theo thời gian thực - sau khi payment hoặc sử dụng API, không cần refresh manual.

**FRs covered:** FR14, FR15, FR16, FR17

**User Value:** Dashboard luôn phản ánh trạng thái chính xác, tăng trust và confidence.

**Components:** Polling logic, event-driven refresh

---

## Epic 1: Credit Status Visibility

Users có thể xem ngay lập tức trạng thái credits của mình khi mở dashboard - biết còn bao nhiêu tiền và ước tính còn bao nhiêu requests.

### Story 1.1: Display Credit Balance in Dashboard Header

As a TrollLLM user,
I want to see my current credit balance displayed in the dashboard header,
So that I can instantly know how much money I have left without searching.

**Acceptance Criteria:**

**Given** I am logged into the TrollLLM dashboard
**When** the page loads
**Then** I see my current credit balance (e.g., "$15.50") in the header area
**And** the balance is formatted as currency with 2 decimal places
**And** the widget loads within 100ms (NFR1)

---

### Story 1.2: Traffic Light Status Indicator

As a TrollLLM user,
I want to see a color-coded status indicator (🟢🟡🔴) next to my balance,
So that I can instantly understand my credit health without reading numbers.

**Acceptance Criteria:**

**Given** my credit balance is greater than $5
**When** I view the widget
**Then** I see a green status dot (🟢) indicating "OK" status

**Given** my credit balance is between $2 and $5
**When** I view the widget
**Then** I see a yellow status dot (🟡) indicating "Low" status

**Given** my credit balance is less than $2
**When** I view the widget
**Then** I see a red status dot (🔴) indicating "Critical" status

**And** the status includes accessible text (not just color) for WCAG AA compliance (NFR10)

---

### Story 1.3: Estimated Requests Remaining

As a TrollLLM user,
I want to see an estimate of remaining requests based on my usage history,
So that I can plan my coding session and know when to top-up.

**Acceptance Criteria:**

**Given** I have usage history in the last 7 days
**When** the widget calculates remaining requests
**Then** it shows "~X requests remaining" based on my average cost per request
**And** the estimate is clearly marked as approximate with "~" prefix

**Given** I have no usage history (new user)
**When** the widget displays
**Then** it shows only the balance without request estimate
**Or** shows a reasonable default estimate based on average model cost

---

### Story 1.4: Widget Loading and Error States

As a TrollLLM user,
I want to see appropriate loading and error states for the credit widget,
So that I always know the system status and am not confused by blank screens.

**Acceptance Criteria:**

**Given** the credit data is being fetched
**When** I view the widget
**Then** I see a loading skeleton animation

**Given** the credit data fetch fails
**When** the widget handles the error
**Then** I see a fallback UI with "Unable to load credits" message
**And** the dashboard does not crash (NFR6)
**And** the system retries automatically after 30s (NFR7)

---

## Epic 2: Proactive Credit Alerts

Users nhận được cảnh báo chủ động khi credits thấp, có thể dismiss và được nhắc lại khi cần - không bao giờ bị surprise hết credits.

### Story 2.1: Critical Credits Banner Display

As a TrollLLM user,
I want to see a prominent alert banner when my credits fall below $2,
So that I am warned before running out of credits unexpectedly.

**Acceptance Criteria:**

**Given** my credit balance is less than $2
**When** I view the dashboard
**Then** a critical alert banner appears below the header
**And** the banner shows my current balance and estimated remaining requests
**And** the banner has a clear "Top-up Now" call-to-action button
**And** the banner does not block my workflow (NFR12)

**Given** my credit balance is $2 or more
**When** I view the dashboard
**Then** no critical banner is displayed

---

### Story 2.2: Dismiss and Persist Banner State

As a TrollLLM user,
I want to dismiss the critical credit banner and have it stay dismissed for my session,
So that I am not annoyed by repeated warnings after I've acknowledged the alert.

**Acceptance Criteria:**

**Given** the critical banner is displayed
**When** I click the dismiss (X) button
**Then** the banner hides immediately
**And** the dismiss state is saved to localStorage (NFR8)
**And** the banner does not reappear during my current session

**Given** I dismissed the banner in a previous session
**When** I log in to a new session and credits are still critical
**Then** the banner reappears (per-session dismissal only)

---

### Story 2.3: Top-up Navigation from Widget and Banner

As a TrollLLM user,
I want to navigate directly to the top-up/payment page from the credit widget or banner,
So that I can quickly add credits when needed without searching for the payment page.

**Acceptance Criteria:**

**Given** my credits are in warning (yellow) or critical (red) state
**When** I view the credit widget
**Then** I see a "Top-up" button/link in the widget

**Given** the critical banner is displayed
**When** I click "Top-up Now" button
**Then** I am navigated to the payment page

**Given** I click the widget itself (optional)
**When** credits are clickable
**Then** I can access credit details or payment page

---

## Epic 3: Real-time Credit Updates

Users thấy balance cập nhật tự động theo thời gian thực - sau khi payment hoặc sử dụng API, không cần refresh manual.

### Story 3.1: Automatic Credit Polling

As a TrollLLM user,
I want my credit balance to refresh automatically at regular intervals,
So that I always see up-to-date information without manually refreshing the page.

**Acceptance Criteria:**

**Given** I am on the dashboard
**When** 30 seconds have passed since the last fetch
**Then** the system automatically fetches updated credit data
**And** the widget updates with new balance if changed
**And** polling does not impact performance (<1% CPU overhead - NFR3)

**Given** I navigate away from the dashboard
**When** I am on a different page
**Then** polling stops to conserve resources

**Given** I return to the dashboard
**When** the page becomes active
**Then** polling resumes automatically

---

### Story 3.2: Instant Update After Payment

As a TrollLLM user,
I want my credit balance to update immediately after a successful payment,
So that I can see my new balance right away and continue coding with confidence.

**Acceptance Criteria:**

**Given** I complete a payment successfully
**When** I am redirected back to the dashboard
**Then** the system triggers an immediate credit fetch (bypassing the 30s interval)
**And** the widget shows my updated balance within 500ms (NFR2)
**And** the status indicator updates to reflect new credit level
**And** a success toast shows "Credits added!"

---

### Story 3.3: Real-time Status Indicator Update

As a TrollLLM user,
I want the traffic light status indicator to update instantly when my credits change,
So that I always see accurate status without delay.

**Acceptance Criteria:**

**Given** my credits change from one threshold to another (e.g., $5.50 → $4.80)
**When** the new balance is fetched
**Then** the status indicator changes color immediately (green → yellow)
**And** the transition renders without jank (<16ms - NFR4)

**Given** the critical banner was dismissed
**When** credits drop to a NEW lower threshold (e.g., $1.50 → $0.80)
**Then** the banner reappears to warn about the new critical level (FR9)
