---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - index.md
  - architecture.md
  - api-reference.md
  - data-models.md
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 4
workflowType: 'prd'
lastStep: 11
project_name: 'TrollLLM'
user_name: 'Trant'
date: '2025-12-17'
---

# Product Requirements Document - TrollLLM

**Author:** Trant
**Date:** 2025-12-17

## Executive Summary

### Tổng quan dự án

TrollLLM cần đơn giản hóa hệ thống Rate Limiting và chuyển đổi từ mô hình subscription (Dev/Pro tiers) sang mô hình **Pay-as-you-go** (trả theo sử dụng). Thay đổi này giúp đơn giản hóa trải nghiệm người dùng, loại bỏ sự phức tạp của việc quản lý tiers, và cho phép tất cả users truy cập dịch vụ chỉ cần có credits trong tài khoản.

### Vấn đề cần giải quyết

1. **Phức tạp không cần thiết:** Hệ thống tier Dev/Pro tạo ra friction cho users mới
2. **Barrier to entry:** Free tier users hiện không thể sử dụng dịch vụ dù có credits
3. **Friend Key abuse:** Không có giới hạn RPM riêng cho Friend Keys, có thể bị lạm dụng
4. **Credits management:** Cần đảm bảo credits không bao giờ âm

### Giải pháp đề xuất

| Component | Thay đổi |
|-----------|----------|
| Tier System | Loại bỏ hoàn toàn Dev/Pro tiers |
| User Key Rate Limit | Thống nhất 600 RPM cho tất cả |
| Friend Key Rate Limit | 60 RPM per key (ngăn abuse) |
| Access Control | Chỉ cần credits > 0 để sử dụng |
| Credits Protection | Block hoàn toàn khi credits = 0, không cho phép âm |

### What Makes This Special

Thay đổi này chuyển TrollLLM từ mô hình **subscription-based** sang **usage-based pricing**:

- **Đơn giản hóa UX:** Users không cần chọn plan, chỉ cần nạp credits và sử dụng
- **Công bằng hơn:** Trả đúng theo những gì sử dụng, không có phí cố định hàng tháng
- **Bảo vệ hệ thống:** Friend Key với rate limit thấp hơn (60 vs 600 RPM) ngăn chặn abuse trong khi vẫn cho phép chia sẻ access
- **Zero-debt policy:** Credits không bao giờ âm, đảm bảo tính bền vững tài chính

## Project Classification

**Technical Type:** api_backend
**Domain:** general (SaaS/API platform)
**Complexity:** medium
**Project Context:** Brownfield - extending existing system

### Phạm vi thay đổi

- **GoProxy:** Cập nhật rate limiter logic, loại bỏ tier checking
- **Backend:** Loại bỏ tier từ user model, cập nhật credit checking
- **Frontend:** Loại bỏ UI liên quan đến tier selection, cập nhật dashboard
- **Database:** Migration để remove tier field từ users

## Success Criteria

### User Success

- **Onboarding đơn giản:** Users có thể đăng ký và sử dụng API ngay lập tức chỉ cần có credits, không cần chọn plan
- **Không lo lắng về API key:** Hệ thống tự động quản lý rate limit, user chỉ cần đảm bảo có credits
- **Trải nghiệm nhất quán:** Tất cả users đều có cùng rate limit 600 RPM, không phân biệt tier
- **Friend Key rõ ràng:** Owner biết rõ Friend Key có rate limit 60 RPM, ngăn ngừa abuse

### Business Success

- **User Growth:** Tăng số lượng users mới nhờ loại bỏ barrier của tier system
- **Lower friction:** Giảm abandonment rate trong quá trình onboarding
- **Revenue:** Tăng doanh thu từ mô hình pay-as-you-go (users trả theo sử dụng thực tế)

### Technical Success

- **Zero negative credits:** Hệ thống đảm bảo credits không bao giờ < 0
- **Rate limit enforcement:** 600 RPM cho User Keys, 60 RPM cho Friend Keys hoạt động chính xác
- **API validity:** Giữ nguyên cơ chế API key valid 1 tuần
- **Clean codebase:** Loại bỏ hoàn toàn logic tier Dev/Pro khỏi codebase

### Measurable Outcomes

| Metric | Target |
|--------|--------|
| Onboarding time | < 5 phút từ đăng ký → API call đầu tiên |
| Tier-related support tickets | Giảm về 0 (không còn tier) |
| Credits overdraft | 0 cases (credits < 0) |
| Rate limit violations | < 1% requests bị block do rate limit |

## Product Scope

### MVP - Minimum Viable Product

