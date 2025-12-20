---
stepsCompleted: [1, 2, 3, 4, 7, 8, 9, 10, 11]
inputDocuments:
  - '_bmad-output/analysis/product-brief-TrollLLM-2025-12-20.md'
  - '_bmad-output/analysis/brainstorming-trollllm-features-2025-12-19.md'
  - '_bmad-output/archive/index.md'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 1
  projectDocs: 1
workflowType: 'prd'
lastStep: 11
project_name: 'TrollLLM'
user_name: 'Tai'
date: '2025-12-20'
---

# Product Requirements Document - TrollLLM

**Author:** Tai
**Date:** 2025-12-20

---

## Executive Summary

TrollLLM là LLM API proxy giá rẻ nhất cho Vietnamese developers, cung cấp quyền truy cập các model AI hàng đầu với chi phí thấp nhất thị trường thông qua mô hình pay-as-you-go.

PRD này định nghĩa **Phase 1 MVP - Credit Visibility Features** để giải quyết vấn đề users phải check credit balance thủ công và thường xuyên bị hết credits đột ngột khi đang coding, gây gián đoạn workflow.

**MVP Features:**
- 🚦 **Traffic Light Widget** - Visual status indicator: 🟢 OK / 🟡 Low / 🔴 Critical
- 📊 **Credits Burndown** - Hiển thị "~X requests remaining"
- 🔔 **Critical Banner** - Alert khi credits thấp, dismissable

**Target Users:**
- Heavy Users (500-800 req/ngày) - Senior developers dùng daily
- Casual Users (10-50 req/ngày) - Freshers, students làm side projects

### What Makes This Special

- **Dashboard-only notifications** - Không spam email, respect developer workflow
- **Visual real-time indicators** - Traffic Light Widget cho instant awareness
- **Proactive warnings** - Alert trước khi hết credits, không phải sau khi đã fail
- **Simplicity** - Không over-engineer, chỉ những gì developers thực sự cần

## Project Classification

**Technical Type:** web_app
**Domain:** general (Developer tools)
**Complexity:** low
**Project Context:** Brownfield - extending existing TrollLLM platform

**Existing Tech Stack:**
- Frontend: Next.js 14, React 18, TailwindCSS, TypeScript
- Backend: Express.js, MongoDB, JWT auth
- Proxy: Go 1.25, HTTP/2, SSE streaming

Features mới sẽ integrate với dashboard hiện tại, sử dụng existing patterns và architecture.

---

## Success Criteria

### User Success

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Widget Adoption** | >80% active users | Dashboard analytics - users who view widget |
| **Credit Exhaustion Reduction** | <5% users | Compare before/after - users hết credits đột ngột |
| **User Awareness** | Users biết trước khi critical | Survey/feedback |
| **Cost Savings** | >30% cheaper | So với direct API pricing |
| **Response Quality** | <2s latency | Average response time |

**User Success Moments:**
- Nhìn thấy 🟢🟡🔴 và hiểu ngay trạng thái credits
- Nhận warning trước khi hết credits, kịp top-up
- Không bị interrupt workflow do hết credits đột ngột

### Business Success

**3-Month Goals:**
- Establish stable user base với MVP features
- Maintain positive unit economics (revenue > costs)
- Zero critical downtime

**12-Month Goals:**
- Grow Vietnamese developer market share
- Sustainable revenue growth
- Strong word-of-mouth acquisition

### Technical Success

| Metric | Target |
|--------|--------|
| **Widget Load Time** | <100ms |
| **API Response** | <2s average |
| **Uptime** | 99.9% |
| **Zero Breaking Changes** | Existing functionality unaffected |

### Measurable Outcomes

| KPI | Description | Measurement |
|-----|-------------|-------------|
| **MAU** | Monthly Active Users | Unique API keys with >1 request/month |
| **Revenue** | Monthly revenue | Total credits purchased/month |
| **Retention** | User retention rate | % users active month-over-month |
| **ARPU** | Average Revenue Per User | Total revenue / Active users |
| **Usage Volume** | Platform throughput | Requests/day |

## Product Scope

### MVP - Minimum Viable Product

