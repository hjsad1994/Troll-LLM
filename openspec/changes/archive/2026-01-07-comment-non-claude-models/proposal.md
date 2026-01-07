# Change: Comment Out Non-Claude Models on Public Models Page

## Why
The public `/models` page at `frontend/src/app/models/page.tsx` displays all available LLM models including non-Claude models (OpenAI GPT-5, Google Gemini, GLM, Kimi). For consistency with the dashboard-models page and to focus on Claude Code integration, these non-Claude models should be commented out.

## What Changes
- Comment out non-Claude models in the `fallbackModels` array in `frontend/src/app/models/page.tsx`
- Models to comment out: Gemini 3 Pro Preview, GLM-4.6, GPT-5.1 Codex Max, GPT 5.1, GPT-5.2, Kimi K2 Thinking
- Keep only Claude models active: claude-opus-4-5-20251101, claude-sonnet-4-5-20250929, claude-haiku-4-5-20251001

## Impact
- Affected specs: models-page-filter (new capability)
- Affected code: `frontend/src/app/models/page.tsx` (lines 208-218)
