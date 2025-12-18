---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - prd.md
  - architecture-decisions.md
workflowType: 'epics'
lastStep: 4
status: 'complete'
completedAt: '2025-12-17'
project_name: 'TrollLLM'
user_name: 'Trant'
date: '2025-12-17'
---

# TrollLLM - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for TrollLLM Rate Limiting Refactoring, decomposing the requirements from the PRD and Architecture decisions into implementable stories.

## Requirements Inventory

### Functional Requirements

**Rate Limiting (FR1-FR7):**
- FR1: System can enforce 600 RPM rate limit for User Keys (`sk-troll-*`)
- FR2: System can enforce 60 RPM rate limit for Friend Keys (`fk-*`)
- FR3: System can detect key type (User Key vs Friend Key) from API key prefix
- FR4: System can track request count per key using sliding window algorithm
- FR5: System can return 429 status code when rate limit exceeded
- FR6: System can include `Retry-After` header in 429 responses
- FR7: System can include `X-RateLimit-Reset` header in all responses

**Credits Management (FR8-FR13):**
- FR8: System can check user credits balance before processing request
- FR9: System can block request if credits balance is insufficient
- FR10: System can return 402 status code with current balance when credits insufficient
- FR11: System can deduct credits atomically (prevent race conditions)
- FR12: System can ensure credits never become negative (zero-debt policy)
- FR13: Friend Key can deduct credits from owner's account

**Error Handling (FR14-FR16):**
- FR14: System can return OpenAI-format error for `/v1/chat/completions` endpoint
- FR15: System can return Anthropic-format error for `/v1/messages` endpoint
- FR16: System can include actionable information in error messages (balance, retry time)

**Tier System Removal (FR17-FR20):**
- FR17: System can authenticate User Keys without tier validation
- FR18: System can process requests regardless of user tier (Dev/Pro)
- FR19: Admin can view users without tier column in admin dashboard
- FR20: System can ignore legacy tier field if present in database

**API Key Validation (FR21-FR24):**
- FR21: System can validate User Key exists and is active
- FR22: System can validate Friend Key exists and is active
- FR23: System can validate Friend Key owner has sufficient credits
- FR24: System can reject requests with invalid or inactive API keys

**User Dashboard (FR25-FR28):**
- FR25: User can view current credits balance
- FR26: User can view API usage without tier information
- FR27: User can manage Friend Keys without tier restrictions
- FR28: User can see rate limit information (600 RPM for User Key, 60 RPM for Friend Key)

**Admin Dashboard (FR29-FR31):**
- FR29: Admin can view user list without tier column
- FR30: Admin can manage user credits
- FR31: Admin can view system-wide rate limiting metrics

### NonFunctional Requirements

**Performance:**
- NFR1: Rate limit check response time < 5ms
- NFR2: Credits check và deduction < 10ms
- NFR3: Sliding window calculation không block request processing
- NFR4: Error response generation < 1ms

**Security:**
- NFR5: API keys không được log ở bất kỳ đâu
- NFR6: Credits balance không được exposed trong error messages cho Friend Key users
- NFR7: Rate limit state per key không accessible từ outside
- NFR8: Credits deduction phải atomic để prevent race conditions

**Reliability:**
- NFR9: Rate limiter state phải persist qua restart
- NFR10: Credits deduction phải đảm bảo consistency
- NFR11: System phải gracefully handle database connection failures
- NFR12: Rate limit headers phải accurate

**Backwards Compatibility:**
- NFR13: Existing API keys tiếp tục hoạt động không cần modification
- NFR14: Existing client code không cần update
- NFR15: Legacy tier field nếu còn trong database không gây error

### Additional Requirements

**From Architecture Decisions:**
- Brownfield project - modify existing codebase, no starter template needed
- Key-type detection via string prefix check (`sk-troll-*` → User Key, `fk-*` → Friend Key)
- Rate limit values as hardcoded constants (600 RPM User Key, 60 RPM Friend Key)
- Dual error format detection by endpoint path
- Soft deprecate tier field (keep in DB, ignore in code completely)
- Headers: Only `X-RateLimit-Reset` + `Retry-After` (on 429)

