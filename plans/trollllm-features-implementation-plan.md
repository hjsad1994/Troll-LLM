# Implementation Plan - TrollLLM New Features

**Generated from:** Brainstorming Session 2025-12-19
**Author:** Mary (Business Analyst)
**Status:** Ready for Implementation

---

## Executive Summary

Dựa trên kết quả brainstorming với Six Thinking Hats, plan này định nghĩa các tính năng mới cho TrollLLM tập trung vào **Dashboard Notifications** và **Webhook Integrations**.

**Key Decisions:**
- ❌ Bỏ Usage analytics - users không cần
- ✅ Dashboard-only notifications (không email)
- ✅ Traffic Light Widget + Credits Burndown = MVP
- ✅ Webhook = backup cho real-time alerts

---

## Phase 1: MVP Features

### Feature 1.1: Traffic Light Widget 🚦

**Mô tả:** Visual indicator trên dashboard header hiển thị trạng thái credits

**Specification:**

| Credits | Status | Color | Icon |
|---------|--------|-------|------|
| > $5 | OK | 🟢 Green | ✓ |
| $2 - $5 | Low | 🟡 Yellow | ⚠️ |
| < $2 | Critical | 🔴 Red | ⚠️ |

**Implementation:**

**Frontend (Next.js):**
```typescript
// components/CreditsStatusWidget.tsx
interface CreditsStatus {
  balance: number;
  status: 'ok' | 'low' | 'critical';
  color: string;
}

function getCreditsStatus(balance: number): CreditsStatus {
  if (balance > 5) return { balance, status: 'ok', color: 'green' };
  if (balance >= 2) return { balance, status: 'low', color: 'yellow' };
  return { balance, status: 'critical', color: 'red' };
}
```

**Location:** Dashboard header, always visible

**Acceptance Criteria:**
- [ ] Widget hiển thị đúng color theo balance
- [ ] Hover tooltip hiển thị exact balance
- [ ] Click navigates to payment page
- [ ] Real-time update khi balance thay đổi

---

### Feature 1.2: Credits Burndown 📊

**Mô tả:** Hiển thị estimate số requests còn lại dựa trên average cost

**Calculation Logic:**

```
average_cost = total_spent_7_days / total_requests_7_days
remaining_requests = current_balance / average_cost

Fallback cases:
- Không có history → "Top up to start tracking"
- average_cost = 0 → "N/A"
```

**Implementation:**

**Backend API:**
```typescript
// GET /api/users/credits-estimate
interface CreditsEstimate {
  currentBalance: number;
  avgCostPerRequest: number;
  estimatedRequestsRemaining: number;
  calculationBasis: '7_days' | 'all_time' | 'none';
}
```

**Frontend:**
```typescript
// Display format
"~{estimatedRequests} requests remaining"
// or
"Top up to see estimate"
```

**Acceptance Criteria:**
- [ ] API endpoint trả về estimate chính xác
- [ ] Frontend hiển thị estimate với format friendly
- [ ] Tooltip giải thích cách tính
- [ ] Handle edge cases (no history, zero balance)

---

### Feature 1.3: Critical Credits Banner 🔔

**Mô tả:** Banner alert khi credits < $2, dismissable

**Behavior:**

| State | Display |
|-------|---------|
| credits < $2 | Show banner with "Low credits! Top up now" |
| User dismisses | Hide for 24 hours (store in localStorage) |
| credits >= $2 | Auto-hide banner |

**Implementation:**

```typescript
// components/CriticalCreditsBanner.tsx
interface BannerProps {
  balance: number;
  onDismiss: () => void;
}

// localStorage key: 'credits_banner_dismissed_until'
```

**Acceptance Criteria:**
- [ ] Banner hiển thị khi credits < $2
- [ ] Dismiss button hoạt động
- [ ] Banner không hiện lại trong 24h sau dismiss
- [ ] Auto-hide khi user top up

---

## Phase 2: Webhook Integration

### Feature 2.1: Webhook Events

**Events to implement:**

| Event | Trigger | Payload |
|-------|---------|---------|
| `credits.low` | credits < $2 | user_id, current_balance, threshold |
| `credits.empty` | credits = $0 | user_id, last_request_time |
| `payment.success` | Payment completed | user_id, amount, new_balance |

