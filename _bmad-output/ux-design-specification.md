---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - '_bmad-output/analysis/product-brief-TrollLLM-2025-12-20.md'
  - '_bmad-output/archive/prd.md'
  - '_bmad-output/archive/epics.md'
  - '_bmad-output/analysis/brainstorming-trollllm-features-2025-12-19.md'
workflowType: 'ux-design'
lastStep: 14
status: complete
project_name: 'TrollLLM'
user_name: 'Tai'
date: '2025-12-20'
---

# UX Design Specification TrollLLM

**Author:** Tai
**Date:** 2025-12-20

---

## Executive Summary

### Project Vision

TrollLLM là LLM API proxy giá rẻ nhất cho Vietnamese developers, cung cấp quyền truy cập các model AI hàng đầu (Claude, GPT) với chi phí thấp nhất thị trường. Platform hoạt động theo mô hình pay-as-you-go với billing multiplier ~1.05x, giúp developers chỉ trả tiền cho những gì họ sử dụng mà không cần subscription hay commitment.

**Core UX Goal:** Cung cấp real-time credit visibility để users không bao giờ bị hết credits đột ngột khi đang coding.

### Target Users

#### Persona 1: Heavy User - "Minh" (Senior Developer)
- **Profile:** Senior Developer, 28 tuổi, 5+ năm kinh nghiệm
- **Usage:** 500-800 requests/ngày cho code generation, review, debugging
- **Pain Points:** Chi phí cao, từng bị hết credits giữa coding session
- **Success:** Bill rẻ hơn, không lo hết credits đột ngột

#### Persona 2: Casual User - "Hùng" (Fresher/Student)
- **Profile:** Fresher Developer / Sinh viên IT, 22 tuổi
- **Usage:** 10-50 requests/ngày cho side projects, học tập
- **Pain Points:** Budget hạn chế, muốn experiment với AI nhưng sợ tốn tiền
- **Success:** Có thể dùng LLM APIs mà không lo về chi phí

#### Đặc điểm chung
- Vietnamese developers, tech-savvy
- Đã có monitoring tools riêng, không cần dashboard phức tạp
- Không muốn bị spam notifications
- Cần simple, không intrusive

### Key Design Challenges

1. **Real-time visibility mà không intrusive** - Users cần biết credit status nhanh chóng nhưng không muốn bị distract khi đang trong flow coding
2. **Minimal UI, Maximum Value** - Developers có tools riêng, TrollLLM dashboard cần tập trung vào core value: credit management
3. **Proactive alerts không spam** - Dashboard-only notifications, nhưng vẫn đảm bảo users không miss critical low-credit warnings
4. **Consistent experience across key types** - User Keys (600 RPM) và Friend Keys (60 RPM) cần UX rõ ràng về limitations

### Design Opportunities

1. **Instant Glanceability** - Traffic Light Widget (🟢🟡🔴) có thể trở thành "signature UX" - một cái nhìn biết ngay credit status
2. **Smart Estimation** - Credits Burndown ("Còn ~X requests") giúp users plan usage tốt hơn, tạo trust và reduce anxiety
3. **Zero-friction Top-up** - Khi credits low, streamlined flow để nạp thêm nhanh nhất có thể
4. **Developer-friendly Error Messages** - Error responses (402, 429) với actionable information giúp developers debug nhanh

## Core User Experience

### Defining Experience

**Primary User Actions (theo thứ tự quan trọng):**

1. **Glance Credit Status** - Xem nhanh còn bao nhiêu credits (Traffic Light + Burndown)
2. **Top-up Credits** - Nạp thêm khi cần
3. **Copy API Key** - Lấy key để integrate vào IDE/tools
4. **Manage Friend Keys** - Tạo/revoke keys cho người khác

**Core Loop:** Check status → (nếu low) Top-up → Continue coding

### Platform Strategy

| Aspect | Decision |
|--------|----------|
| **Platform** | Web dashboard (responsive) |
| **Input** | Mouse/keyboard (developer audience) |
| **Offline** | Không cần - dashboard chỉ relevant khi online |
| **Mobile** | Responsive nhưng không priority - developers dùng desktop |

