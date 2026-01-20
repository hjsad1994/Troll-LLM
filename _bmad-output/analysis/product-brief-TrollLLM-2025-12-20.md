---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - '_bmad-output/analysis/brainstorming-trollllm-features-2025-12-19.md'
  - '_bmad-output/archive/index.md'
  - '_bmad-output/archive/architecture.md'
workflowType: 'product-brief'
lastStep: 5
project_name: 'TrollLLM'
user_name: 'Tai'
date: '2025-12-20'
---

# Product Brief: TrollLLM

**Date:** 2025-12-20
**Author:** Tai

---

## Executive Summary

TrollLLM là LLM API proxy giá rẻ nhất cho Vietnamese developers, cung cấp quyền truy cập các model AI hàng đầu (Claude, GPT) với chi phí thấp nhất thị trường. Platform hoạt động theo mô hình pay-as-you-go, giúp developers chỉ trả tiền cho những gì họ sử dụng mà không cần subscription hay commitment.

Với billing multiplier chỉ ~1.05x, TrollLLM mang đến giải pháp tiết kiệm đáng kể so với việc sử dụng trực tiếp API từ providers hoặc các proxy service khác như OpenRouter.

---

## Core Vision

### Problem Statement

Vietnamese developers cần truy cập LLM APIs cho công việc lập trình hàng ngày, nhưng đang gặp phải hai vấn đề chính:

1. **Chi phí cao**: Sử dụng trực tiếp API từ Anthropic/OpenAI hoặc qua các proxy khác có giá thành cao
2. **Thiếu visibility**: Không có cách theo dõi credit balance real-time, dẫn đến việc hết credits giữa chừng khi đang coding

### Problem Impact

- Developers phải check credit balance thủ công - gây gián đoạn workflow
- Nhiều users bị hết credits đột ngột khi đang giữa coding session
- Thiếu thông tin cần thiết để plan usage hiệu quả
- Chi phí cao hạn chế khả năng experiment và học hỏi với AI

### Why Existing Solutions Fall Short

| Solution | Limitations |
|----------|-------------|
| Direct API (Anthropic/OpenAI) | Giá gốc cao, không có proxy, phải tự quản lý billing |
| OpenRouter | Chi phí cao hơn TrollLLM |
| LiteLLM | Yêu cầu self-host, setup phức tạp |
| Các proxy khác | Thiếu focus vào Vietnamese market, pricing không competitive |

### Proposed Solution

TrollLLM cung cấp:

1. **Giá rẻ nhất**: Billing multiplier ~1.05x - thấp nhất thị trường
2. **Pay-as-you-go**: Không subscription, chỉ trả cho những gì dùng
3. **Real-time Credit Visibility** (upcoming):
   - 🚦 Traffic Light Widget: Visual status 🟢🟡🔴
   - 📊 Credits Burndown: "Còn ~X requests remaining"
   - 🔔 Critical Banner: Alert khi credits thấp
4. **Proactive Notifications** (upcoming):
   - Webhook events cho integration
   - Discord webhook support

### Key Differentiators

1. **Giá cả cạnh tranh nhất** - Focus Vietnamese developers với pricing phù hợp
2. **Simplicity** - Không cần self-host, đăng ký và dùng ngay
3. **Developer-first** - Dashboard-only notifications (không spam email), webhook integrations
4. **Transparency** - Real-time visibility vào credit status và usage

---

## Target Users

### Primary Users

#### Persona 1: Heavy User - "Minh" (Senior Developer)

**Profile:**
- **Tên:** Minh, 28 tuổi
- **Vai trò:** Senior Developer tại startup công nghệ
- **Kinh nghiệm:** 5+ năm coding
- **Môi trường:** Làm việc tại công ty và remote tại nhà

**Usage Pattern:**
- 500-800 requests/ngày
- Sử dụng cho đủ loại coding tasks: code generation, review, debugging, refactoring
- TrollLLM là tool không thể thiếu trong daily workflow

**Pain Points trước TrollLLM:**
- Chi phí API trực tiếp quá cao với usage volume lớn
- Phải check credit balance thủ công, đã từng bị hết credits giữa coding session
- Các proxy khác không competitive về giá

**What Success Looks Like:**
- Bill cuối tháng rẻ hơn đáng kể
- Không lo hết credits đột ngột
- Response nhanh, không gián đoạn workflow

---

#### Persona 2: Casual User - "Hùng" (Fresher/Student)

**Profile:**
- **Tên:** Hùng, 22 tuổi
- **Vai trò:** Fresher Developer / Sinh viên IT
- **Kinh nghiệm:** 0-2 năm
- **Môi trường:** Làm side projects, học tập

**Usage Pattern:**
- 10-50 requests/ngày (không đều)
- Sử dụng cho side projects, học coding, thử nghiệm
- Dùng khi cần AI assistance cho tasks khó

**Pain Points trước TrollLLM:**
- Budget hạn chế, không thể afford API đắt
- Muốn experiment với AI nhưng sợ tốn tiền
- Cần giải pháp pay-as-you-go phù hợp với usage không đều

**What Success Looks Like:**
- Có thể dùng LLM APIs mà không lo về chi phí
- Pay-as-you-go phù hợp với việc dùng không thường xuyên
- Học và phát triển kỹ năng với AI assistance

