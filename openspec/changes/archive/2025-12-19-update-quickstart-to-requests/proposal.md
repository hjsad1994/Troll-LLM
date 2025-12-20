# Change: Update Quickstart Documentation to Use Direct HTTP Requests

## Why

OpenAI SDK and Anthropic SDK no longer support the TrollLLM API key format (`sk-trollllm-*`). Users cannot use the official SDKs with TrollLLM's API endpoint. The documentation needs to be updated to guide users to use direct HTTP requests (via `requests` library in Python, `fetch` in JavaScript, etc.) instead of SDK-based examples.

## What Changes

- **BREAKING**: Remove OpenAI SDK and Anthropic SDK code examples from quickstart documentation
- Replace SDK examples with direct HTTP request examples using:
  - Python: `requests` library
  - JavaScript: `fetch` API
  - Go: `net/http` (already uses direct requests)
  - cURL: Already uses direct requests (no change needed)
- Update environment variable guidance to focus on API key only (no SDK-specific vars)
- Simplify the authentication section to emphasize direct `Authorization: Bearer` header usage
- Support bilingual documentation (English and Vietnamese) via existing i18n system

## Impact

- Affected specs: `documentation` (new capability)
- Affected code:
  - `frontend/src/app/docs/quickstart/page.tsx:447-601` (code examples)
  - `frontend/src/components/LanguageProvider.tsx` (translation keys)
- User impact: Users will need to use HTTP client libraries instead of official SDKs
- Benefit: Clearer, more reliable integration path that actually works with TrollLLM API keys
- Languages: English (EN) and Vietnamese (VI)