### Effortless Interactions

| Interaction | Target | How |
|-------------|--------|-----|
| Check credit status | < 1 giây | Traffic Light Widget ở header |
| Understand remaining capacity | Instant | Credits Burndown text luôn visible |
| Dismiss low-credit warning | 1 click | Critical Banner với X button |
| Top-up credits | < 30 giây | Direct link từ banner/widget đến payment |
| Copy API key | 1 click | Copy button với visual feedback |

### Critical Success Moments

| Moment | Success Criteria | Failure Mode |
|--------|------------------|--------------|
| **Dashboard Load** | Status visible trong < 1s | User phải scroll/tìm kiếm |
| **Low Credit Warning** | User biết trước khi hết | Surprise "credits = 0" khi đang code |
| **Top-up Completion** | Credits available ngay lập tức | Delay làm gián đoạn workflow |
| **First Time Use** | Hiểu ngay Traffic Light meaning | Confused về màu sắc/ý nghĩa |

### Experience Principles

1. **Instant Glanceability** - Mọi thông tin quan trọng phải visible ngay khi load, không cần interaction
2. **Proactive Not Reactive** - Warn trước khi vấn đề xảy ra, không đợi user discover
3. **Zero Cognitive Load** - Traffic Light (🟢🟡🔴) là universal language, không cần học
4. **Minimal Interruption** - Alerts informative nhưng không block workflow
5. **Developer-First** - Clean, fast, no-nonsense UI phù hợp với developer audience

## Desired Emotional Response

### Primary Emotional Goals

**Core Feeling:** "In Control and Confident"

Users của TrollLLM cần cảm thấy:
1. **In Control** - Luôn biết chính xác credit status và remaining capacity
2. **Confident** - Trust vào system với transparent pricing, không hidden fees
3. **Calm** - Không anxiety về việc hết credits đột ngột nhờ proactive warnings
4. **Efficient** - Không waste time với UI phức tạp, get in → check → get out

### Emotional Journey Mapping

| Stage | Emotion | Design Response |
|-------|---------|-----------------|
| **Dashboard Load** | Clarity → Calm | Traffic Light visible ngay, không cần tìm kiếm |
| **Status Check** | In Control | Exact balance + estimated requests remaining |
| **Low Credit Warning** | Alert (không Panic) | Yellow/Red indicator + banner, không block UI |
| **Top-up Flow** | Quick → Relief | Streamlined payment, instant credit update |
| **Return Visit** | Confident | Consistent UI, status remembered |

### Micro-Emotions

**Emotions to Cultivate:**
- ✅ **Confidence** - "Tôi biết chính xác còn bao nhiêu"
- ✅ **Trust** - "Giá cả minh bạch, không phí ẩn"
- ✅ **Relief** - "Warning kịp thời, top-up nhanh"
- ✅ **Control** - "Tôi quản lý được usage của mình"

**Emotions to Prevent:**
- ❌ **Anxiety** - "Không biết còn bao nhiêu"
- ❌ **Frustration** - "Phải tìm mãi mới thấy balance"
- ❌ **Surprise** - "Credits hết đột ngột"
- ❌ **Distrust** - "Có phí ẩn không?"

### Design Implications

| Emotion Goal | UX Implementation |
|--------------|-------------------|
| **Confidence** | Traffic Light + exact $ balance + "~X requests remaining" |
| **Trust** | Pricing visible, no hidden info, transparent billing history |
| **Calm** | Multi-level warnings (Yellow → Red → Banner), không sudden block |
| **Efficiency** | Dashboard load < 1s, top-up < 30s, 1-click copy key |
| **Relief** | Instant credit update sau payment, success feedback |

### Emotional Design Principles

1. **Transparency Builds Trust** - Mọi thông tin về credits, pricing, usage đều visible và clear
2. **Warning Not Blocking** - Low credits = alert users, không interrupt workflow
3. **Speed Creates Calm** - Fast responses (load, payment, update) giảm anxiety
4. **Consistency Builds Confidence** - UI patterns nhất quán, không surprises
5. **Control Through Visibility** - Users thấy = users control

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

