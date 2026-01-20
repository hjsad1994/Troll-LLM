# Proposal: Sync Models UI with Config

## Summary

Update the `/models` (public) and `/dashboard-models` (dashboard) pages to display models from `goproxy/config-openhands-prod.json` instead of hardcoded data. This ensures the UI always reflects the actual models available in the system.

## Problem

Currently, both model pages hardcode their model data:
- `frontend/src/app/models/page.tsx` - 5 hardcoded models
- `frontend/src/app/(dashboard)/dashboard-models/page.tsx` - 10 hardcoded models

When new models are added to `config-openhands-prod.json` (e.g., GPT-5.2, Kimi K2 Thinking), the UI does not reflect these changes. Manual updates are required in multiple places.

## Proposed Solution

Update both frontend pages to fetch model data from the backend API (`/api/models`) which already reads from the goproxy config file.

### Changes Required

1. **Backend** (`backend/src/services/models.service.ts`):
   - Add missing fields to the API response (cache_write_price, cache_hit_price, billing_multiplier, context, capabilities, description)

2. **Backend** (`backend/src/routes/models.routes.ts`):
   - Expose additional model metadata in API response

3. **Frontend** (`frontend/src/app/models/page.tsx`):
   - Replace hardcoded `models` array with API fetch
   - Add loading state
   - Derive provider type from model ID patterns

4. **Frontend** (`frontend/src/app/(dashboard)/dashboard-models/page.tsx`):
   - Replace hardcoded `models` array with API fetch
   - Add loading state

### Models to Display (from config-openhands-prod.json)

| Model | ID | Provider |
|-------|-----|----------|
| Claude Opus 4.5 | claude-opus-4-5-20251101 | Anthropic |
| Claude Sonnet 4.5 | claude-sonnet-4-5-20250929 | Anthropic |
| Claude Haiku 4.5 | claude-haiku-4-5-20251001 | Anthropic |
| Gemini 3 Pro Preview | gemini-3-pro-preview | Google |
| GLM-4.6 | glm-4.6 | Other |
| GPT-5.1 Codex Max | gpt-5.1-codex-max | OpenAI |
| GPT 5.1 | gpt-5.1 | OpenAI |
| GPT-5.2 | gpt-5.2 | OpenAI |
| Kimi K2 Thinking | kimi-k2-thinking | Other |

## Out of Scope

- Dynamic model configuration in database (models remain in JSON config)
- Admin UI to manage models
- Model availability/status monitoring
