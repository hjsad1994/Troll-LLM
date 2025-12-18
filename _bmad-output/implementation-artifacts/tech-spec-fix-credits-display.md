# Tech-Spec: Sửa hiển thị Credits trên Dashboard

**Created:** 2025-12-18
**Status:** Completed

## Overview

### Problem Statement

User báo lỗi trên trang `/dashboard`:
- "Credits đã dùng" hiển thị `$100.48` nhưng user chỉ dùng khoảng `$10`
- User nạp 106$, thấy còn 79$ nhưng không hiểu tại sao

**Root cause:** Field `creditsBurned` từ `getDetailedUsage()` chỉ tính credits dùng **trong period được chọn** (1h/24h/7d/30d), không phải tổng all-time. Label hiện tại không rõ nghĩa gây hiểu nhầm.

### Solution

1. **Sửa label** cho field `creditsBurned` - hiển thị rõ period: "Credits Burned (24h)" thay vì "Credits Burned"
2. **Thêm field mới** hiển thị **tổng credits đã dùng từ trước đến nay** từ `userProfile.creditsUsed`

### Scope (In/Out)

**In scope:**
- Sửa label "Credits Burned" thành dynamic label theo period
- Thêm card/field hiển thị total credits used all-time
- Update i18n translations

**Out scope:**
- Backend changes (data đã có sẵn)
- Thay đổi logic tính toán credits

## Context for Development

### Codebase Patterns

- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- i18n: Custom hook `useLanguage()` với file `frontend/src/lib/i18n.ts`
- API: `userProfile.creditsUsed` đã có sẵn từ `/api/users/me`
- Component: Functional component với useState/useEffect hooks

### Files to Reference

1. `frontend/src/app/(dashboard)/dashboard/page.tsx` - Main dashboard component
2. `frontend/src/lib/i18n.ts` - i18n translations
3. `frontend/src/lib/api.ts` - API types (UserProfile interface)

### Technical Decisions

- Sử dụng `userProfile.creditsUsed` (all-time) thay vì tính từ request logs
- Giữ nguyên backend, chỉ sửa frontend
- Dynamic label dựa trên `usagePeriod` state

## Implementation Plan

### Tasks

- [x] Task 1: Sửa label "Credits Burned" thành dynamic label theo period
  - File: `frontend/src/app/(dashboard)/dashboard/page.tsx:666-671`
  - Thay `{t.dashboardTest?.detailedUsage?.creditsBurned || 'Credits Burned'}`
  - Thành: `Credits Burned ({usagePeriod})` hoặc i18n equivalent

- [x] Task 2: Thêm field "Total Credits Used" (all-time) vào Detailed Usage section
  - Thêm card mới bên cạnh các stats hiện có
  - Sử dụng `userProfile?.creditsUsed`
  - Style giống các card khác (bg-slate-100, border, etc.)

- [x] Task 3: Update i18n translations
  - File: `frontend/src/lib/i18n.ts`
  - Thêm key mới cho "Total Credits Used" (Vietnamese + English)

### Acceptance Criteria

- [ ] AC 1: Given user trên dashboard, When chọn period 24h, Then label hiển thị "Credits Burned (24h)"
- [ ] AC 2: Given user trên dashboard, When xem Detailed Usage, Then thấy field "Total Credits Used" hiển thị `userProfile.creditsUsed`
- [ ] AC 3: Given user với credits data, When so sánh các số liệu, Then:
  - "Total Credits Used" = tổng từ trước đến nay (all-time)
  - "Credits Burned (Xd)" = chỉ trong period đã chọn
- [ ] AC 4: i18n hoạt động đúng cho cả Vietnamese và English

## Additional Context

### Dependencies

- Không có dependency mới
- Sử dụng data đã có sẵn từ `userProfile`

### Testing Strategy

- Manual test: Verify labels hiển thị đúng theo period
- Manual test: Verify "Total Credits Used" match với database
- Cross-browser check (Chrome, Firefox)

### Notes

- `userProfile.creditsUsed` được populate từ `user.service.ts:42`
- Data flow: MongoDB → userRepository → userService → API → Frontend
- Period options: '1h', '24h', '7d', '30d' (state: `usagePeriod`)