#### Stripe Dashboard
- **Strength:** Balance prominently displayed, non-intrusive alerts
- **Key Pattern:** Top-level balance visibility với alert bar
- **Lesson:** Financial info cần visible ngay, không cần dig

#### Vercel Dashboard
- **Strength:** Status indicators (🟢🟡🔴), minimal UI, developer-focused
- **Key Pattern:** Color-coded status dots, 1-click copy buttons
- **Lesson:** Developers appreciate speed và simplicity over features

#### OpenAI Platform
- **Strength:** Clear usage/billing display, simple API key management
- **Key Pattern:** Usage estimation, rate limit visibility
- **Lesson:** API users need clear limits và remaining capacity info

### Transferable UX Patterns

| Category | Pattern | Application |
|----------|---------|-------------|
| **Status Display** | Color-coded dots (🟢🟡🔴) | Traffic Light Widget |
| **Balance Visibility** | Prominent header placement | Credits always visible |
| **Alerts** | Non-blocking top banner | Critical Credits Banner |
| **Interaction** | 1-click copy with feedback | API Key copy button |
| **Estimation** | Remaining capacity display | "~X requests remaining" |

### Anti-Patterns to Avoid

1. **Hidden Financial Info** - Balance buried in settings → Always visible in header
2. **Complex Dashboards** - Feature overload → Minimal, focused UI
3. **Email Notifications** - Spam inbox → Dashboard-only alerts
4. **Blocking Modals** - Interrupt workflow → Dismissable banners
5. **Ambiguous Colors** - Custom color meanings → Universal traffic light colors
6. **Delayed Updates** - Stale data → Real-time balance refresh

### Design Inspiration Strategy

**Adopt:**
- Stripe's prominent balance display pattern
- Vercel's 🟢🟡🔴 status indicator system
- OpenAI's usage estimation approach

**Adapt:**
- Combine balance + status into single Traffic Light Widget
- Simplify alert system to single dismissable banner
- Add "requests remaining" estimation unique to TrollLLM

**Avoid:**
- Complex navigation patterns (keep single-page dashboard)
- Email/push notifications (dashboard-only)
- Analytics overload (removed per brainstorming decision)

## Design System Foundation

### Design System Choice

**Primary:** Tailwind CSS + shadcn/ui

**Rationale:**
- Developer-focused aesthetic phù hợp với target users
- Utility-first approach = fast development
- shadcn/ui cung cấp accessible components sẵn sàng sử dụng
- Easy customization cho Traffic Light colors và branding
- Minimal bundle size, optimal performance
- Popular trong developer tools ecosystem (Vercel, Linear style)

### Rationale for Selection

| Requirement | How Tailwind + shadcn Meets It |
|-------------|-------------------------------|
| **Speed** | Copy-paste components, utility classes |
| **Customization** | CSS variables, easy theming |
| **Developer UX** | Clean, minimal aesthetic |
| **Performance** | Tree-shaking, small bundle |
| **Accessibility** | shadcn built on Radix primitives |
| **Maintainability** | Components in your codebase, full control |

### Implementation Approach

**Component Strategy:**
1. Use shadcn/ui base components (Button, Card, Badge, Alert)
2. Create custom Traffic Light Widget component
3. Create custom Credits Banner component
4. Extend color palette for status colors

**Setup Steps:**
1. Install Tailwind CSS (if not already)
2. Add shadcn/ui CLI and init
3. Add required components: Button, Card, Badge, Alert, Tooltip
4. Configure custom colors in tailwind.config.js

### Customization Strategy

**Color Tokens:**
```
--status-ok: #22c55e (green-500)
--status-warning: #eab308 (yellow-500)
--status-critical: #ef4444 (red-500)
--background: #ffffff
--foreground: #0a0a0a
--muted: #f5f5f5
```

**Custom Components Needed:**
1. `CreditsStatusWidget` - Traffic Light + Balance + Burndown
2. `CriticalCreditsBanner` - Dismissable alert banner
3. `ApiKeyCard` - Key display with copy button

**Typography:**
- Font: Inter (developer-friendly, clean)
- Monospace: JetBrains Mono (for API keys, code)

## Defining Experience

### The Core Interaction

