# Change: Update AI Provider URL to chat.trollllm.xyz

## Why
Thay doi endpoint AI Provider tu `api.trollllm.io` sang `https://chat.trollllm.xyz` de thong nhat voi domain chinh cua he thong va su dung dung LLM Proxy endpoint.

## What Changes
- **MODIFIED**: Tat ca code examples trong frontend su dung `https://chat.trollllm.xyz` thay vi `https://api.trollllm.io`
- **MODIFIED**: Documentation pages (quickstart, integrations) cap nhat endpoint moi
- **MODIFIED**: Dashboard code examples cap nhat URL

## Impact
- Affected specs: `api-proxy`
- Affected code:
  - `frontend/src/app/page.tsx` - Homepage code examples
  - `frontend/src/app/docs/page.tsx` - Docs main page
  - `frontend/src/app/docs/quickstart/page.tsx` - Quickstart guide
  - `frontend/src/app/docs/integrations/*.tsx` - Integration guides (kilo-code, roo-code, claude-code, droid)
  - `frontend/src/app/(dashboard)/dashboard/page.tsx` - Dashboard examples
