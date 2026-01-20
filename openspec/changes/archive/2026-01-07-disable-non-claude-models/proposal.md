# Change: Disable Non-Claude Models on Dashboard

## Why
The `/dashboard-models` page displays all available LLM models including non-Claude models (OpenAI, Google, others), which creates confusion for users primarily using TrollLLM for Claude Code integration. The dashboard should focus on showing only models supported by Claude Code.

## What Changes
- Filter the fallback model list in `frontend/src/app/(dashboard)/dashboard-models/page.tsx` to only include Claude models
- Remove 6 non-Claude models from display: Gemini 3 Pro Preview, GLM-4.6, GPT-5.1 Codex Max, GPT 5.1, GPT-5.2, Kimi K2 Thinking
- Keep 3 Claude models: claude-opus-4-5-20251101, claude-sonnet-4-5-20250929, claude-haiku-4-5-20251001

## Impact
- Affected specs: dashboard-models-filter (new capability)
- Affected code: `frontend/src/app/(dashboard)/dashboard-models/page.tsx` (lines 128-133)