**"Glance and know your credit status instantly"**

TrollLLM's defining experience là khả năng cho users biết credit status chỉ với một cái nhìn, không cần tìm kiếm hay interaction.

**How users describe it:**
> "Một cái nhìn là biết còn bao nhiêu credits - không cần dig vào settings hay đợi error"

### User Mental Model

**Current Approach (Pain):**
- Check dashboard manually khi nhớ ra
- Đợi error 402 "Insufficient credits" khi đang code
- Surprise khi hết credits giữa chừng

**TrollLLM Approach (Gain):**
- Glance = Know instantly
- Traffic light = Universal understanding
- Proactive warnings = No surprises

**Mental Metaphor:** Traffic Light
- 🟢 Green = Go, everything OK
- 🟡 Yellow = Caution, consider action soon
- 🔴 Red = Stop and address now

### Success Criteria

| Criteria | Target | Why It Matters |
|----------|--------|----------------|
| **Recognition < 1s** | Instant status comprehension | Users shouldn't wait or search |
| **Zero Cognitive Load** | No reading required | Colors = universal language |
| **100% Clarity** | No ambiguous states | Users always know their status |
| **1-Click Action** | Status → Top-up instantly | Remove friction when needed |

### Novel UX Patterns

**Pattern Strategy:** Established + Novel Combination

| Element | Pattern Type | Notes |
|---------|--------------|-------|
| Traffic Light Colors | Established | Universal 🟢🟡🔴 meaning |
| Header Placement | Established | Users expect status at top |
| Burndown Estimate | Novel Adaptation | "~X requests remaining" unique to TrollLLM |
| Dismissable Banner | Established | Standard alert pattern |

**No User Education Needed:** All patterns are familiar, just combined effectively.

### Experience Mechanics

#### 1. Initiation
- Page loads
- Widget appears in header (always visible, no scroll needed)
- Current balance fetched and displayed

#### 2. Interaction States

**🟢 Green State (Credits > $5):**
```
[🟢] $15.50 | ~450 requests remaining
```
- No action needed
- User continues with confidence

**🟡 Yellow State ($2 - $5):**
```
[🟡] $3.20 | ~95 requests remaining [Top-up →]
```
- Subtle call-to-action appears
- User can top-up or continue

**🔴 Red State (< $2):**
```
[🔴] $1.15 | ~35 requests remaining [Top-up Now]
```
- Critical Banner also appears below header
- Strong call-to-action
- Banner is dismissable

#### 3. Feedback
- Color change is immediate on balance update
- After top-up: Instant update to green state
- Success toast: "Credits added! You now have ~XXX requests"

#### 4. Completion
- User either:
  - Continues coding with confidence (green)
  - Tops up and returns to green state
  - Dismisses warning and continues (acknowledged risk)

## Visual Design Foundation

### Color System

#### Neutral Palette (Developer Tool Aesthetic)
```css
--background: #ffffff;
--foreground: #0a0a0a;
--muted: #f5f5f5;
--muted-foreground: #737373;
--border: #e5e5e5;
--card: #ffffff;
--card-foreground: #0a0a0a;
```

#### Status Colors (Traffic Light System)
```css
--status-ok: #22c55e;        /* Green - Credits > $5 */
--status-warning: #eab308;   /* Yellow - Credits $2-5 */
--status-critical: #ef4444;  /* Red - Credits < $2 */
```

#### Interactive Colors
```css
--primary: #0a0a0a;
--primary-foreground: #ffffff;
--accent: #f5f5f5;
--accent-foreground: #0a0a0a;
--ring: #0a0a0a;
```

### Typography System

**Font Stack:**
- Primary: `Inter, -apple-system, BlinkMacSystemFont, sans-serif`
- Monospace: `JetBrains Mono, Consolas, monospace`

**Type Scale:**
| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| H1 | 24px | 600 | 1.2 | Page titles |
| H2 | 20px | 600 | 1.3 | Section headers |
| H3 | 16px | 600 | 1.4 | Card titles |
| Body | 14px | 400 | 1.5 | General text |
| Small | 12px | 400 | 1.4 | Labels, captions |
| Mono | 13px | 400 | 1.5 | API keys, code |