**Bắt buộc cho release:**
1. Loại bỏ hoàn toàn tier system (Dev/Pro) từ codebase
2. Unified rate limit 600 RPM cho tất cả User Keys
3. Rate limit 60 RPM per Friend Key
4. Access control: chỉ cần credits > 0
5. Block hoàn toàn khi credits = 0
6. Đảm bảo credits không bao giờ âm
7. Cập nhật UI loại bỏ tier selection

### Growth Features (Post-MVP)

- Analytics dashboard cho users xem usage patterns
- Cảnh báo khi credits sắp hết
- Auto top-up credits option

### Vision (Future)

- Fully automated pay-as-you-go platform
- Flexible rate limit tùy chỉnh theo nhu cầu
- API usage forecasting

## User Journeys

### Journey 1: Minh - Developer sử dụng API với Rate Limit mới

Minh là một developer đang xây dựng chatbot cho công ty startup của mình. Anh đã đăng ký TrollLLM và nạp $50 credits để test. Sáng thứ Hai, Minh bắt đầu integrate API vào ứng dụng.

Minh viết script để test load, gửi liên tục 100 requests trong vòng 30 giây. Hệ thống xử lý tất cả mượt mà vì còn trong giới hạn 600 RPM. Hài lòng với performance, Minh tăng lên 800 requests/phút để stress test.

Lần này, sau request thứ 600, Minh nhận response `429 Too Many Requests` với header `Retry-After: 45`. Anh hiểu ngay đây là rate limit và điều chỉnh code thêm exponential backoff. Script của Minh giờ tự động chờ và retry khi gặp 429.

Cuối ngày, Minh deploy chatbot thành công. Với traffic thực tế ~200 requests/phút, anh không bao giờ chạm rate limit nữa. Minh đánh giá cao sự đơn giản: không cần chọn plan, không cần upgrade tier - chỉ cần có credits là chạy.

**Requirements revealed:**
- Rate limit 600 RPM cho User Keys
- Response 429 với Retry-After header khi vượt limit
- Không phân biệt tier, tất cả users cùng limit

---

### Journey 2: Lan - Sử dụng Friend Key với giới hạn 60 RPM

Lan là sinh viên IT đang làm đồ án tốt nghiệp về AI. Bạn của cô - Hùng, một user TrollLLM - chia sẻ Friend Key để Lan có thể test API miễn phí.

Lan nhận được key `fk-xxx` từ Hùng kèm lời dặn: "Key này có rate limit 60 RPM thôi nha, dùng tiết kiệm!" Lan bắt đầu gọi API từ notebook Jupyter, mỗi lần chạy 1-2 requests để test prompt engineering.

Một hôm, Lan viết loop để generate 100 responses cho dataset. Sau 60 requests đầu tiên thành công, cô nhận liên tục error `429 Rate Limit Exceeded - Friend Key limit: 60 RPM`. Lan nhớ lời Hùng và thêm `time.sleep(1)` giữa các requests.

Đồ án hoàn thành tốt đẹp. Lan quyết định đăng ký account riêng và nạp credits để có full 600 RPM cho dự án tiếp theo. Hùng vui vì Friend Key của anh không bị abuse, credits vẫn còn đủ dùng.

**Requirements revealed:**
- Rate limit 60 RPM per Friend Key
- Error message rõ ràng cho Friend Key limit
- Friend Key deduct credits từ owner
- Khuyến khích Friend Key users upgrade lên account riêng

---

### Journey 3: Tuấn - Hết credits và bị block

Tuấn là freelancer sử dụng TrollLLM cho công việc content writing. Anh thường nạp $20/tháng và dùng hết trong ~3 tuần. Hôm nay là deadline gấp với client.

Tuấn đang viết email quan trọng, credits còn $0.15. Anh gửi request với prompt dài, token cost ước tính $0.20. Hệ thống tính toán: credits hiện tại ($0.15) < cost dự kiến ($0.20).

Thay vì xử lý request và để credits âm, hệ thống trả về `402 Payment Required: Insufficient credits. Current balance: $0.15`. Request không được forward đến upstream API.

Tuấn thấy error, check dashboard và thấy credits gần hết. Anh nhanh chóng nạp thêm $10 qua payment gateway. Sau 30 giây, credits được cộng và Tuấn tiếp tục công việc. Email hoàn thành đúng deadline.

Tuấn đánh giá cao việc hệ thống không cho phép nợ credits - anh luôn biết chính xác chi phí và không bao giờ bị "surprise bill".

**Requirements revealed:**
- Block request khi credits không đủ cho estimated cost
- Credits không bao giờ âm (zero-debt policy)
- Error 402 với thông tin balance hiện tại
- Nạp credits và sử dụng ngay lập tức