### Feature 2.2: Webhook Configuration

**Backend API:**

```typescript
// POST /api/webhooks
{
  "url": "https://example.com/webhook",
  "events": ["credits.low", "credits.empty", "payment.success"],
  "secret": "auto-generated-or-user-provided"
}

// GET /api/webhooks
// DELETE /api/webhooks/:id
```

### Feature 2.3: Signed Payloads

**HMAC Signature:**

```typescript
// Signature generation
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Header: X-TrollLLM-Signature: sha256={signature}
```

### Feature 2.4: Discord Webhook Formatting

**Pre-formatted message:**

```json
{
  "embeds": [{
    "title": "⚠️ Low Credits Alert",
    "description": "Your TrollLLM credits are running low!",
    "color": 16776960,
    "fields": [
      {"name": "Current Balance", "value": "$1.50", "inline": true},
      {"name": "Threshold", "value": "$2.00", "inline": true}
    ],
    "footer": {"text": "TrollLLM Notifications"}
  }]
}
```

---

## Phase 3: Future Features (Backlog)

| Feature | Description | Priority |
|---------|-------------|----------|
| One-Click Discord OAuth | Auto-setup webhook via Discord OAuth | P2 |
| Team Accounts | Shared credits pool, individual API keys | P2 |
| Public Status Page | status.trollllm.xyz with uptime metrics | P2 |
| Telegram Bot | Alternative notification channel | P3 |
| Zapier Templates | Pre-built automation templates | P3 |

---

## Technical Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ Traffic Light│ │ Credits      │ │ Critical Banner  │ │
│  │ Widget       │ │ Burndown     │ │                  │ │
│  └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘ │
│         │                │                   │           │
│         └────────────────┴───────────────────┘           │
│                          │                               │
└──────────────────────────┼───────────────────────────────┘
                           │ API Calls
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ /api/users/  │ │ /api/webhooks│ │ Webhook          │ │
│  │ credits      │ │              │ │ Dispatcher       │ │
│  └──────────────┘ └──────────────┘ └────────┬─────────┘ │
│                                              │           │
└──────────────────────────────────────────────┼───────────┘
                                               │
                                               ▼
                              ┌────────────────────────────┐
                              │ External Webhooks          │
                              │ - Discord                  │
                              │ - Custom URLs              │
                              └────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1 Checklist

- [ ] **Traffic Light Widget**
  - [ ] Create CreditsStatusWidget component
  - [ ] Add to dashboard layout
  - [ ] Implement color logic
  - [ ] Add tooltip và click handler

- [ ] **Credits Burndown**
  - [ ] Create backend API endpoint
  - [ ] Calculate average cost from request logs
  - [ ] Create frontend display component
  - [ ] Handle edge cases

- [ ] **Critical Banner**
  - [ ] Create CriticalCreditsBanner component
  - [ ] Implement dismiss với localStorage
  - [ ] Add 24h cooldown logic
  - [ ] Style theo design system

### Phase 2 Checklist

- [ ] **Webhook Infrastructure**
  - [ ] Create webhooks collection in MongoDB
  - [ ] Implement CRUD API endpoints
  - [ ] Create webhook dispatcher service
  - [ ] Implement retry logic

- [ ] **Webhook Security**
  - [ ] Implement HMAC signature generation
  - [ ] Add signature to all webhook payloads
  - [ ] Document verification for users

- [ ] **Discord Integration**
  - [ ] Create Discord message formatter
  - [ ] Add Discord-specific webhook handling
  - [ ] Test với actual Discord webhook

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Credits exhaustion surprise | Reduce 80% | Support tickets về "bị block bất ngờ" |
| Dashboard engagement | +20% | Page views on credits-related pages |
| Webhook adoption | 30% users | Users với ít nhất 1 webhook configured |
| Payment conversion | +15% | Users top up sau khi nhận alert |

---

## Next Steps

1. **Technical Review:** Review plan với development team
2. **UI Design:** Create mockups cho dashboard components
3. **Sprint Planning:** Break down thành stories cho sprint
4. **Implementation:** Start với Phase 1 MVP

---

_Plan generated from BMAD Brainstorming Session_
_Date: 2025-12-19_