---

### Secondary Users

Không có secondary users được xác định. TrollLLM là B2C product phục vụ trực tiếp developers.

---

### User Journey

#### 1. Discovery (Khám phá)
- Users biết đến TrollLLM qua **social media** (Facebook groups, Discord communities, Twitter/X)
- Word of mouth từ developers khác trong community
- Thấy posts về "LLM API giá rẻ cho Vietnamese developers"

#### 2. Onboarding (Bắt đầu sử dụng)
- Đăng ký account đơn giản
- Nạp credits đầu tiên qua SePay
- Nhận API key và bắt đầu sử dụng ngay

#### 3. Core Usage (Sử dụng hàng ngày)
- Integrate API key vào IDE/tools (Claude Code, Cursor, etc.)
- Sử dụng cho coding tasks hàng ngày
- Check dashboard khi cần xem balance

#### 4. "Aha!" Moment (Khoảnh khắc nhận ra giá trị)
- **Khi thấy bill cuối tháng rẻ hơn nhiều** so với alternatives
- **Khi trải nghiệm response nhanh, mượt mà** không lag
- Nhận ra đây là giải pháp tối ưu cho Vietnamese developers

#### 5. Long-term (Sử dụng lâu dài)
- TrollLLM trở thành default LLM proxy
- Top-up credits định kỳ
- Recommend cho đồng nghiệp và bạn bè developers

---

## Success Metrics

### User Success Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Cost Savings** | % tiết kiệm so với direct API | >30% cheaper |
| **Zero Interruption** | Users không bị hết credits đột ngột | <5% users experience credit exhaustion mid-session |
| **Response Quality** | Response nhanh, mượt mà | <2s average latency |
| **User Satisfaction** | Users recommend TrollLLM | NPS > 40 |

### Business Objectives

**3-Month Goals:**
- Establish stable user base
- Maintain positive unit economics (revenue > costs)
- Zero critical downtime

**12-Month Goals:**
- Grow Vietnamese developer market share
- Sustainable revenue growth
- Strong word-of-mouth acquisition

### Key Performance Indicators

| KPI | Description | Measurement |
|-----|-------------|-------------|
| **MAU** | Monthly Active Users | Unique API keys with >1 request/month |
| **Revenue** | Monthly recurring revenue | Total credits purchased/month |
| **Retention** | User retention rate | % users active month-over-month |
| **ARPU** | Average Revenue Per User | Total revenue / Active users |
| **Usage Volume** | Total requests processed | Requests/day across platform |

---

## MVP Scope

### Core Features

**Phase 1 MVP - Credit Visibility Features:**

| Feature | Mô tả | Priority |
|---------|-------|----------|
| 🚦 **Traffic Light Widget** | Visual status indicator trên dashboard header: 🟢 OK (>$5) / 🟡 Low ($2-5) / 🔴 Critical (<$2) | P0 |
| 📊 **Credits Burndown** | Hiển thị "Còn ~X requests remaining" dựa trên average cost per request | P0 |
| 🔔 **Critical Banner** | Alert banner khi credits < $2, dismissable, nhắc nhở user top-up | P0 |

**MVP Value Proposition:**
- Users có real-time visibility vào credit status
- Proactive warning trước khi hết credits
- Giảm thiểu workflow interruption do hết credits đột ngột

### Out of Scope for MVP

| Feature | Lý do defer | Phase |
|---------|-------------|-------|
| **Webhook Events** | Nice-to-have, không essential cho core value | Phase 2 |
| **Discord Webhook** | Integration feature, cần MVP stable trước | Phase 2 |
| **Signed Payloads** | Security enhancement cho webhooks | Phase 2 |
| **One-Click Discord OAuth** | Advanced integration | Phase 3 |
| **Team Accounts** | B2B feature, focus B2C trước | Phase 3 |
| **Public Status Page** | Infrastructure enhancement | Phase 3 |

### MVP Success Criteria

**Primary Success Metrics:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Widget Adoption** | >80% active users see widget | Dashboard analytics |
| **Credit Exhaustion Reduction** | <5% users hết credits đột ngột | Compare before/after MVP |
| **User Awareness** | Users biết credit status trước khi critical | Survey/feedback |

**Go/No-Go Decision:**
- ✅ **Go to Phase 2** nếu: Widget adoption >80%, credit exhaustion giảm >50%
- ⚠️ **Iterate** nếu: Metrics không đạt, cần improve UX
- ❌ **Pivot** nếu: Users không quan tâm đến credit visibility

### Future Vision

**Trong vài tháng tới:**
- TrollLLM trở thành nền tảng LLM proxy được nhiều Vietnamese developers biết đến
- Word-of-mouth growth từ satisfied users
- Community building trong Vietnamese developer ecosystem

**Phase 2 - Integrations:**
- Webhook events cho external integrations
- Discord notifications cho real-time alerts
- Developer-friendly API cho custom integrations

**Phase 3 - Platform Expansion:**
- Team accounts cho B2B market
- Advanced analytics (nếu users yêu cầu)
- Public status page cho transparency
- Referral program để accelerate growth

**Long-term Vision:**
- Trở thành default LLM proxy choice cho Vietnamese developers
- Expand sang Southeast Asian developer market
- Build ecosystem với plugins và integrations