---

### Journey Requirements Summary

| Journey | Key Requirements |
|---------|-----------------|
| **User API (Minh)** | 600 RPM limit, 429 response với Retry-After, unified limit cho tất cả users |
| **Friend Key (Lan)** | 60 RPM per key, clear error message, deduct từ owner credits |
| **Credits Exhausted (Tuấn)** | Pre-check credits before request, 402 error, zero-debt policy, instant top-up |

### Capabilities Revealed

1. **Rate Limiting System**
   - Sliding window rate limiter
   - Different limits: User Key (600 RPM) vs Friend Key (60 RPM)
   - Proper 429 responses với Retry-After header

2. **Credits Management**
   - Pre-request credits validation
   - Atomic deduction (không cho phép race condition)
   - Zero-debt enforcement

3. **Error Handling**
   - 429 Too Many Requests (rate limit)
   - 402 Payment Required (insufficient credits)
   - Clear, actionable error messages

## API Backend Specific Requirements

### Project-Type Overview

TrollLLM là một API proxy service với hai endpoints chính tương thích với OpenAI và Anthropic formats. Thay đổi rate limiting sẽ được implement mà không cần version mới, backwards compatible với clients hiện tại.

### Rate Limiting Specifications

#### Rate Limits by Key Type

| Key Type | Rate Limit | Scope |
|----------|------------|-------|
| User Key (`sk-troll-*`) | 600 RPM | Per key |
| Friend Key (`fk-*`) | 60 RPM | Per key |

#### Rate Limit Algorithm

- **Type:** Sliding window
- **Window:** 60 seconds
- **Reset:** Rolling (không reset cứng vào đầu phút)

### Error Response Formats

#### For `/v1/chat/completions` (OpenAI Format)

```json
{
  "error": {
    "message": "Rate limit exceeded. Please retry after 45 seconds.",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}
```

#### For `/v1/messages` (Anthropic Format)

```json
{
  "type": "error",
  "error": {
    "type": "rate_limit_error",
    "message": "Rate limit exceeded. Please retry after 45 seconds."
  }
}
```

#### For Insufficient Credits

**OpenAI endpoint:**
```json
{
  "error": {
    "message": "Insufficient credits. Current balance: $0.15",
    "type": "insufficient_quota",
    "code": "insufficient_credits"
  }
}
```

**Anthropic endpoint:**
```json
{
  "type": "error",
  "error": {
    "type": "insufficient_credits",
    "message": "Insufficient credits. Current balance: $0.15"
  }
}
```

### Response Headers

