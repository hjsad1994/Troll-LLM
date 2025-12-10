# Add Legal Pages (Privacy Policy & Terms of Service)

## Summary

Add Privacy Policy and Terms of Service pages to the TrollLLM frontend to comply with Google Safe Browsing requirements and establish trust with users. The website is currently flagged as "Deceptive" due to missing legal pages.

## Problem

Google Safe Browsing has flagged `trollllm.xyz/dashboard` and `trollllm.xyz/login` as deceptive pages. This is likely due to:
1. Missing Privacy Policy page
2. Missing Terms of Service page
3. Footer links to these pages currently point to `#` (non-functional)

## Solution

1. Create `/privacy` page with comprehensive Privacy Policy
2. Create `/terms` page with Terms of Service
3. Update footer links to point to actual pages
4. Add i18n translations for both English and Vietnamese

## Scope

- **Frontend only** - No backend changes required
- **2 new pages** - `/privacy` and `/terms`
- **1 file modification** - Update footer links in `page.tsx`
- **1 file modification** - Add translations to `i18n.ts`

## Out of Scope

- About/Contact page (can be added separately)
- Cookie consent banner
- GDPR compliance tools

## Success Criteria

1. Privacy Policy page accessible at `/privacy`
2. Terms of Service page accessible at `/terms`
3. Footer links functional
4. Both languages (EN/VI) supported
5. Pages match existing site design (dark theme, Tailwind CSS)
