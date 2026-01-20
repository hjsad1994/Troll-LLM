# Story 5.3: Remove Tier from Admin Dashboard

Status: done

## Story

As an **admin**,
I want the users table without tier column,
So that the interface is cleaner and reflects the new system.

## Acceptance Criteria

1. **AC1:** Given an admin viewing the users list, when the table loads, then tier column is not displayed
2. **AC2:** Given an admin viewing the users list, when filtering/sorting options are available, then sorting/filtering by tier is removed
3. **AC3:** Given an admin viewing user details, when user info is displayed, then tier field is not shown

**Coverage:** FR29 (Admin view users without tier)

## Tasks / Subtasks

- [x] Task 1: Verify tier column is not in users table (AC: 1)
  - [x] 1.1 Review `frontend/src/app/(dashboard)/users/page.tsx` - Confirm no tier column in table headers
  - [x] 1.2 Confirm no tier display in table rows
  - [x] 1.3 Document findings

- [x] Task 2: Verify tier filtering/sorting is not available (AC: 2)
  - [x] 2.1 Review users page filters (roleFilter, statusFilter) - Confirm no tier filter
  - [x] 2.2 Review sort options (sortColumn type) - Confirm no tier sort option
  - [x] 2.3 Document findings

- [x] Task 3: Verify tier field not in user details (AC: 3)
  - [x] 3.1 Review mobile card layout - Confirm no tier display
  - [x] 3.2 Review desktop table layout - Confirm no tier in user row
  - [x] 3.3 Document findings

- [x] Task 4: Verify API types don't include tier (AC: 1, 2, 3)
  - [x] 4.1 Review `frontend/src/lib/api.ts` AdminUser interface - Confirm no tier field
  - [x] 4.2 Run TypeScript build to confirm no tier-related type errors

## Dev Notes

### Analysis Summary - STORY ALREADY COMPLETE

**IMPORTANT:** Pre-implementation analysis shows this story has ALREADY been completed as part of earlier tier removal efforts.

**Verification Results:**
- `frontend/src/app/(dashboard)/users/page.tsx`: **NO tier** - grep returned no matches
- `frontend/src/app/(dashboard)/admin/page.tsx`: **NO tier** - grep returned no matches
- `frontend/src/lib/api.ts`: **NO tier** - grep returned no matches

**Current State:**
- Users table columns: User, Credits, RefCredits, Burned, Expires, LastLogin, Created, DiscordId, Actions
- Filters: Role (admin/user), Status (active/inactive)
- Sort options: credits, burned, expires, lastLogin
- **NO tier column, NO tier filter, NO tier sort**

**This story requires VERIFICATION ONLY, not implementation.**

### Architecture Compliance

**Source:** `_bmad-output/architecture-decisions.md`

- **Tier Deprecation Strategy:** Soft deprecate - Keep field in DB, ignore in code
- **Admin Dashboard:** "Remove tier from admin users list"
- Already implemented - no changes needed

### Technical Requirements

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Pattern:** Client components with 'use client' directive

### Files Analyzed (All Verified Clean)

```
frontend/src/
├── app/(dashboard)/
│   ├── users/page.tsx     # VERIFIED: No tier column, no tier filter/sort
│   ├── admin/page.tsx     # VERIFIED: No tier references
│   └── page.tsx           # VERIFIED: No tier in interfaces (Story 5.1)
└── lib/
    └── api.ts             # VERIFIED: AdminUser interface has no tier
```

### Testing Requirements

- Run TypeScript compilation (`npm run build`) to verify no tier-related errors
- Manual verification that users table has no tier column
- Verify filter/sort options don't include tier

### Previous Story Intelligence

**From Story 5.1 (Remove Tier Display from User Dashboard):**
- Successfully removed tier from UserKey interfaces
- Pattern: Verify tier doesn't exist → document findings → mark complete

**From Epic 3 (Tier System Removal):**
- Backend API ignores tier field
- GoProxy processes without tier validation
- Frontend tier removal was likely part of this epic

### Project Context Reference

**Key Rules:**
- Tier field soft deprecated - exists in DB but ignored everywhere
- Admin dashboard should not show tier column
- No tier-based filtering or sorting

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- grep "tier" users/page.tsx: **No matches found**
- grep "tier" admin/page.tsx: **No matches found**
- grep "tier" api.ts: **No matches found**
- TypeScript type check: **Passed with no errors**

### Completion Notes List

- **Task 1:** Verified `users/page.tsx` has NO tier - grep returned "No matches found"
- **Task 2:** Verified filters are RoleFilter/StatusFilter only, SortColumn has no tier option
- **Task 3:** Verified both mobile card and desktop table layouts have no tier display
- **Task 4:** Verified AdminUser interface has NO tier field, TypeScript check passed

### File List

**No files changed - verification only**

Files verified:
- `frontend/src/app/(dashboard)/users/page.tsx` - NO tier
- `frontend/src/app/(dashboard)/admin/page.tsx` - NO tier
- `frontend/src/lib/api.ts` - AdminUser has NO tier field

## Change Log

- 2025-12-18: Verified tier has already been removed from Admin Dashboard - no changes needed
