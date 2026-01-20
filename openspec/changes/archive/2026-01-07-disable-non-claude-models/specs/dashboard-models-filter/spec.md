# Spec: Dashboard Models Filter

## ADDED Requirements

### Requirement: Dashboard displays only Claude models
The `/dashboard-models` page SHALL display only Claude models that are compatible with Claude Code integration.

#### Scenario: User views dashboard models page
**Given** a user is logged in and navigates to `/dashboard-models`
**When** the page loads
**Then** only the following models are displayed:
- `claude-opus-4-5-20251101` (Claude Opus 4.5)
- `claude-sonnet-4-5-20250929` (Claude Sonnet 4.5)
- `claude-haiku-4-5-20251001` (Claude Haiku 4.5)
**And** non-Claude models are NOT displayed in the models grid
**And** non-Claude models are NOT included in statistics counts

### Requirement: Model type categorization remains correct
Each displayed model SHALL be correctly categorized as `anthropic` type.

#### Scenario: Model type is determined
**Given** a model ID starting with `claude-`
**When** the `getProviderFromId` function processes the model
**Then** the model type is set to `anthropic`
**And** the Anthropic provider badge is displayed on the model card

### Requirement: Statistics reflect only Claude models
The statistics cards on the dashboard SHALL accurately count only Claude models.

#### Scenario: Statistics are calculated
**Given** the dashboard models page loads with 3 Claude models
**When** statistics are calculated
**Then** the "Total" count shows 3
**And** the "Anthropic" count shows 3
**And** the "OpenAI" count shows 0
**And** the "Google" count shows 0
**And** the "Other" count shows 0

### Requirement: Filter tabs functionality preserved
The provider filter tabs SHALL continue to function correctly with the reduced model set.

#### Scenario: User clicks filter tabs
**Given** the dashboard models page is displaying only Claude models
**When** the user clicks the "Anthropic" filter tab
**Then** all 3 Claude models are displayed
**When** the user clicks the "All" filter tab
**Then** all 3 Claude models are displayed
**When** the user clicks "OpenAI", "Google", or "Other" filter tabs
**Then** an empty state is shown with 0 models

### Requirement: Model cards display correctly
Model cards for Claude models SHALL display all information correctly.

#### Scenario: Model card is rendered
**Given** a Claude model is displayed on the dashboard
**When** the model card is rendered
**Then** the model name is displayed correctly
**And** the model ID is displayed and can be copied
**And** the Anthropic provider icon and badge are shown
**And** pricing information (input, output, cache write, cache hit) is displayed
**And** the "Reasoning" badge is shown for applicable models

## MODIFIED Requirements

### Requirement: Fallback model list
The static fallback model list in `dashboard-models/page.tsx` SHALL contain only Claude models.

#### Scenario: Page loads without API
**Given** the dashboard models page loads
**And** the API call is not made (static fallback is used)
**When** the `useEffect` hook runs
**Then** the `fallbackModels` array contains exactly 3 models
**And** all models in the array have IDs starting with `claude-`
**And** all models have `type: 'openhands'` or appropriate type
**And** `models` state is set to these 3 transformed models
