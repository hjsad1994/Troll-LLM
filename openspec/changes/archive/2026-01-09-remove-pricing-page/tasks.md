# Tasks: Remove Pricing Page from Documentation

## Task 1: Delete pricing page component
**File**: `frontend/src/app/docs/pricing/page.tsx`
**Action**: Delete the entire file
**Validation**: File no longer exists, visiting `/docs/pricing` returns 404
- [x] COMPLETED: File deleted

## Task 2: Update sidebar navigation in all doc pages
**Files**: All `frontend/src/app/docs/**/page.tsx` files that contain sidebar navigation
**Action**: Remove the pricing link from the `getSidebarNav()` function's resources section
**Before**:
```typescript
{
  title: t.docs.sidebar.resources,
  items: [
    { title: t.docs.sidebar.pricing, href: '/docs/pricing', active: true },
    { title: t.docs.sidebar.rateLimits, href: '/docs/rate-limits' },
    { title: t.docs.sidebar.changelog, href: '/docs/changelog' },
  ]
}
```
**After**:
```typescript
{
  title: t.docs.sidebar.resources,
  items: [
    { title: t.docs.sidebar.rateLimits, href: '/docs/rate-limits' },
    { title: t.docs.sidebar.changelog, href: '/docs/changelog' },
  ]
}
```

**Files to update**:
- [x] `frontend/src/app/docs/page.tsx` (Introduction)
- [x] `frontend/src/app/docs/quickstart/page.tsx` (Quickstart)
- [x] `frontend/src/app/docs/authentication/page.tsx` (Authentication)
- [x] `frontend/src/app/docs/rate-limits/page.tsx` (Rate Limits) - updated active state
- [x] `frontend/src/app/docs/changelog/page.tsx` (Changelog) - updated active state
- [x] `frontend/src/app/docs/integrations/claude-code/page.tsx`
- [x] `frontend/src/app/docs/integrations/roo-code/page.tsx`
- [x] `frontend/src/app/docs/integrations/kilo-code/page.tsx`
- [x] `frontend/src/app/docs/integrations/droid/page.tsx`

**Validation**: No sidebar contains a pricing link - COMPLETED

## Task 3: Update breadcrumb and footer navigation
**Files**: Adjacent pages that link to pricing in their footer navigation
**Action**: Remove or update pricing links from footer/breadcrumb navigation

**Rate Limits page** (`frontend/src/app/docs/rate-limits/page.tsx`):
- Updated the "Previous: Pricing" link to point to Continue integration

**Validation**: Footer navigation doesn't reference pricing page - COMPLETED

## Task 4: Remove translation keys (optional cleanup)
**File**: `frontend/src/lib/i18n.ts`
**Action**: Remove the following translation keys:
- `docsPricing` (entire section, ~40 lines)
- `sidebar.pricing` from both `en` and `vi` sections

**Validation**:
- [x] No reference to `docsPricing` or `sidebar.pricing` in the codebase
- [x] Site builds without translation errors
- [x] Language switching still works

## Task 5: Verify and test
**Actions**:
1. Build the frontend: `cd frontend && npm run build`
2. Start the dev server: `cd frontend && npm run dev`
3. Navigate to `/docs/pricing` - should show 404
4. Navigate to various doc pages - verify sidebar doesn't show pricing link
5. Check footer navigation on adjacent pages - verify no pricing links
6. Test language switching - verify no errors

**Validation**:
- [x] Site builds successfully
- [x] No console errors
- [x] All doc pages accessible with correct navigation
- [x] Language toggle works without errors

## Task 6: Update sitemap (optional)
**File**: Any sitemap configuration or `next-sitemap` config
**Action**: Remove `/docs/pricing` from sitemap if present
**Validation**: Sitemap doesn't include pricing page
- [x] Not applicable (no explicit sitemap configuration found)

## Dependencies
- None

## Parallelizable Work
- Tasks 2, 3, 4 can be done in parallel across different files
- Task 5 must wait for all others to complete

## Notes
- The main header navigation (`nav.pricing`) is intentionally out of scope
- Backend pricing configuration (OhMyGPT) is not affected
- If users need pricing information, they should be directed to contact support