**Files to Modify:**
- `goproxy/internal/ratelimit/ratelimit.go` - Key-type detection, dual rate limits
- `goproxy/internal/userkey/userkey.go` - Remove tier validation
- `goproxy/main.go` - Error response formatting, headers
- `backend/src/models/UserKey.ts` - Ignore tier field
- `backend/src/routes/user.ts` - Remove tier from API responses
- `frontend/src/components/dashboard/` - Remove tier display

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | 600 RPM rate limit for User Keys |
| FR2 | Epic 1 | 60 RPM rate limit for Friend Keys |
| FR3 | Epic 1 | Key type detection from prefix |
| FR4 | Epic 1 | Sliding window request tracking |
| FR5 | Epic 1 | 429 status code on rate limit |
| FR6 | Epic 1 | Retry-After header |
| FR7 | Epic 1 | X-RateLimit-Reset header |
| FR8 | Epic 2 | Pre-request credits check |
| FR9 | Epic 2 | Block on insufficient credits |
| FR10 | Epic 2 | 402 status with balance |
| FR11 | Epic 2 | Atomic credits deduction |
| FR12 | Epic 2 | Zero-debt policy |
| FR13 | Epic 2 | Friend Key deducts from owner |
| FR14 | Epic 4 | OpenAI error format |
| FR15 | Epic 4 | Anthropic error format |
| FR16 | Epic 4 | Actionable error messages |
| FR17 | Epic 3 | Auth without tier validation |
| FR18 | Epic 3 | Process regardless of tier |
| FR19 | Epic 3 | Admin view without tier column |
| FR20 | Epic 3 | Ignore legacy tier field |
| FR21 | Epic 3 | Validate User Key exists |
| FR22 | Epic 3 | Validate Friend Key exists |
| FR23 | Epic 3 | Validate Friend Key owner credits |
| FR24 | Epic 3 | Reject invalid keys |
| FR25 | Epic 5 | User view credits balance |
| FR26 | Epic 5 | User view usage without tier |
| FR27 | Epic 5 | User manage Friend Keys |
| FR28 | Epic 5 | User see rate limit info |
| FR29 | Epic 5 | Admin view users without tier |
| FR30 | Epic 5 | Admin manage credits |
| FR31 | Epic 5 | Admin view rate limit metrics |

## Epic List

### Epic 1: Unified Rate Limiting System
Tất cả users có thể sử dụng API với rate limit thống nhất (600 RPM), Friend Keys có rate limit riêng (60 RPM) để ngăn abuse.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7

---

### Epic 2: Pay-as-you-go Credits System
Users chỉ cần có credits > 0 để sử dụng API, không còn phụ thuộc vào tier. Credits được bảo vệ không bao giờ âm.

**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13

---

### Epic 3: Tier System Removal
Users không còn thấy/bị ảnh hưởng bởi tier (Dev/Pro), trải nghiệm đơn giản hóa.

**FRs covered:** FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24

---

### Epic 4: Error Response Standardization
Users nhận error messages rõ ràng, actionable với đúng format (OpenAI/Anthropic) tùy endpoint.

**FRs covered:** FR14, FR15, FR16

---

### Epic 5: Dashboard Updates
Users và Admins có dashboard cập nhật, không còn hiển thị tier, thể hiện rate limit info mới.

**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30, FR31

---

## Epic 1: Unified Rate Limiting System

Tất cả users có thể sử dụng API với rate limit thống nhất (600 RPM), Friend Keys có rate limit riêng (60 RPM) để ngăn abuse.

### Story 1.1: Key Type Detection

As a **GoProxy developer**,
I want the system to detect key type from API key prefix,
So that different rate limits can be applied.

**Acceptance Criteria:**

**Given** an API request with key `sk-troll-xxx`
**When** the rate limiter processes the request
**Then** the key is identified as User Key type
**And** 600 RPM limit is applied

**Given** an API request with key `fk-xxx`
**When** the rate limiter processes the request
**Then** the key is identified as Friend Key type
**And** 60 RPM limit is applied

