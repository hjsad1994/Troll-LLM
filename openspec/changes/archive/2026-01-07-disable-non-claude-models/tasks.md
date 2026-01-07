# Tasks: Disable Non-Claude Models on Dashboard

## Implementation Tasks

### 1. Update fallback model list
- [x] Open `frontend/src/app/(dashboard)/dashboard-models/page.tsx`
- [x] Locate the `fallbackModels` array in the `useEffect` hook (around line 129)
- [x] Remove all non-Claude models from the array:
  - Remove `gemini-3-pro-preview`
  - Remove `glm-4.6`
  - Remove `gpt-5.1-codex-max`
  - Remove `gpt-5.1`
  - Remove `gpt-5.2`
  - Remove `kimi-k2-thinking`
- [x] Keep only the 3 Claude models:
  - `claude-opus-4-5-20251101`
  - `claude-sonnet-4-5-20250929`
  - `claude-haiku-4-5-20251001`

### 2. Verify implementation
- [x] Start the frontend development server (`npm run dev` in frontend directory)
- [x] Navigate to `http://localhost:8080/dashboard-models`
- [x] Verify only 3 models are displayed
- [x] Verify statistics show:
  - Total: 3
  - Anthropic: 3
  - OpenAI: 0
  - Google: 0
  - Other: 0
- [x] Test filter tabs:
  - Click "All" - should show 3 models
  - Click "Anthropic" - should show 3 models
  - Click "OpenAI", "Google", "Other" - should show 0 models

### 3. Visual verification
- [x] Verify all 3 Claude model cards display correctly with:
  - Model name
  - Model ID (copyable)
  - Anthropic provider icon and badge
  - Pricing information (input, output, cache write, cache hit)
  - "Reasoning" badge on Opus and Sonnet models

## Dependencies
None - this is a standalone frontend change

## Notes
- This change only affects the UI display
- Backend APIs and model availability remain unchanged
- Users can still use any model via API calls
- The change is easily reversible if needed
