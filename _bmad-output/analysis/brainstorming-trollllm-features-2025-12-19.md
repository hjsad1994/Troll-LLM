---
stepsCompleted: [1, 2, 3]
inputDocuments: []
session_topic: 'Tính năng mới cho TrollLLM - Analytics, Notifications, Integrations'
session_goals: 'Khám phá và prioritize tính năng mới cho platform'
selected_approach: 'ai-recommended'
techniques_used: ['six-thinking-hats']
ideas_generated:
  - traffic-light-widget
  - credits-burndown
  - critical-banner
  - webhook-events
  - discord-webhook
context_file: ''
date: '2025-12-19'
user_name: 'Tai'
project_name: 'TrollLLM'
---

# Brainstorming Session - TrollLLM New Features

**Date:** 2025-12-19
**Facilitator:** Mary (Business Analyst)
**Participant:** Tai
**Technique:** Six Thinking Hats

---

## Session Overview

**Topic:** Tính năng mới cho TrollLLM - Focus: Analytics, Notifications, Integrations

**Goals:**
- Khám phá tính năng mới hữu ích cho users
- Cải thiện trải nghiệm người dùng hiện tại
- Phát triển theo hướng pay-as-you-go đã định

**Context:**
- Platform đã có: User/Key management, Payment (SePay), Admin dashboard, Go Proxy
- Đang chuyển đổi sang mô hình credits-based (không tier)
- Rate limiting: 600 RPM (User Key) / 60 RPM (Friend Key)

---

## Six Thinking Hats Analysis

### 🎩⚪ White Hat - Data & Facts

**Key Insights:**
- ❌ **Usage analytics bỏ** - Users không thích, không cần thiết
- ✅ Cost tracking - Credits balance, spending
- ✅ Notifications - Low credits, payments
- ✅ Integrations - Discord, Webhooks

**User Behavior:**
- Users là developers, đã có monitoring tools riêng
- Chỉ cần TrollLLM để proxy requests
- Không cần dashboard phức tạp

---

### 🎩🔴 Red Hat - Emotions & Feelings

**Users muốn:**
- 😊 Simple, không phức tạp
- 😊 Chỉ thông báo khi thực sự cần
- 😊 Không bị interrupt workflow

**Decision:**
- **Dashboard-only notifications, NO email**
- Giảm complexity và không spam inbox

---

### 🎩🟡 Yellow Hat - Benefits & Value

**Dashboard-only approach benefits:**
- ✅ Không spam users
- ✅ Fewer support tickets
- ✅ Faster re-purchase khi hết credits

**Webhook benefits:**
- ✅ Integrate với mọi system
- ✅ 5-minute setup
- ✅ Users không cần vào dashboard
- ✅ Backup cho real-time alerts

---

### 🎩⚫ Black Hat - Risks & Concerns

**Dashboard-only notification risks:**
- 🔴 User không check dashboard → miss alerts
- 🟡 Credits hết khi offline
- 🟡 Banner fatigue

**Mitigations:**
- Webhook là backup cho real-time alerts
- Signed payloads + secrets
- Clear warning thresholds ($2, $1, $0.5)

---

### 🎩🟢 Green Hat - Creativity & Innovation

**Selected Creative Ideas:**

| Idea | Mô tả | Status |
|------|-------|--------|
| 🚦 **Traffic Light Widget** | Visual status: 🟢 OK / 🟡 Low / 🔴 Empty | ✅ SELECTED |
| 📊 **Credits Burndown** | "Còn ~X requests" estimate | ✅ SELECTED |
| 🔗 Webhook Events | `credits.low`, `credits.empty`, `payment.success` | ✅ SELECTED |
| 💬 Discord Webhook | Pre-formatted messages | ✅ SELECTED |

**Deferred Ideas:**
- One-Click Discord OAuth
- Team Accounts (B2B opportunity)
- Public Status Page
- Referral Rewards v2

---

### 🎩🔵 Blue Hat - Process & Summary

## Final Feature Roadmap

### Phase 1: MVP 🚀

| Feature | Mô tả | Effort | Priority |
|---------|-------|--------|----------|
| **🚦 Traffic Light Widget** | Dashboard header: 🟢 OK (>$5) / 🟡 Low ($2-5) / 🔴 Critical (<$2) | Small | P0 |
| **📊 Credits Burndown** | "Còn ~150 requests (dựa trên avg cost)" | Small | P0 |
| **🔔 Critical Banner** | Alert khi credits < $2, dismissable | Small | P0 |

### Phase 2: Integrations 🔗

| Feature | Mô tả | Effort | Priority |
|---------|-------|--------|----------|
| **Webhook Events** | `credits.low`, `credits.empty`, `payment.success` | Medium | P1 |
| **Signed Payloads** | HMAC signature verification | Small | P1 |
| **Discord Webhook** | Pre-formatted Discord messages | Small | P1 |

### Phase 3: Nice-to-have ✨

| Feature | Mô tả | Effort | Priority |
|---------|-------|--------|----------|
| One-Click Discord OAuth | Auto-setup webhook | Medium | P2 |
| Team Accounts | Shared credits, individual keys | Large | P2 |
| Public Status Page | status.trollllm.xyz | Medium | P2 |

---

## Implementation Notes

### Traffic Light Widget Specification

```
Credits Status Logic:
- 🟢 Green: credits > $5
- 🟡 Yellow: $2 <= credits <= $5  
- 🔴 Red: credits < $2
```

Location: Dashboard header, always visible

### Credits Burndown Specification

```
Calculation:
- Get average cost per request (last 7 days)
- remaining_requests = current_credits / avg_cost_per_request
- Display: "~{remaining_requests} requests remaining"
- Fallback if no history: "Top up to start tracking"
```

### Webhook Events Specification

Events to implement:
1. `credits.low` - Triggered when credits < $2
2. `credits.empty` - Triggered when credits = $0
3. `payment.success` - Triggered on successful payment

Payload structure:
```json
{
  "event": "credits.low",
  "timestamp": "2025-12-19T20:54:00Z",
  "data": {
    "user_id": "...",
    "current_balance": 1.50,
    "threshold": 2.00
  },
  "signature": "hmac-sha256-signature"
}
```

---

## Session Conclusion

**Key Decisions Made:**
1. Bỏ Usage analytics - không cần thiết
2. Dashboard-only notifications - không email
3. Traffic Light + Credits Burndown = MVP must-have
4. Webhook = backup cho real-time alerts

**Next Steps:**
1. Create technical spec for Phase 1 features
2. Design UI mockups for Traffic Light Widget
3. Define webhook payload schema
4. Implement Phase 1 MVP

---

_Generated by BMAD Brainstorming Workflow_
_Technique: Six Thinking Hats_
_Session Date: 2025-12-19_
