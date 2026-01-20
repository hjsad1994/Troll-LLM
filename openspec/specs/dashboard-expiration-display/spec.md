# dashboard-expiration-display Specification

## Purpose
Display full datetime in UTC+7 timezone for credit expiration dates on the dashboard, helping users know the exact time when their credits will expire.
## Requirements
### Requirement: Display Full Datetime for Expiration
The Credits Period section SHALL display full datetime with timezone only for standard credits (creditsNew) expiration dates. Premium credits expiration display SHALL be temporarily hidden.

#### Scenario: Standard credits (creditsNew) expiration shows full datetime
- **WHEN** a user views the Credits Period section for creditsNew on dashboard
- **AND** the user has creditsNew with an expiration date set
- **THEN** the "Expires" field SHALL display format: `DD/MM/YYYY HH:mm:ss`
- **AND** the datetime SHALL be converted to UTC+7 timezone before display
- **EXAMPLE**: `15/01/2026 23:59:59`

#### Scenario: Premium credits expiration section is hidden
- **WHEN** a user views the dashboard Credits sections
- **THEN** the Credits Period section for legacy premium credits SHALL NOT be visible
- **AND** the premium credits expiration display code SHALL remain in the codebase as commented code
- **AND** comments SHALL clearly mark the section as "LEGACY CREDITS - TEMPORARILY HIDDEN"

#### Scenario: Purchased date maintains short format
- **WHEN** displaying the "Purchased" field in the creditsNew Credits Period section
- **THEN** it SHALL continue using the short date format `DD/MM/YYYY`
- **AND** it SHALL NOT display time or timezone information

#### Scenario: Countdown badge remains unchanged for creditsNew
- **WHEN** displaying the creditsNew expiration countdown badge
- **THEN** it SHALL continue showing "X days" format
- **AND** it SHALL NOT be affected by the datetime display enhancement
- **AND** legacy credits countdown badge SHALL NOT be visible

### Requirement: UTC+7 Timezone Conversion
The system SHALL correctly convert UTC timestamps to UTC+7 (Vietnam timezone) for display of creditsNew expiration only.

#### Scenario: Server timestamp converted to UTC+7 for creditsNew
- **WHEN** the creditsNew expiration date is received from the backend API
- **THEN** the frontend SHALL add 7 hours to convert from UTC to UTC+7
- **AND** the displayed time SHALL accurately reflect Vietnam timezone

#### Scenario: Legacy credits timezone code preserved
- **WHEN** a developer reviews the expiration display code
- **THEN** the UTC+7 conversion logic for legacy credits SHALL be present but commented out
- **AND** the code SHALL be preserved for potential future re-enablement

### Requirement: Responsive Display
The full datetime display SHALL work correctly on all screen sizes for creditsNew only.

#### Scenario: Desktop display
- **WHEN** viewing on desktop screen (>= 640px)
- **THEN** the creditsNew full datetime SHALL display without wrapping
- **AND** the format SHALL be easily readable

#### Scenario: Mobile display
- **WHEN** viewing on mobile screen (< 640px)
- **THEN** the creditsNew datetime SHALL wrap gracefully if needed
- **AND** all datetime components SHALL remain visible and readable