| Feature | Description | Success Criteria |
|---------|-------------|------------------|
| 🚦 **Traffic Light Widget** | Visual status: 🟢 OK (>$5) / 🟡 Low ($2-5) / 🔴 Critical (<$2) | >80% users see and understand |
| 📊 **Credits Burndown** | "~X requests remaining" based on avg cost | Accurate within 20% |
| 🔔 **Critical Banner** | Dismissable alert when credits <$2 | Reduces credit exhaustion by >50% |

### Growth Features (Post-MVP)

| Feature | Description | Phase |
|---------|-------------|-------|
| **Webhook Events** | `credits.low`, `credits.empty`, `payment.success` | Phase 2 |
| **Signed Payloads** | HMAC signature verification | Phase 2 |
| **Discord Webhook** | Pre-formatted Discord messages | Phase 2 |

### Vision (Future)

| Feature | Description | Phase |
|---------|-------------|-------|
| **One-Click Discord OAuth** | Auto-setup webhook | Phase 3 |
| **Team Accounts** | Shared credits, individual keys | Phase 3 |
| **Public Status Page** | status.trollllm.xyz | Phase 3 |
| **SEA Expansion** | Expand to Southeast Asian market | Long-term |

---

## User Journeys

### Journey 1: Minh - Không Còn Bị Interrupt Giữa Đêm

Minh là Senior Developer tại một startup công nghệ, dùng TrollLLM 500-800 requests mỗi ngày cho mọi thứ từ code generation đến debugging. Một đêm khuya, anh đang trong "flow state" hoàn hảo - Claude responses nhanh, code review suggestions đang giúp fix bugs liên tục cho một feature quan trọng cần ship sáng mai.

Đột nhiên - request fail. "Insufficient credits". Minh mất 15 phút debug, check logs, tưởng server có vấn đề, rồi mới nhận ra đơn giản là hết credits. Phải dừng lại top-up qua SePay, đợi confirm, mất momentum hoàn toàn. Feature delay, Minh frustrated.

**Với Credit Visibility Features:**

Sáng hôm sau, Minh mở TrollLLM dashboard và ngay lập tức thấy 🟡 **Yellow** indicator ở header - "Credits: $3.50 • ~150 requests remaining". Không cần click vào đâu, không cần check billing page. Anh biết ngay: cần top-up trước khi bắt đầu coding session lớn hôm nay.

Minh top-up $20, widget chuyển sang 🟢 **Green** - "Credits: $23.50 • ~950 requests remaining". Yên tâm code cả ngày, không còn lo bị interrupt đúng lúc quan trọng nhất. Khi credits xuống 🟡 Yellow cuối ngày, anh đã plan sẵn - top-up vào sáng mai trước khi bắt đầu.

**Kết quả:** Minh không còn bị surprise hết credits. Workflow smooth, productivity tăng, stress giảm.

---

### Journey 2: Hùng - Student Học Code Không Lo Tốn Tiền

Hùng là sinh viên IT năm 3, dùng TrollLLM cho side projects và học programming patterns mới. Budget hạn chế nên anh chỉ top-up $5-10 mỗi lần, dùng không đều - có tuần dùng nhiều, có tuần không dùng gì.

Một chiều Chủ Nhật, Hùng đang học React hooks qua một tutorial phức tạp. Claude đang giải thích useEffect dependencies rất hay, Hùng đang "get it" thì đột nhiên - request fail. Hết credits. Anh không nhớ lần cuối check balance là khi nào. Frustrating vì phải dừng đúng lúc đang hiểu một concept quan trọng.

**Với Credit Visibility Features:**

Tuần sau, Hùng mở dashboard và thấy 🔴 **Red** indicator - "Credits: $1.20 • ~25 requests remaining". Ngay lập tức, một **Critical Banner** màu đỏ nhẹ nhàng hiện ở top: "⚠️ Credits thấp - Top up để tiếp tục học không gián đoạn".

Hùng có 2 lựa chọn rõ ràng: top-up ngay $5 để tiếp tục, hoặc biết mình chỉ còn ~25 requests nên plan finish task hiện tại trước. Anh chọn finish concept đang học, rồi top-up. Không còn bị surprise, không còn mất momentum đúng lúc quan trọng.

**Kết quả:** Hùng control được spending, học hiệu quả hơn, không còn anxiety về việc đột ngột hết credits.

---

