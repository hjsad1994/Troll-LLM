## MODIFIED Requirements

### Requirement: Dashboard API Key Display
User Dashboard SHALL display API key information including the API key itself, copy functionality, and rotate functionality.

The Priority Endpoint display SHALL be hidden from the UI.

#### Scenario: API Key Card Display
- **WHEN** user views the dashboard
- **THEN** the system displays the standard endpoint (`https://chat.trollllm.xyz`)
- **AND** the Priority Endpoint section is NOT displayed

#### Scenario: Request Logs Filter
- **WHEN** user views Request Logs section
- **THEN** filter tabs show "All" and "Standard" options only
- **AND** "Priority" filter tab is NOT displayed

### Requirement: Dashboard Models Display
User Dashboard Models page SHALL display available AI models with their pricing information.

Models with Priority-only availability or Priority support indicators SHALL have those indicators hidden.

#### Scenario: Model Cards Without Priority Badges
- **WHEN** user views the models list
- **THEN** model cards do NOT display "Priority Only" badge
- **AND** model cards do NOT display "+Priority" badge
- **AND** model cards do NOT display "Hỗ trợ Priority Endpoint" footer text

#### Scenario: Stats Cards Without Priority Count
- **WHEN** user views the stats cards section
- **THEN** the "Other" stat card counting openhands models is NOT displayed

#### Scenario: Filter Tabs Without Priority Option
- **WHEN** user views the filter tabs
- **THEN** "Other" filter tab is NOT displayed
- **AND** available filters are: All, Anthropic, OpenAI, Google
