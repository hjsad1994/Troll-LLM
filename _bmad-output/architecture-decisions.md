---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - prd.md
  - index.md
  - architecture.md
  - api-reference.md
  - data-models.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2025-12-17'
project_name: 'TrollLLM'
user_name: 'Trant'
date: '2025-12-17'
---

# Architecture Decision Document - Rate Limiting Refactoring

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- 31 FRs covering: Rate Limiting (FR1-FR7), Credits Management (FR8-FR13), Error Handling (FR14-FR16), Tier Removal (FR17-FR20), API Key Validation (FR21-FR24), Dashboard Updates (FR25-FR31)

**Non-Functional Requirements:**
- Performance: < 5ms rate check, < 10ms credits check
- Security: No API key logging, credits hidden from Friend Key users
- Reliability: Persistent rate limiter state, atomic credits deduction
- Backwards Compatibility: 100% compatible với existing clients

**Scale & Complexity:**
- Primary domain: API Backend (brownfield)
- Complexity level: Medium
- Components affected: GoProxy, Backend, Frontend, MongoDB

### Technical Constraints & Dependencies

- Existing sliding window rate limiter in `goproxy/internal/ratelimit/`
- MongoDB collections: users, user_keys, friend_keys
- Dual API format support required (OpenAI, Anthropic)
- SSE streaming must be maintained

### Cross-Cutting Concerns Identified

1. **Rate Limiting**: Affects GoProxy request handlers
2. **Credits Validation**: Affects both GoProxy and Backend
3. **Error Formatting**: Depends on endpoint type detection
4. **Tier Removal**: Impacts user_keys collection, backend models, frontend UI

## Starter Template Evaluation

### Primary Technology Domain

API Backend (brownfield) - Refactoring existing multi-component system

### Starter Options Considered

**Not Applicable** - This is a brownfield project with existing codebase:
- GoProxy (Go 1.25)
- Backend (Express.js/TypeScript)
- Frontend (Next.js 14)

### Selected Approach: Brownfield Refactoring

**Rationale:**
- Existing production system with established architecture
- Rate limiting refactoring does not require new project structure
- All necessary infrastructure (MongoDB, SSE streaming, dual API support) already in place

**Existing Codebase to Modify:**
- `goproxy/internal/ratelimit/` - Rate limiter modifications
- `goproxy/internal/userkey/` - Tier removal
- `backend/src/models/` - UserKey model updates
- `frontend/src/components/` - UI tier cleanup

**No initialization command needed** - Working with existing codebase.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Rate limiting strategy for dual key types
- Credits validation timing
- Tier field handling

**Important Decisions (Shape Architecture):**
- Error response header strategy

### Rate Limiting Architecture

**Decision:** Single sliding window limiter với key-type detection
- Key prefix `sk-troll-*` → 600 RPM
- Key prefix `fk-*` → 60 RPM
- Rationale: Tận dụng existing rate limiter, chỉ thay đổi limit value

### Credits Validation Flow

**Decision:** Pre-request check + Post-response deduction
- Check credits > 0 trước khi forward request
- Deduct actual cost sau khi nhận response với usage data
- Rationale: Giữ nguyên behavior đã hoạt động tốt

### Tier System Deprecation

**Decision:** Soft deprecate - Keep field in DB, ignore in code
- Không chạy migration xóa tier field
- Code completely ignore tier field khi validate/authorize
- Rationale: Zero risk, backwards compatible với existing data

### Response Headers

**Decision:** Minimal headers
- `X-RateLimit-Reset`: Unix timestamp (tất cả responses)
- `Retry-After`: Seconds to wait (chỉ 429 responses)
- Rationale: Đủ thông tin cho clients, không over-engineer

## Implementation Patterns & Consistency Rules

### Critical Patterns for Rate Limiting Refactoring

**Key Type Detection:**
- MUST use string prefix check (`sk-troll-*`, `fk-*`)
- NEVER lookup database to determine key type
- Pattern ensures < 1ms detection time

**Rate Limit Values:**
- User Key: 600 RPM (constant, not configurable)
- Friend Key: 60 RPM (constant, not configurable)
- Values are hardcoded constants, not config-driven

**Error Response Formatting:**
- Detect endpoint type from request path
- `/v1/chat/completions` → OpenAI format
- `/v1/messages` → Anthropic format
- NEVER mix formats