### Spacing & Layout Foundation

**Spacing Scale (4px base):**
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
```

**Layout Tokens:**
```css
--max-width: 1200px;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

**Layout Principles:**
1. **Centered content** - Max-width 1200px với auto margins
2. **Card-based UI** - Components grouped in cards với 16px padding
3. **Consistent gaps** - 16px giữa cards, 24px giữa sections
4. **Breathing room** - Đủ white space cho developer eye comfort

### Accessibility Considerations

| Requirement | Implementation |
|-------------|----------------|
| **Color Contrast** | All text combinations meet WCAG AA (≥4.5:1) |
| **Status Indicators** | Color + text + icon (never color alone) |
| **Focus States** | 2px ring với offset, high visibility |
| **Font Scaling** | rem units, respects user preferences |
| **Motion** | Respect prefers-reduced-motion |
| **Touch Targets** | Min 44x44px for interactive elements |

**Status Color Accessibility:**
- 🟢 Green includes text "OK" or checkmark icon
- 🟡 Yellow includes text "Low" or warning icon
- 🔴 Red includes text "Critical" or alert icon

## Design Direction Decision

### Design Directions Explored

4 design directions được tạo và so sánh:

| Direction | Style | Status Widget | Best For |
|-----------|-------|---------------|----------|
| **1: Minimal Clean** | Ultra-minimal, white space | Header pill | Minimalist developers |
| **2: Card-Based** | Organized cards, hero status | Large hero card | Visual scanners |
| **3: Dense Dashboard** | Sidebar nav, compact | Inline compact | Power users |
| **4: Widget-Centric** | Status as hero | Giant centered | Status-focused |

**Interactive showcase:** `_bmad-output/ux-design-directions.html`

### Chosen Direction

**Primary: Direction 1 (Minimal Clean)** với elements từ Direction 4

**Combination Approach:**
- Header widget từ Direction 1 (always visible, compact)
- Hero status area từ Direction 4 (khi dashboard load, status prominent)
- Card-based secondary info từ Direction 2

### Design Rationale

| Decision | Rationale |
|----------|-----------|
| **Minimal base** | Developer audience prefers clean, no-nonsense UI |
| **Header widget** | Glanceable status without scrolling |
| **Hero on dashboard** | First thing users see reinforces status |
| **Card organization** | Groups related info (API Key, Rate Limit) |

### Implementation Approach

**Component Hierarchy:**
1. **Global Header** - Logo + Traffic Light Widget (compact)
2. **Dashboard Hero** - Large status display (Direction 4 style)
3. **Info Cards** - API Key, Rate Limit, Friend Keys (Direction 2 style)
4. **Critical Banner** - Below header when credits < $2

**Priority Order:**
1. Traffic Light Widget (header) - P0
2. Credits Burndown display - P0
3. Critical Banner - P0
4. API Key card với copy - P1
5. Rate Limit info - P1

## User Journey Flows

### Journey 1: Check Credit Status

**Goal:** User biết credit balance ngay khi mở dashboard

**Flow:**
1. User opens Dashboard
2. Page loads (< 1s)
3. Traffic Light Widget visible in header immediately
4. User glances at widget:
   - 🟢 Green (>$5): Balance + "~X requests" → Continue with confidence
   - 🟡 Yellow ($2-5): Balance + estimate + [Top-up →] button
   - 🔴 Red (<$2): Balance + estimate + Critical Banner appears

**Success Criteria:**
- Time to status visibility: < 1 second
- No scroll required
- No clicks required to see status

### Journey 2: Top-up Credits

**Goal:** User nạp thêm credits nhanh chóng

**Entry Points:**
- Traffic Light Widget → Top-up button (yellow/red state)
- Critical Banner → Top-up Now button
- Navigation → Payment page

**Flow:**
1. Click Top-up trigger
2. Select amount (preset options + custom)
3. Redirect to SePay payment gateway
4. Complete payment
5. Redirect back to dashboard
6. Credits updated instantly
7. Traffic Light updates to green
8. Success toast shown

**Success Criteria:**
- Time to complete: < 30 seconds
- Credits available immediately after payment
- Clear success feedback