---

### Story 1.2: Unified Rate Limit Implementation

As a **API user**,
I want all User Keys to have 600 RPM rate limit,
So that I don't need to worry about tier limitations.

**Acceptance Criteria:**

**Given** a User Key (`sk-troll-*`) with any tier value in database
**When** 600 requests are made within 60 seconds
**Then** all 600 requests succeed
**And** the 601st request returns 429 status

**Given** tier field has any value (dev/pro/null)
**When** rate limit is checked
**Then** tier is ignored, 600 RPM is always applied

---

### Story 1.3: Friend Key Rate Limit

As a **Friend Key user**,
I want my key to have 60 RPM rate limit,
So that I can use the API responsibly without abusing the owner's credits.

**Acceptance Criteria:**

**Given** a Friend Key (`fk-*`)
**When** 60 requests are made within 60 seconds
**Then** all 60 requests succeed
**And** the 61st request returns 429 status

---

### Story 1.4: Rate Limit Headers

As a **API client developer**,
I want rate limit information in response headers,
So that I can implement proper retry logic.

**Acceptance Criteria:**

**Given** any successful API response
**When** the response is returned
**Then** `X-RateLimit-Reset` header is included with Unix timestamp

**Given** a 429 rate limit response
**When** the response is returned
**Then** `Retry-After` header is included with seconds to wait
**And** `X-RateLimit-Reset` header is included

---

## Epic 2: Pay-as-you-go Credits System

Users chỉ cần có credits > 0 để sử dụng API, không còn phụ thuộc vào tier. Credits được bảo vệ không bao giờ âm.

### Story 2.1: Pre-request Credits Validation

As a **API user**,
I want the system to check my credits before processing requests,
So that I know immediately if I don't have enough credits.

**Acceptance Criteria:**

**Given** a user with credits > 0
**When** they make an API request
**Then** the request is forwarded to upstream

**Given** a user with credits = 0 and refCredits = 0
**When** they make an API request
**Then** the request is blocked with 402 status
**And** response includes current balance: $0.00

---

### Story 2.2: Zero-Debt Policy Enforcement

As a **system administrator**,
I want credits to never become negative,
So that the business doesn't incur debt.

**Acceptance Criteria:**

**Given** a user with credits = $0.15
**When** a request would cost $0.20
**Then** the request is blocked before processing
**And** credits remain at $0.15 (not -$0.05)

**Given** concurrent requests from same user
**When** credits are being deducted
**Then** atomic operations prevent race conditions
**And** credits never go below zero

---

### Story 2.3: Friend Key Credits Deduction

As a **Friend Key owner**,
I want Friend Key usage to deduct from my credits,
So that I maintain control over spending.

**Acceptance Criteria:**

**Given** a Friend Key used by another person
**When** they make an API request
**Then** credits are deducted from owner's account
**And** owner can see the usage in their dashboard

**Given** a Friend Key owner with credits = 0
**When** Friend Key user tries to make a request
**Then** the request is blocked with 402 status

---

## Epic 3: Tier System Removal

Users không còn thấy/bị ảnh hưởng bởi tier (Dev/Pro), trải nghiệm đơn giản hóa.

### Story 3.1: Remove Tier Validation from GoProxy

As a **API user**,
I want to use the API without tier restrictions,
So that my experience is simpler and consistent.

**Acceptance Criteria:**

**Given** a User Key with tier = "dev"
**When** making an API request
**Then** request is processed without tier check
**And** rate limit is 600 RPM (not 300 RPM)

**Given** a User Key with tier = null or missing
**When** making an API request
**Then** request is processed normally
**And** no error occurs due to missing tier

---

### Story 3.2: Remove Tier from Backend API

As a **backend developer**,
I want tier field ignored in backend logic,
So that API responses don't include tier information.

**Acceptance Criteria:**

**Given** a GET /api/user/me request
**When** response is returned
**Then** tier field is not included in response

**Given** a user_keys document with tier field
**When** backend reads the document
**Then** tier field is ignored in all logic

---

### Story 3.3: Key Validation Without Tier

