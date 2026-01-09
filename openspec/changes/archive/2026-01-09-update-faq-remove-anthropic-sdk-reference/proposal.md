# Change: Remove Anthropic SDK Compatibility FAQ Entry

## Why

The current FAQ includes a question about Anthropic SDK compatibility (FAQ q4), but TrollLLM primarily uses the OpenAI SDK format for API compatibility. The Anthropic SDK reference may confuse users since the actual code examples on the landing page use the OpenAI SDK format with just a base URL change. This FAQ item should be removed to avoid misleading users.

## What Changes

- Remove FAQ q4 ("Can I use existing Anthropic SDK code?") from both English and Vietnamese translations
- Update FAQ section to have 3 questions instead of 4
- No breaking changes - content update only

## Impact

- Affected specs: `documentation`
- Affected code:
  - `frontend/src/lib/i18n.ts` (remove faq.q4 translations for both en and vi)
  - `frontend/src/app/page.tsx` (update faqs array to only include q1-q3)
