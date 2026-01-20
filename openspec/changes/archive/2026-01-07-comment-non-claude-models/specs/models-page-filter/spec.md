# Spec: Models Page Filter

## ADDED Requirements

### Requirement: Models page displays only Claude models
The public `/models` page SHALL display only Claude models that are compatible with Claude Code integration.

#### Scenario: User views public models page
**Given** a user navigates to `/models`
**When** the page loads
**Then** only the following models are displayed:
- `claude-opus-4-5-20251101` (Claude Opus 4.5)
- `claude-sonnet-4-5-20250929` (Claude Sonnet 4.5)
- `claude-haiku-4-5-20251001` (Claude Haiku 4.5)
**And** non-Claude models are commented out in the source code
**And** non-Claude models do NOT appear in the models grid

### Requirement: Non-Claude models preserved as comments
Non-Claude model definitions SHALL be preserved as comments in the source code for potential future use.

#### Scenario: Developer views source code
**Given** a developer opens `frontend/src/app/models/page.tsx`
**When** they view the `fallbackModels` array
**Then** commented-out non-Claude models are visible
**And** each commented model includes the full model definition
**And** models can be easily re-enabled by uncommenting

### Requirement: Provider filter reflects available models
The provider filter UI SHALL accurately reflect only the available Claude models.

#### Scenario: User checks provider filters
**Given** the models page is displaying only Claude models
**When** the page loads
**Then** the "Anthropic" filter shows 3 models
**And** the "OpenAI" filter shows 0 models
**And** the "Google" filter shows 0 models
**And** the "Other" filter shows 0 models