### Journey 3: Low Credit Warning

**Goal:** User nhận warning proactive và có thể action

**Trigger:** Credits drop below $2

**Flow:**
1. System detects credits < $2
2. Traffic Light turns RED
3. Critical Banner appears below header
4. Banner shows: current balance + "~X requests remaining" + [Top-up Now] + [X dismiss]
5. User options:
   - **Top-up Now:** → Payment flow
   - **Dismiss:** Banner hides, widget stays red, banner returns next session
   - **Ignore:** Continue using API until credits = $0 → 402 error

**Banner Behavior:**
- Dismissable per session
- Reappears on next login if still critical
- Does not block UI or workflow

### Journey 4: Copy API Key

**Goal:** User copy API key để integrate vào IDE/tools

**Flow:**
1. User on Dashboard
2. API Key card visible (key partially hidden: sk-troll-xxxx...xxxx)
3. Click [Copy] button
4. Key copied to clipboard
5. Button changes: "Copy" → "Copied!" (2s)
6. Toast: "API key copied to clipboard"
7. User pastes in IDE

**Optional: Reveal Full Key**
1. Click [Show] icon next to key
2. Full key revealed (auto-hide after 30s)
3. Can copy while revealed

**Success Criteria:**
- Time to copy: 1 click, < 3 seconds
- Visual confirmation of copy
- Secure: key partially hidden by default

### Journey Patterns

| Pattern | Description | Used In |
|---------|-------------|---------|
| **Instant Visibility** | Critical info visible on page load | Status check |
| **Multi-Entry Points** | Multiple ways to start same flow | Top-up |
| **Progressive Disclosure** | Reveal details on demand | API key, balance details |
| **Non-Blocking Warnings** | Alerts inform but don't block | Critical banner |
| **Immediate Feedback** | Visual confirmation of actions | Copy button, payment |
| **Session Persistence** | Remember dismissals per session | Banner dismiss |

### Flow Optimization Principles

1. **Minimize Time to Value** - Status visible in < 1s, top-up < 30s
2. **Reduce Friction** - 1-click copy, pre-filled amounts, remembered preferences
3. **Proactive Communication** - Warn before problems, not after
4. **Clear Recovery** - Every error has a clear next step
5. **Respect Attention** - Alerts inform, never block workflow

## Component Strategy

### Design System Components (shadcn/ui)

**Base Components Used:**
| Component | Usage in TrollLLM |
|-----------|-------------------|
| `Button` | Top-up CTAs, Copy button, Dismiss |
| `Card` | API Key card, Info cards |
| `Badge` | Status labels, Rate limit display |
| `Alert` | Base styling for Critical Banner |
| `Tooltip` | Help text, hover explanations |
| `Toast` | Success/error notifications |

### Custom Components

#### CreditsStatusWidget
- **Purpose:** Traffic Light Widget for header
- **Priority:** P0 (core feature)
- **States:** ok (green), warning (yellow), critical (red)
- **Content:** Status dot + Balance + Estimate + CTA (conditional)
- **Accessibility:** role="status", aria-live="polite"

**Props Interface:**
```typescript
interface CreditsStatusWidgetProps {
  balance: number;
  estimatedRequests: number;
  status: 'ok' | 'warning' | 'critical';
  onTopUp?: () => void;
}
```

#### CriticalCreditsBanner
- **Purpose:** Dismissable alert for low credits
- **Priority:** P0 (core feature)
- **Trigger:** Balance < $2
- **Behavior:** Dismissable per session, reappears next session
- **Accessibility:** role="alert", aria-live="assertive"

**Props Interface:**
```typescript
interface CriticalCreditsBannerProps {
  balance: number;
  estimatedRequests: number;
  onTopUp: () => void;
  onDismiss: () => void;
  isDismissed?: boolean;
}
```

#### ApiKeyCard
- **Purpose:** Secure API key display with copy
- **Priority:** P1
- **Features:** Masked display, reveal toggle, 1-click copy
- **Accessibility:** Keyboard accessible, copy feedback

