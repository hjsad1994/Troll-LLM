# Tasks

## Implementation

- [ ] Create `/privacy` page at `frontend/src/app/privacy/page.tsx`
  - Privacy Policy content covering data collection, usage, security
  - Match existing site styling (dark theme, responsive)
  - Use `Header` component for navigation

- [ ] Create `/terms` page at `frontend/src/app/terms/page.tsx`
  - Terms of Service content covering usage, payments, liability
  - Match existing site styling
  - Use `Header` component for navigation

- [ ] Add i18n translations to `frontend/src/lib/i18n.ts`
  - Add `privacy` section with EN/VI translations
  - Add `terms` section with EN/VI translations

- [ ] Update footer links in `frontend/src/app/page.tsx`
  - Change `href="#"` to `href="/privacy"` for Privacy link
  - Change `href="#"` to `href="/terms"` for Terms link

## Validation

- [ ] Verify pages render correctly at `/privacy` and `/terms`
- [ ] Verify footer links navigate to correct pages
- [ ] Verify language switching works on both pages
- [ ] Run `npm run lint` to check for errors
