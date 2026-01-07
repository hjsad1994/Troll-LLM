# Tasks: Comment Out Non-Claude Models on Public Models Page

## Implementation Tasks

### 1. Comment out non-Claude models in models/page.tsx
- [x] Open `frontend/src/app/models/page.tsx`
- [x] Locate the `fallbackModels` array in the `useEffect` hook (around line 208)
- [x] Comment out the following non-Claude model entries:
  - `gemini-3-pro-preview` (Gemini 3 Pro Preview)
  - `glm-4.6` (GLM-4.6)
  - `gpt-5.1-codex-max` (GPT-5.1 Codex Max)
  - `gpt-5.1` (GPT 5.1)
  - `gpt-5.2` (GPT-5.2)
  - `kimi-k2-thinking` (Kimi K2 Thinking)
- [x] Keep only the 3 Claude models active (uncommented):
  - `claude-opus-4-5-20251101`
  - `claude-sonnet-4-5-20250929`
  - `claude-haiku-4-5-20251001`

### 2. Verify implementation
- [x] Start the frontend development server
- [x] Navigate to `/models` page
- [x] Verify only 3 models are displayed
- [x] Verify all displayed models are Claude models
- [x] Test provider filters:
  - Click "All" - should show 3 models
  - Click "Anthropic" - should show 3 models
  - Click "OpenAI", "Google", "Other" - should show 0 models

### 3. Verify commented code
- [x] Open `frontend/src/app/models/page.tsx`
- [x] Verify non-Claude models are commented out with `//`
- [x] Verify comments are properly formatted and readable
- [x] Verify models can be easily re-enabled by uncommenting

## Dependencies
None - this is a standalone frontend change

## Notes
- This change only affects the public `/models` page display
- The dashboard `/dashboard-models` page was already updated in a previous change
- Backend APIs and model availability remain unchanged
- Users can still use any model via API calls
- The commented models can be easily re-enabled if needed
