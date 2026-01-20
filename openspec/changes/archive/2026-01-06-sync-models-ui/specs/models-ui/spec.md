# Models UI Specification

## MODIFIED Requirements

### Requirement: UI-MODELS-001 - Public models page displays dynamic data

The `/models` page MUST fetch and display models from the backend API instead of using hardcoded data.

#### Scenario: Public models page loads models from API

**Given** the user navigates to `/models`
**When** the page loads
**Then** models are fetched from `/api/models`
**And** all models from the config are displayed in the table
**And** the model count in stats section reflects actual count

#### Scenario: Public models page shows loading state

**Given** the user navigates to `/models`
**When** the API request is in progress
**Then** a loading indicator is displayed
**And** the table shows skeleton or loading state

#### Scenario: Provider filtering works with dynamic data

**Given** the models are loaded from API
**When** the user selects "OpenAI" filter
**Then** only models with `gpt` prefix in ID are shown
**And** the count badge updates to reflect filtered count

---

### Requirement: UI-MODELS-002 - Dashboard models page displays dynamic data

The `/dashboard-models` page MUST fetch and display models from the backend API instead of using hardcoded data.

#### Scenario: Dashboard models page loads models from API

**Given** the user is logged in and navigates to `/dashboard-models`
**When** the page loads
**Then** models are fetched from `/api/models`
**And** all models from the config are displayed as cards
**And** the stats cards reflect actual model counts per provider

#### Scenario: Dashboard models page shows loading state

**Given** the user navigates to `/dashboard-models`
**When** the API request is in progress
**Then** a loading indicator is displayed

#### Scenario: Copy model ID functionality works

**Given** models are loaded from API
**When** the user clicks the copy button on a model card
**Then** the model ID is copied to clipboard
**And** a success indicator is shown

---

### Requirement: UI-MODELS-003 - Provider type detection from model ID

The UI MUST derive provider type from model ID patterns when not explicitly provided.

#### Scenario: Detect Anthropic models

**Given** a model with ID starting with `claude-`
**When** rendering the model
**Then** provider is set to `anthropic`
**And** orange color scheme is applied

#### Scenario: Detect OpenAI models

**Given** a model with ID starting with `gpt-` or `o3` or `o4`
**When** rendering the model
**Then** provider is set to `openai`
**And** green/emerald color scheme is applied

#### Scenario: Detect Google models

**Given** a model with ID starting with `gemini-`
**When** rendering the model
**Then** provider is set to `google`
**And** blue color scheme is applied

#### Scenario: Detect other models

**Given** a model with ID not matching known patterns (e.g., `glm-`, `kimi-`, `qwen-`)
**When** rendering the model
**Then** provider is set to `other`
**And** violet color scheme is applied