### Journey Requirements Summary

**Capabilities Revealed by Journeys:**

| Journey | Required Capabilities |
|---------|----------------------|
| **Minh - Heavy User** | Real-time credit status display, Request estimation, Visual status indicator (🟢🟡🔴), Persistent header widget |
| **Hùng - Casual User** | Critical threshold alerts, Dismissable banner, Clear call-to-action for top-up, Request count estimation |

**Core Requirements:**

1. **Traffic Light Widget**
   - Always visible in dashboard header
   - Real-time update khi credits thay đổi
   - Color coding: 🟢 >$5 / 🟡 $2-5 / 🔴 <$2
   - Show remaining requests estimate

2. **Credits Burndown**
   - Calculate based on user's average cost per request (7 days)
   - Display: "~X requests remaining"
   - Update after each transaction

3. **Critical Banner**
   - Trigger when credits < $2
   - Dismissable (don't annoy users)
   - Clear CTA to top-up page
   - Re-appear nếu credits tiếp tục giảm xuống threshold mới

---

## Web App Specific Requirements

### Project-Type Overview

TrollLLM dashboard là Next.js 14 SPA (Single Page Application) với existing features: user management, API key management, billing, và payment integration. MVP features sẽ extend dashboard với real-time credit visibility components.

### Technical Architecture Considerations

**Existing Stack Integration:**
- Framework: Next.js 14 (App Router)
- UI: React 18, TailwindCSS
- State: Client-side state management
- API: Express.js backend với REST endpoints
- Real-time: SSE streaming capability từ Go proxy

**New Components:**
| Component | Type | Location |
|-----------|------|----------|
| Traffic Light Widget | React Component | Dashboard header (persistent) |
| Credits Burndown | React Component | Within widget or separate |
| Critical Banner | React Component | Top of dashboard (conditional) |

### Real-time Requirements

**Widget Update Strategy:**
- **Real-time updates** - Widget phải update ngay khi credits thay đổi
- Polling interval: Every 30 seconds hoặc sau mỗi API request
- Alternative: WebSocket/SSE cho instant updates nếu cần

**Implementation Options:**
1. **Polling**: Simple, fetch `/api/user/credits` mỗi 30s
2. **Event-driven**: Backend emit event sau mỗi transaction, frontend subscribe
3. **Hybrid**: Polling + force refresh sau user actions (top-up)

**Recommended:** Polling với 30s interval + immediate refresh sau payment success

### Browser Support

| Browser | Support Level |
|---------|---------------|
| Chrome (latest) | Full |
| Firefox (latest) | Full |
| Safari (latest) | Full |
| Edge (latest) | Full |
| Mobile browsers | Full (responsive) |

### Responsive Design

- Widget phải responsive trên mobile
- Banner phải không block content trên small screens
- Touch-friendly dismiss button cho banner

### Implementation Considerations

**State Management:**
- Credits balance: Fetch từ `/api/user/me` hoặc dedicated endpoint
- Widget state: Local component state
- Banner dismiss state: localStorage (persist across sessions)

**Performance:**
- Widget load time: <100ms target
- Minimal re-renders - only update on data change
- Lazy load nếu không ở dashboard page

**Error Handling:**
- Fallback UI nếu credits fetch fail
- Graceful degradation - show "Unable to load" thay vì crash

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- Giải quyết core problem: Users bị hết credits đột ngột khi đang coding
- Minimal features, maximum impact
- Dashboard-only, không over-engineer

**Resource Requirements:**
- Frontend developer (Next.js/React)
- Small scope - có thể 1 developer trong vài ngày

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- ✅ Minh (Heavy User) - Thấy credit status ngay, plan top-up trước
- ✅ Hùng (Casual User) - Nhận warning khi credits thấp

**Must-Have Capabilities:**

| Feature | Rationale | Without this? |
|---------|-----------|---------------|
| 🚦 Traffic Light Widget | Core visibility - instant status awareness | Product fails to solve problem |
| 📊 Credits Burndown | Actionable info - "còn ~X requests" | Users can't plan usage |
| 🔔 Critical Banner | Proactive warning - catch users before fail | Users still get surprised |

### Post-MVP Features

**Phase 2 - Integrations:**
| Feature | Value | Dependency |
|---------|-------|------------|
| Webhook Events | External integrations | MVP stable |
| Signed Payloads | Security | Webhooks |
| Discord Webhook | Popular notification channel | Webhooks |

**Phase 3 - Platform Expansion:**
| Feature | Value | Dependency |
|---------|-------|------------|
| One-Click Discord OAuth | Easier setup | Discord Webhooks |
| Team Accounts | B2B market | User growth |
| Public Status Page | Transparency | Platform maturity |

### Risk Mitigation Strategy

**Technical Risks:**
| Risk | Mitigation |
|------|------------|
| Real-time updates performance | Start with polling (30s), optimize later if needed |
| Average cost calculation accuracy | Use 7-day rolling average, show "~" estimate |
| Widget breaking existing UI | Component isolation, thorough testing |

**Market Risks:**
| Risk | Mitigation |
|------|------------|
| Users don't notice widget | Prominent placement in header, color-coded |
| Users ignore banner | Dismissable but re-appears at lower thresholds |

**Resource Risks:**
| Risk | Mitigation |
|------|------------|
| Limited dev time | Small scope, 3 focused features |
| Scope creep | Clear MVP boundaries, Phase 2+ deferred |

---

## Functional Requirements

### Credit Status Display

- FR1: Users can view their current credit balance in the dashboard header
- FR2: Users can see a color-coded status indicator (green/yellow/red) representing credit health
- FR3: Users can see estimated remaining requests based on their usage history
- FR4: Users can view credit status without navigating away from current page

### Credit Thresholds & Alerts

- FR5: System can determine credit status based on predefined thresholds ($5, $2)
- FR6: Users can see visual distinction between OK (>$5), Low ($2-5), and Critical (<$2) states
- FR7: Users can receive prominent alert when credits fall below critical threshold
- FR8: Users can dismiss critical credit alerts
- FR9: System can re-display alerts when credits drop to lower thresholds

### Usage Estimation

- FR10: System can calculate average cost per request from user's recent history
- FR11: System can estimate remaining requests based on current balance and average cost
- FR12: Users can see "~X requests remaining" estimation
- FR13: System can handle users with no usage history (fallback display)

### Real-time Updates

- FR14: Users can see credit balance updates without manual page refresh
- FR15: System can refresh credit data at regular intervals (polling)
- FR16: System can trigger immediate refresh after payment success
- FR17: Users can see updated status indicator immediately after credit changes

### Navigation & Actions

- FR18: Users can navigate to top-up page directly from credit widget
- FR19: Users can navigate to top-up page from critical alert banner
- FR20: Users can access credit details from widget (optional click-through)

### Error Handling

- FR21: Users can see fallback UI when credit data fails to load
- FR22: System can gracefully degrade without crashing dashboard
- FR23: Users can see loading state while credit data is being fetched

---

## Non-Functional Requirements

### Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **NFR1: Widget Load Time** | <100ms | Time from dashboard load to widget visible |
| **NFR2: Data Refresh** | <500ms | Time to fetch and update credit data |
| **NFR3: Polling Overhead** | <1% CPU | Background polling không impact performance |
| **NFR4: UI Responsiveness** | No jank | Status changes render instantly (<16ms) |

### Reliability

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **NFR5: Widget Availability** | 99.9% | Widget displays correctly khi dashboard loads |
| **NFR6: Graceful Degradation** | 100% | Dashboard không crash nếu widget fails |
| **NFR7: Error Recovery** | Auto-retry | Failed fetches retry sau 30s |
| **NFR8: State Persistence** | Survives refresh | Banner dismiss state persists trong localStorage |

### Usability

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **NFR9: Visual Clarity** | Instant recognition | Users hiểu status trong <1s |
| **NFR10: Color Contrast** | WCAG AA | Sufficient contrast cho readability |
| **NFR11: Mobile Friendly** | Responsive | Widget usable trên mobile screens |
| **NFR12: Non-intrusive** | Dismissable | Banner không block workflow |

### Compatibility

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **NFR13: Browser Support** | Latest versions | Chrome, Firefox, Safari, Edge |
| **NFR14: Existing UI** | Zero regression | Không break existing dashboard components |
| **NFR15: API Compatibility** | Backward compatible | Works với existing `/api/user/me` endpoint |
