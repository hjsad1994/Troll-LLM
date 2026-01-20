# Story 5.2: Display New Rate Limit Information

Status: done

## Story

As a **user**,
I want to see accurate rate limit information,
So that I know my API usage limits.

## Acceptance Criteria

1. **AC1:** Given a user viewing their dashboard, when rate limit info is displayed, then it shows "600 RPM" for User Key
2. **AC2:** Given a user with Friend Keys, when viewing their Friend Key page, then it shows "60 RPM" for each Friend Key
3. **AC3:** Given a user viewing Friend Key details, when the key info is displayed, then rate limit shows "60 RPM per key"

**Coverage:** FR28 (User see rate limit info)

## Tasks / Subtasks

- [x] Task 1: Add rate limit info to User Dashboard API Key card (AC: 1)
  - [x] 1.1 Edit `frontend/src/app/(dashboard)/dashboard/page.tsx` - Add "600 RPM" badge/text near API Key section
  - [x] 1.2 Add i18n translation keys for rate limit text
  - [x] 1.3 Style consistently with existing UI patterns (Tailwind CSS)

- [x] Task 2: Add rate limit info to Friend Key page (AC: 2, 3)
  - [x] 2.1 Edit `frontend/src/app/(dashboard)/friend-key/page.tsx` - Add "60 RPM" badge/text for Friend Key
  - [x] 2.2 Display rate limit info in Friend Key details section
  - [x] 2.3 Add i18n translation keys for Friend Key rate limit text

- [x] Task 3: Add i18n translations (AC: 1, 2, 3)
  - [x] 3.1 Update `frontend/src/lib/i18n.ts` with rate limit strings (English)
  - [x] 3.2 Update `frontend/src/lib/i18n.ts` with Vietnamese translations
  - [x] 3.3 No Chinese translations needed (file doesn't exist)

- [x] Task 4: Run TypeScript build to verify no errors (AC: 1, 2, 3)
  - [x] 4.1 Run `npm run build` in frontend directory - TypeScript compilation passed
  - [x] 4.2 Note: Build has pre-existing errors for missing pages (not related to this story)

## Dev Notes

### Analysis Summary

**Current State Analysis:**
- User Dashboard (`dashboard/page.tsx`): NO rate limit info displayed
- Friend Key page (`friend-key/page.tsx`): Only shows model USD limits, NO RPM rate limit info
- API (`frontend/src/lib/api.ts`): NO rate limit related types or endpoints

**Rate Limit Values (from Architecture):**
- User Key (`sk-troll-*`): **600 RPM** (hardcoded constant)
- Friend Key (`fk-*`): **60 RPM** (hardcoded constant)

**Changes Required:**
- Add static "600 RPM" display to User Dashboard API Key card
- Add static "60 RPM" display to Friend Key page
- No backend changes needed - values are hardcoded constants

### Architecture Compliance

**Source:** `_bmad-output/architecture-decisions.md`

- **Rate Limit Values:** Hardcoded constants, not config-driven
  - User Key: 600 RPM
  - Friend Key: 60 RPM
- **Frontend Impact:** Add rate limit display to dashboard
- No API changes required - display is static

### Technical Requirements

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **i18n:** Custom translation system in `frontend/src/lib/translations/`
- **Pattern:** Client components with 'use client' directive

### UI Design Suggestions

**User Dashboard - API Key Card:**
```
┌─────────────────────────────────────────────┐
│ 🔑 API Key                     [Active]     │
│ Your personal API key for authentication    │
│                                             │
│ sk-troll-xxx...xxx                          │
│                                             │
│ ⚡ Rate Limit: 600 RPM                      │  ← NEW
│                                             │
│ [Copy Key]  [Rotate]                        │
└─────────────────────────────────────────────┘
```

**Friend Key Page:**
```
┌─────────────────────────────────────────────┐
│ 🔐 Friend Key                               │
│ Share access with friends                   │
│                                             │
│ fk-xxx...xxx                                │
│                                             │
│ ⚡ Rate Limit: 60 RPM per key               │  ← NEW
│                                             │
│ Model Limits:                               │
│ - Claude Opus 4.5: $10.00 limit             │
│ ...                                         │
└─────────────────────────────────────────────┘
```

### File Structure Requirements

```
frontend/src/
├── app/(dashboard)/
│   ├── dashboard/page.tsx    # Add 600 RPM display
│   └── friend-key/page.tsx   # Add 60 RPM display
└── lib/translations/
    ├── en.ts                 # Add rate limit strings
    ├── vi.ts                 # Add Vietnamese translations
    └── zh.ts                 # Add Chinese translations (if exists)
```

### Translation Keys to Add

```typescript
// English
dashboard: {
  rateLimit: {
    title: 'Rate Limit',
    userKey: '600 RPM',
    description: 'requests per minute'
  }
}
friendKey: {
  rateLimit: {
    title: 'Rate Limit',
    value: '60 RPM',
    perKey: 'per key',
    description: 'requests per minute per key'
  }
}
```

### Testing Requirements

- Run TypeScript compilation (`npm run build`) to verify no errors
- Manual verification that rate limit info displays correctly
- Check both English and Vietnamese translations render properly
- No unit tests required for static display

### Previous Story Intelligence

**From Story 5.1 (Remove Tier Display):**
- Successfully removed tier from UserKey interfaces
- TypeScript build passed after changes
- Pattern: Edit interface → verify no tier display → run build

**Learnings Applied:**
- Always run build after frontend changes
- Use existing UI patterns (badges, subtle text)
- i18n is important - add translations for all supported languages

### Git Intelligence Summary

Recent commits show:
- Discord ID management added - shows i18n pattern in use
- Story 5.1 completed - tier removed from interfaces

### Project Context Reference

**Key Rules:**
- Follow existing naming conventions
- Use Tailwind CSS for styling
- Add i18n translations for all user-facing text
- Rate limit values are hardcoded (not from API)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript compilation: PASSED
- Pre-existing build errors: Missing pages `/request-history`, `/docs/changelog`, `/docs/integrations/kilo-code` (not related to this story)

### Completion Notes List

- **Task 1:** Added 600 RPM badge to User Dashboard API Key card - violet colored badge with lightning icon, displays next to "Created" date
- **Task 2:** Added 60 RPM display to Friend Key page stats grid - changed from 3-column to 4-column grid, violet colored with lightning icon
- **Task 3:** Added i18n translations for `dashboard.rateLimit` and `friendKey.rateLimit` in both English and Vietnamese
- **Task 4:** TypeScript compilation passed - all type checks passed, no errors from rate limit changes

### File List

- `frontend/src/app/(dashboard)/dashboard/page.tsx` - Added 600 RPM badge display (line 341-351)
- `frontend/src/app/(dashboard)/friend-key/page.tsx` - Added 60 RPM to stats grid (line 398-421)
- `frontend/src/lib/i18n.ts` - Added rateLimit translations for dashboard and friendKey (EN + VI)

## Change Log

- 2025-12-18: Added rate limit information display to User Dashboard (600 RPM) and Friend Key page (60 RPM) with i18n support
