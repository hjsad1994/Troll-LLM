# Proposal: Remove Pricing Page from Documentation

## Summary

Remove the `/docs/pricing` page and its navigation link "Bảng giá" (Pricing) from the documentation sidebar. The pricing information is no longer relevant as payments are currently disabled.

## Motivation

The pricing page (`/docs/pricing`) displays subscription plans and model pricing information that is no longer applicable:
- Payment registration has been temporarily disabled (as noted in existing proposal `2026-01-06-disable-payments-temporarily`)
- The page shows disabled subscription plan buttons with "Registration Closed" / "Ngừng nhận Đăng ký"
- Having outdated pricing information visible to users creates confusion

## Scope

### In Scope
1. Delete the pricing page component: `frontend/src/app/docs/pricing/page.tsx`
2. Remove the "Bảng giá" (Pricing) navigation link from all doc page sidebars
3. Remove pricing-related translation keys from i18n (optional cleanup)

### Out of Scope
- Backend pricing configuration (OhMyGPT pricing, billing multipliers)
- Rate limits page (`/docs/rate-limits`)
- Main navigation pricing link in the header (`/nav.pricing`)
- API endpoints related to pricing
- Admin panel pricing configuration

## Implementation Approach

1. **Delete pricing page component** - Remove `frontend/src/app/docs/pricing/page.tsx`
2. **Update sidebar navigation** - Remove pricing link from the sidebar nav configuration in each doc page
3. **Update breadcrumb navigation** - Remove pricing page from footer/breadcrumb links on adjacent pages
4. **Clean up translations** (optional) - Remove `docsPricing` and `sidebar.pricing` keys from `frontend/src/lib/i18n.ts`

## Alternatives Considered

### Alternative 1: Keep page with "Coming Soon" message
- **Pros**: Maintains URL structure, easier to re-enable later
- **Cons**: Still shows outdated information, creates user confusion

### Alternative 2: Redirect pricing page to rate limits page
- **Pros**: Guides users to relevant information
- **Cons**: Adds unnecessary redirect logic, rate limits != pricing

### Alternative 3: Hide pricing link but keep page accessible
- **Pros**: Page remains for direct links/bookmarks
- **Cons**: Hidden content is still accessible, inconsistent navigation

**Chosen Approach**: Complete removal is cleanest since payments are disabled and there's no timeline for re-enabling.

## Impact

### User Experience
- Users will no longer see confusing pricing information
- Documentation navigation will be cleaner and more focused
- Users looking for pricing can contact support directly if needed

### Development
- Reduced codebase size (~500 lines removed)
- Simplified navigation maintenance
- Translation cleanup reduces i18n file size

### SEO
- `/docs/pricing` URL will return 404
- Should update sitemap.xml to exclude the pricing page
- Consider setting up a redirect to `/docs` or `/docs/rate-limits` if there are existing links

## Dependencies

- None blocking
- Related to proposal `2026-01-06-disable-payments-temporarily`

## Risks

- **Broken links**: Any external links to `/docs/pricing` will break
  - **Mitigation**: Set up a redirect in Next.js config or handle with 404 page
- **User confusion**: Users expecting pricing information may not find it
  - **Mitigation**: The main navigation still has a pricing link that can be repurposed or updated

## Open Questions

1. Should we set up a redirect from `/docs/pricing` to another page?
   - Suggested: Redirect to `/docs/rate-limits` or `/docs`

2. Should we also remove the pricing link from the main header navigation?
   - This is out of scope for this proposal but could be a follow-up

3. Should we remove translation keys for pricing?
   - Recommended: Yes, to keep i18n clean. We can restore from git history if needed later.

## Success Criteria

1. `/docs/pricing` returns 404 or redirects appropriately
2. "Bảng giá" / "Pricing" link no longer appears in documentation sidebar
3. No broken references in adjacent doc pages (breadcrumbs, footer nav)
4. Site builds and runs without errors