**Credits Validation:**
- Check `credits > 0 OR refCredits > 0`
- Block request if insufficient (don't estimate)
- Return 402 with balance info

### Enforcement Guidelines

**All Code Changes MUST:**
- Follow existing naming conventions in each module
- Maintain backwards compatibility
- Not introduce new dependencies
- Keep tier field in DB but ignore in logic

## Project Structure & Boundaries

### Files to Modify

**GoProxy (Core Changes):**
- `goproxy/internal/ratelimit/ratelimit.go` - Key-type detection, dual rate limits
- `goproxy/internal/userkey/userkey.go` - Remove tier validation
- `goproxy/main.go` - Error response formatting, headers

**Backend:**
- `backend/src/models/UserKey.ts` - Ignore tier field
- `backend/src/routes/user.ts` - Remove tier from API responses

**Frontend:**
- `frontend/src/components/dashboard/` - Remove tier display
- `frontend/src/app/[locale]/dashboard/` - Remove tier UI

### Architectural Boundaries

**Rate Limit Boundary:** GoProxy only
- All rate limiting logic stays in `goproxy/internal/ratelimit/`
- Backend does NOT check rate limits

**Credits Boundary:** GoProxy + Backend
- GoProxy validates credits before forwarding
- Backend manages credits (add/deduct via admin)

**Tier Removal Boundary:** All components
- GoProxy: Ignore tier in validation
- Backend: Ignore tier in model
- Frontend: Remove tier UI

### Integration Points

**No New Integration Points** - Existing patterns maintained:
- GoProxy ↔ MongoDB (existing)
- Backend ↔ MongoDB (existing)
- Frontend ↔ Backend API (existing)

### Requirements to Files Mapping

| Requirement | File(s) |
|-------------|---------|
| FR1-FR7 (Rate Limiting) | `goproxy/internal/ratelimit/ratelimit.go` |
| FR8-FR13 (Credits) | `goproxy/internal/usage/usage.go` |
| FR14-FR16 (Error Format) | `goproxy/main.go` |
| FR17-FR20 (Tier Removal) | `goproxy/internal/userkey/`, `backend/src/models/` |
| FR25-FR28 (Dashboard) | `frontend/src/components/`, `frontend/src/app/` |

## Architecture Validation Results

### Coherence Validation ✅

- **Decision Compatibility:** All decisions work within existing Go/Express/Next.js stack
- **Pattern Consistency:** Key prefix detection, dual error formats consistent with existing patterns
- **Structure Alignment:** Changes isolated to specific modules, no structural conflicts

### Requirements Coverage ✅

| Requirement Group | Coverage |
|-------------------|----------|
| FR1-FR7 (Rate Limiting) | ✅ 100% |
| FR8-FR13 (Credits) | ✅ 100% |
| FR14-FR16 (Error Format) | ✅ 100% |
| FR17-FR20 (Tier Removal) | ✅ 100% |
| FR21-FR24 (Key Validation) | ✅ 100% |
| FR25-FR31 (Dashboard) | ✅ 100% |
| NFR1-NFR15 | ✅ 100% |

### Implementation Readiness ✅

**Architecture Completeness Checklist:**
- [x] Rate limiting strategy defined (single limiter, key-type detection)
- [x] Credits validation flow confirmed (pre-check + post-deduct)
- [x] Tier deprecation approach decided (soft deprecate)
- [x] Error response formats specified (OpenAI/Anthropic by endpoint)
- [x] Files to modify mapped to requirements
- [x] Backwards compatibility ensured

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**
- Minimal changes to existing architecture
- Clear file-to-requirement mapping
- Zero-risk tier deprecation approach
- Backwards compatible

**First Implementation Priority:**
1. GoProxy rate limiter updates
2. GoProxy tier validation removal
3. Backend tier cleanup
4. Frontend UI cleanup

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2025-12-17
**Document Location:** `_bmad-output/architecture-decisions.md`

### Final Architecture Deliverables

**Complete Architecture Document:**
- 4 architectural decisions documented
- Implementation patterns ensuring AI agent consistency
- Files to modify mapped to requirements
- Validation confirming coherence and completeness

**Implementation Ready Foundation:**
- Rate limiting: Single limiter with key-type detection
- Credits: Pre-check + post-deduct (existing behavior)
- Tier removal: Soft deprecate (ignore in code)
- Headers: Minimal (`X-RateLimit-Reset` + `Retry-After`)

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing TrollLLM Rate Limiting Refactoring. Follow all decisions, patterns, and structures exactly as documented.

**Development Sequence:**
1. Update `goproxy/internal/ratelimit/ratelimit.go` - Add key-type detection, dual limits (600/60 RPM)
2. Update `goproxy/internal/userkey/userkey.go` - Remove tier validation
3. Update `goproxy/main.go` - Error response formatting, headers
4. Update `backend/src/models/UserKey.ts` - Ignore tier field
5. Update `frontend/src/components/dashboard/` - Remove tier UI

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

