## 1. Extend i18n Translations

- [x] 1.1 Add Models page translations to `src/lib/i18n.ts` (EN/VI)
- [x] 1.2 Add Docs main page translations to `src/lib/i18n.ts` (EN/VI)
- [x] 1.3 Add Docs Quickstart page translations to `src/lib/i18n.ts` (EN/VI)
- [x] 1.4 Add Docs Integrations pages translations to `src/lib/i18n.ts` (EN/VI)

## 2. Update Models Page

- [x] 2.1 Import `useLanguage` hook in `/models/page.tsx`
- [x] 2.2 Replace hardcoded text with translation keys:
  - Badge text ("All models available")
  - Page title ("AI Models")
  - Description text
  - Table headers (Model, Provider, Context, Input, Output, Speed, Capabilities, API ID)
  - Search placeholder
  - Provider filter names
  - Speed labels
  - Launch promotion text
  - CTA section text
  - Footer text

## 3. Update Docs Main Page

- [x] 3.1 Import `useLanguage` hook in `/docs/page.tsx`
- [x] 3.2 Replace hardcoded text with translation keys:
  - Sidebar navigation titles
  - Page title and description
  - Section headings (Get Started, Quick Example, Integrations, Support)
  - Card titles and descriptions
  - Tip and Note content
  - Search placeholder
  - Footer navigation text

## 4. Update Docs Quickstart Page

- [x] 4.1 Import `useLanguage` hook in `/docs/quickstart/page.tsx`
- [x] 4.2 Replace hardcoded text with translation keys:
  - Page title and description
  - Step titles and content
  - Code block titles
  - Tips and notes

## 5. Update Docs Integrations Pages

- [x] 5.1 Update `/docs/integrations/kilo-code/page.tsx` with translations
- [x] 5.2 Update `/docs/integrations/roo-code/page.tsx` with translations
- [x] 5.3 Update `/docs/integrations/claude-code/page.tsx` with translations
- [x] 5.4 Update `/docs/integrations/droid/page.tsx` with translations

## 6. Testing

- [x] 6.1 Test language switching on Models page
- [x] 6.2 Test language switching on Docs main page
- [x] 6.3 Test language switching on Docs Quickstart page
- [x] 6.4 Test language switching on Docs Integrations pages
- [x] 6.5 Verify language persistence across navigation
- [x] 6.6 Run TypeScript typecheck