**Props Interface:**
```typescript
interface ApiKeyCardProps {
  apiKey: string;
  rateLimit: number;
  keyType: 'user' | 'friend';
}
```

#### StatusDot
- **Purpose:** Reusable status indicator
- **Priority:** P0
- **Variants:** sm/md/lg, with/without pulse
- **Colors:** Semantic status colors (green/yellow/red)

**Props Interface:**
```typescript
interface StatusDotProps {
  status: 'ok' | 'warning' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}
```

### Component Implementation Strategy

**Build Order:**
1. `StatusDot` - Foundation for other components
2. `CreditsStatusWidget` - Core dashboard feature
3. `CriticalCreditsBanner` - Critical user journey
4. `ApiKeyCard` - Supporting feature

**Implementation Approach:**
- Build on shadcn/ui primitives where possible
- Use Tailwind CSS for styling
- Follow design tokens from Visual Foundation
- Ensure all components are accessible

### Implementation Roadmap

**Phase 1 - MVP (P0):**
- [ ] StatusDot component
- [ ] CreditsStatusWidget component
- [ ] CriticalCreditsBanner component

**Phase 2 - Complete Dashboard (P1):**
- [ ] ApiKeyCard component
- [ ] FriendKeyCard component (variant of ApiKeyCard)
- [ ] PaymentHistoryList component

**Phase 3 - Enhancements:**
- [ ] UsageChart component (if analytics added later)
- [ ] WebhookConfigCard component (Phase 2 features)

## UX Consistency Patterns

### Button Hierarchy

| Level | Style | Tailwind Classes | Usage |
|-------|-------|------------------|-------|
| **Primary** | Solid dark bg | `bg-foreground text-background` | Main CTAs |
| **Secondary** | Outlined | `border border-border bg-transparent` | Supporting actions |
| **Ghost** | Text only | `bg-transparent hover:bg-muted` | Tertiary actions |
| **Destructive** | Solid red | `bg-status-critical text-white` | Dangerous actions |

**Button Sizes:**
- `sm`: 32px height, 12px padding
- `md`: 40px height, 16px padding (default)
- `lg`: 48px height, 24px padding

**Button States:**
- Default → Hover (darken 10%) → Active (darken 20%) → Disabled (opacity 50%)
- Loading: Replace text with spinner, maintain width

### Feedback Patterns

#### Toast Notifications
| Type | Color | Icon | Auto-dismiss |
|------|-------|------|--------------|
| Success | Green | ✓ checkmark | 3 seconds |
| Error | Red | ✕ x-mark | 5 seconds |
| Warning | Yellow | ⚠ triangle | 4 seconds |
| Info | Blue | ℹ info circle | 3 seconds |

**Placement:** Top-right, 16px from edges
**Stacking:** Max 3 visible, newest on top
**Animation:** Slide in from right, fade out

#### Inline Feedback
| Pattern | Trigger | Duration |
|---------|---------|----------|
| Button text swap | Click action | 2 seconds, then revert |
| Input validation | Blur/submit | Until fixed |
| Success checkmark | Completed action | 2 seconds |

### Status Patterns

**Traffic Light System (consistent across all indicators):**

| Status | Background | Text | Icon |
|--------|------------|------|------|
| OK | `bg-status-ok/10` | "OK" | ✓ |
| Warning | `bg-status-warning/10` | "Low" | ⚠ |
| Critical | `bg-status-critical/10` | "Critical" | ! |

**Status Dot Sizes:**
- `sm`: 8px (inline indicators)
- `md`: 12px (default, widget)
- `lg`: 16px (hero displays)

**Accessibility Rule:** Never rely on color alone - always include text or icon

### Loading States

**Skeleton Screens:**
- Background: `bg-muted`
- Animation: Pulse (1.5s cycle)
- Shape: Match component layout

**Button Loading:**
- Replace text with spinner
- Maintain button width
- Disable interactions

**Data Refresh:**
- Subtle spinner overlay (opacity 0.5)
- Don't hide existing content

### Navigation Patterns

**Link Styles:**
| Type | Style | Behavior |
|------|-------|----------|
| Internal | `text-foreground underline-offset-4 hover:underline` | SPA navigation |
| External | Same + external icon | Opens new tab |
| CTA Link | Button styling | Action trigger |

