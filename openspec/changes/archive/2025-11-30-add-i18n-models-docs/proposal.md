# Change: Add Vietnamese/English i18n to Models and Docs pages

## Why
The homepage already has a VI/EN language switcher implemented. Users need the same localization support on the `/models` and `/docs` pages for a consistent multilingual experience across the entire website.

## What Changes
- Extend the existing i18n translation system (`src/lib/i18n.ts`) with translations for Models and Docs pages
- Update `/models` page to use translations for all text content
- Update `/docs` page to use translations for all text content
- Update `/docs/quickstart` page to use translations
- Update `/docs/integrations/*` pages to use translations (kilo-code, roo-code, claude-code, droid)
- Ensure language preference persists across page navigation (already handled by localStorage)

## Impact
- Affected specs: frontend/i18n
- Affected code:
  - `frontend/src/lib/i18n.ts` - Add new translation keys
  - `frontend/src/app/models/page.tsx` - Apply translations
  - `frontend/src/app/docs/page.tsx` - Apply translations
  - `frontend/src/app/docs/quickstart/page.tsx` - Apply translations
  - `frontend/src/app/docs/integrations/kilo-code/page.tsx` - Apply translations
  - `frontend/src/app/docs/integrations/roo-code/page.tsx` - Apply translations
  - `frontend/src/app/docs/integrations/claude-code/page.tsx` - Apply translations
  - `frontend/src/app/docs/integrations/droid/page.tsx` - Apply translations
