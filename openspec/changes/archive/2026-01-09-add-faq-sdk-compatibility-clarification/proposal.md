# Change: Add FAQ Entry Clarifying SDK Support

## Why

Users need clarity on which SDKs are supported by TrollLLM. The landing page shows code examples using the OpenAI SDK format, but users may be confused about official SDK support. This FAQ entry will clarify that TrollLLM does not officially support OpenAI or Anthropic SDKs.

## What Changes

- Add FAQ q4 clarifying SDK compatibility (no official OpenAI or Anthropic SDK support)
- Add translations for both English and Vietnamese
- No breaking changes - content addition only

## Impact

- Affected specs: `documentation`
- Affected code:
  - `frontend/src/lib/i18n.ts` (add faq.q4 translations for both en and vi)
  - `frontend/src/app/page.tsx` (add q4 back to faqs array)