**Focus States:**
- 2px ring, offset 2px
- Ring color: `ring-foreground`
- Visible on keyboard focus only

### Spacing Patterns

**Layout Spacing:**
| Context | Value | Tailwind |
|---------|-------|----------|
| Page padding | 24px | `p-6` |
| Section gap | 32px | `gap-8` |
| Card gap | 16px | `gap-4` |
| Element gap | 12px | `gap-3` |
| Tight gap | 8px | `gap-2` |

**Consistent Application:**
- Cards: `p-4` (16px padding)
- Buttons in row: `gap-3` (12px)
- Form fields: `gap-4` (16px)

## Responsive Design & Accessibility

### Responsive Strategy

**Approach:** Desktop-first with mobile adaptations

**Rationale:**
- Target users: developers using desktop primarily
- Dashboard is a "check and go" tool, not mobile-first
- Full functionality on desktop, essential features on mobile

**Layout Principles:**
1. Desktop: Full layout with side-by-side cards
2. Tablet: 2-column grid, slightly condensed
3. Mobile: Single column, stacked layout

### Breakpoint Strategy

| Breakpoint | Tailwind | Range | Layout Changes |
|------------|----------|-------|----------------|
| **Base** | (default) | < 640px | Mobile: single column |
| **sm** | `sm:` | ≥ 640px | Small tablet: 2 columns |
| **md** | `md:` | ≥ 768px | Tablet: comfortable spacing |
| **lg** | `lg:` | ≥ 1024px | Desktop: full layout |
| **xl** | `xl:` | ≥ 1280px | Large desktop: max-width centered |

**Mobile Adaptations:**
- Header widget: Compact (dot + balance only)
- Hero section: Full width, stacked
- Cards: Full width, stacked vertically
- Touch targets: Enlarged to 44px minimum

### Accessibility Strategy

**Compliance Target:** WCAG 2.1 Level AA

**Core Requirements:**

| Category | Requirement | Implementation |
|----------|-------------|----------------|
| **Perceivable** | Color contrast ≥ 4.5:1 | Design tokens verified |
| **Perceivable** | Color independence | Status = color + text + icon |
| **Operable** | Keyboard navigation | Tab order, focus management |
| **Operable** | Touch targets ≥ 44px | Button/link sizing |
| **Understandable** | Clear labels | Descriptive button text |
| **Robust** | Semantic HTML | Proper heading hierarchy |

**Component A11y Requirements:**

| Component | ARIA | Notes |
|-----------|------|-------|
| CreditsStatusWidget | `role="status"`, `aria-live="polite"` | Announces balance changes |
| CriticalCreditsBanner | `role="alert"`, `aria-live="assertive"` | Urgent notification |
| StatusDot | `aria-label="Status: OK/Low/Critical"` | Never color alone |
| Copy Button | Announce "Copied to clipboard" | Feedback for screen readers |

### Testing Strategy

**Automated Testing:**
- [ ] Lighthouse CI in build pipeline (score ≥ 90)
- [ ] axe-core integration tests
- [ ] eslint-plugin-jsx-a11y rules enabled

**Manual Testing Checklist:**
- [ ] Keyboard-only navigation (Tab, Enter, Escape)
- [ ] Screen reader test (NVDA or VoiceOver)
- [ ] Focus visible on all interactive elements
- [ ] Color contrast verification
- [ ] Touch target size verification (mobile)
- [ ] Reduced motion preference respected

### Implementation Guidelines

**For Developers:**

**Responsive:**
```css
/* Mobile-first base styles, then enhance */
.card { @apply w-full; }
@screen lg { .card { @apply w-1/2; } }
```

**Accessibility:**
```tsx
// Always include aria-labels for icons
<button aria-label="Copy API key">
  <CopyIcon aria-hidden="true" />
</button>

// Status indicators must have text
<StatusDot status="warning" />
<span className="sr-only">Status: Low credits</span>
```

**Focus Management:**
```css
/* Visible focus for keyboard users */
:focus-visible {
  @apply ring-2 ring-foreground ring-offset-2;
}
```