#### Rate Limit Headers (included in every response)

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Reset` | Unix timestamp khi window reset | `1702814460` |
| `Retry-After` | Seconds to wait (chỉ khi 429) | `45` |

### HTTP Status Codes

| Status | Condition | Response |
|--------|-----------|----------|
| `200` | Success | Normal response |
| `429` | Rate limit exceeded | Error + Retry-After header |
| `402` | Insufficient credits | Error với balance info |
| `401` | Invalid API key | Authentication error |

### API Versioning

- **Version:** Không cần version mới
- **Backwards Compatibility:** 100% compatible với clients hiện tại
- **Breaking Changes:** Không có

### Implementation Considerations

#### GoProxy Changes

1. **Rate Limiter Module:**
   - Cập nhật `internal/ratelimit/` để support 2 limits (600/60 RPM)
   - Thêm key type detection (User Key vs Friend Key)
   - Implement sliding window algorithm

2. **Response Formatting:**
   - Detect endpoint type từ request path
   - Format error response theo endpoint (OpenAI vs Anthropic)

3. **Header Injection:**
   - Add `X-RateLimit-Reset` vào tất cả responses
   - Add `Retry-After` chỉ khi return 429

#### Credits Check

- Pre-request validation: Check credits trước khi forward
- Atomic deduction: Đảm bảo không race condition
- Zero-debt enforcement: Block nếu credits <= 0

### Data Schema Changes

#### user_keys Collection

```javascript
// Remove tier field
{
  name: string,
  key: string,
  // tier: 'dev' | 'pro',  // REMOVE THIS
  isActive: boolean,
  // ... other fields unchanged
}
```

Rate limit giờ là constant, không còn dynamic theo tier.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- Giải quyết vấn đề cụ thể: legacy tier code + thiếu rate limit cho Friend Key
- Không over-engineer, focus vào core changes

**Resource Requirements:**
- 1 developer (full-stack/Go)
- Estimate: 2-3 ngày development + 1 ngày testing

### MVP Feature Set (Phase 1)

**Core Changes (Bắt buộc):**

| # | Feature | Component | Priority |
|---|---------|-----------|----------|
| 1 | Remove tier from user_keys | Backend + GoProxy | P0 |
| 2 | Unified 600 RPM rate limit | GoProxy | P0 |
| 3 | Friend Key 60 RPM rate limit | GoProxy | P0 |
| 4 | Pre-request credits check | GoProxy | P0 |
| 5 | Zero-debt enforcement | GoProxy | P0 |
| 6 | Error format by endpoint | GoProxy | P0 |
| 7 | Rate limit headers | GoProxy | P0 |
| 8 | Remove tier UI | Frontend | P1 |

### Post-MVP Features

**Phase 2 (Growth):**
- Analytics dashboard cho users xem usage patterns
- Cảnh báo khi credits sắp hết (email/dashboard)
- Rate limit usage visualization

**Phase 3 (Expansion):**
- Auto top-up credits option
- Flexible rate limit tùy chỉnh theo nhu cầu
- API usage forecasting và recommendations

### Risk Mitigation Strategy

**Technical Risks:**
- Risk: Breaking existing users
- Mitigation: Backwards compatible, không đổi API version

**Market Risks:**
- Risk: Users phản đối rate limit mới
- Mitigation: 600 RPM là generous, Friend Key 60 RPM hợp lý

**Resource Risks:**
- Risk: Thiếu thời gian test
- Mitigation: Scope nhỏ, có thể test manual trước khi deploy

## Functional Requirements

### Rate Limiting

- FR1: System can enforce 600 RPM rate limit for User Keys (`sk-troll-*`)
- FR2: System can enforce 60 RPM rate limit for Friend Keys (`fk-*`)
- FR3: System can detect key type (User Key vs Friend Key) from API key prefix
- FR4: System can track request count per key using sliding window algorithm
- FR5: System can return 429 status code when rate limit exceeded
- FR6: System can include `Retry-After` header in 429 responses
- FR7: System can include `X-RateLimit-Reset` header in all responses

### Credits Management

- FR8: System can check user credits balance before processing request
- FR9: System can block request if credits balance is insufficient
- FR10: System can return 402 status code with current balance when credits insufficient
- FR11: System can deduct credits atomically (prevent race conditions)
- FR12: System can ensure credits never become negative (zero-debt policy)
- FR13: Friend Key can deduct credits from owner's account

### Error Handling

- FR14: System can return OpenAI-format error for `/v1/chat/completions` endpoint
- FR15: System can return Anthropic-format error for `/v1/messages` endpoint
- FR16: System can include actionable information in error messages (balance, retry time)

### Tier System Removal

- FR17: System can authenticate User Keys without tier validation
- FR18: System can process requests regardless of user tier (Dev/Pro)
- FR19: Admin can view users without tier column in admin dashboard
- FR20: System can ignore legacy tier field if present in database

### API Key Validation

- FR21: System can validate User Key exists and is active
- FR22: System can validate Friend Key exists and is active
- FR23: System can validate Friend Key owner has sufficient credits
- FR24: System can reject requests with invalid or inactive API keys

### User Dashboard

- FR25: User can view current credits balance
- FR26: User can view API usage without tier information
- FR27: User can manage Friend Keys without tier restrictions
- FR28: User can see rate limit information (600 RPM for User Key, 60 RPM for Friend Key)

### Admin Dashboard

- FR29: Admin can view user list without tier column
- FR30: Admin can manage user credits
- FR31: Admin can view system-wide rate limiting metrics

## Non-Functional Requirements

### Performance

- **NFR1:** Rate limit check response time < 5ms (không ảnh hưởng đáng kể đến latency)
- **NFR2:** Credits check và deduction < 10ms
- **NFR3:** Sliding window calculation không block request processing
- **NFR4:** Error response generation < 1ms

### Security

- **NFR5:** API keys không được log ở bất kỳ đâu (sensitive data)
- **NFR6:** Credits balance không được exposed trong error messages cho Friend Key users (chỉ owner biết)
- **NFR7:** Rate limit state per key không accessible từ outside
- **NFR8:** Credits deduction phải atomic để prevent race conditions

### Reliability

- **NFR9:** Rate limiter state phải persist qua restart (không reset window)
- **NFR10:** Credits deduction phải đảm bảo consistency (không double-deduct, không skip)
- **NFR11:** System phải gracefully handle database connection failures
- **NFR12:** Rate limit headers phải accurate (không misleading)

### Backwards Compatibility

- **NFR13:** Existing API keys tiếp tục hoạt động không cần modification
- **NFR14:** Existing client code không cần update
- **NFR15:** Legacy tier field nếu còn trong database không gây error