As a **API user**,
I want my keys validated based only on existence and active status,
So that tier doesn't affect my access.

**Acceptance Criteria:**

**Given** a valid, active User Key
**When** validating the key
**Then** validation succeeds regardless of tier value

**Given** a valid, active Friend Key with owner having credits
**When** validating the key
**Then** validation succeeds and owner credits are checked

---

## Epic 4: Error Response Standardization

Users nhận error messages rõ ràng, actionable với đúng format (OpenAI/Anthropic) tùy endpoint.

### Story 4.1: OpenAI Format Error Responses

As a **OpenAI SDK user**,
I want errors from `/v1/chat/completions` in OpenAI format,
So that my client code handles errors correctly.

**Acceptance Criteria:**

**Given** a rate limit error on `/v1/chat/completions`
**When** the error response is returned
**Then** format is: `{"error": {"message": "...", "type": "rate_limit_error", "code": "rate_limit_exceeded"}}`

**Given** an insufficient credits error on `/v1/chat/completions`
**When** the error response is returned
**Then** format is: `{"error": {"message": "Insufficient credits. Current balance: $X.XX", "type": "insufficient_quota", "code": "insufficient_credits"}}`

---

### Story 4.2: Anthropic Format Error Responses

As a **Anthropic SDK user**,
I want errors from `/v1/messages` in Anthropic format,
So that my client code handles errors correctly.

**Acceptance Criteria:**

**Given** a rate limit error on `/v1/messages`
**When** the error response is returned
**Then** format is: `{"type": "error", "error": {"type": "rate_limit_error", "message": "..."}}`

**Given** an insufficient credits error on `/v1/messages`
**When** the error response is returned
**Then** format is: `{"type": "error", "error": {"type": "insufficient_credits", "message": "Insufficient credits. Current balance: $X.XX"}}`

---

### Story 4.3: Actionable Error Information

As a **API user**,
I want error messages to include actionable information,
So that I know what to do next.

**Acceptance Criteria:**

**Given** a 429 rate limit error
**When** the error is returned
**Then** message includes retry time: "Please retry after X seconds"

**Given** a 402 insufficient credits error
**When** the error is returned
**Then** message includes current balance
**And** for Friend Key users, balance is NOT exposed (generic message only)

---

## Epic 5: Dashboard Updates

Users và Admins có dashboard cập nhật, không còn hiển thị tier, thể hiện rate limit info mới.

### Story 5.1: Remove Tier Display from User Dashboard

As a **user**,
I want the dashboard to not show tier information,
So that my experience is simpler without confusing tier labels.

**Acceptance Criteria:**

**Given** a user viewing their dashboard
**When** the dashboard loads
**Then** no tier badge or label is displayed
**And** no tier selection options are shown

**Given** a user viewing their API key section
**When** the key info is displayed
**Then** tier field is not shown

---

### Story 5.2: Display New Rate Limit Information

As a **user**,
I want to see accurate rate limit information,
So that I know my API usage limits.

**Acceptance Criteria:**

**Given** a user viewing their dashboard
**When** rate limit info is displayed
**Then** it shows "600 RPM" for User Key
**And** it shows "60 RPM" for each Friend Key

**Given** a user with Friend Keys
**When** viewing Friend Key details
**Then** rate limit shows "60 RPM per key"

---

### Story 5.3: Remove Tier from Admin Dashboard

As an **admin**,
I want the users table without tier column,
So that the interface is cleaner and reflects the new system.

**Acceptance Criteria:**

**Given** an admin viewing the users list
**When** the table loads
**Then** tier column is not displayed
**And** sorting/filtering by tier is removed

**Given** an admin viewing user details
**When** user info is displayed
**Then** tier field is not shown

---

### Story 5.4: Admin Rate Limit Metrics

As an **admin**,
I want to view system-wide rate limiting metrics,
So that I can monitor usage patterns.

**Acceptance Criteria:**

**Given** an admin viewing metrics dashboard
**When** rate limit metrics are displayed
**Then** shows total 429 responses
**And** shows breakdown by key type (User Key vs Friend Key)

