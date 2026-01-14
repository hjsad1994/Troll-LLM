# dashboard-expiration-display Specification

## Purpose
Display full datetime in UTC+7 timezone for credit expiration dates on the dashboard, helping users know the exact time when their credits will expire.

## Requirements
### Requirement: Display Full Datetime for Expiration
The Credits Period sections SHALL display full datetime with timezone for expiration dates.

#### Scenario: Standard credits (creditsNew) expiration shows full datetime
- **WHEN** a user views the Credits Period section for creditsNew on dashboard
- **AND** the user has creditsNew with an expiration date set
- **THEN** the "Expires" field SHALL display format: `DD/MM/YYYY HH:mm:ss`
- **AND** the datetime SHALL be converted to UTC+7 timezone before display
- **EXAMPLE**: `15/01/2026 23:59:59`

#### Scenario: Premium credits expiration shows full datetime
- **WHEN** a user views the Credits Period section for credits on dashboard
- **AND** the user has credits with an expiration date set
- **THEN** the "Expires" field SHALL display format: `DD/MM/YYYY HH:mm:ss`
- **AND** the datetime SHALL be converted to UTC+7 timezone before display
- **EXAMPLE**: `20/01/2026 23:59:59`

#### Scenario: Purchased date maintains short format
- **WHEN** displaying the "Purchased" field in Credits Period sections
- **THEN** it SHALL continue using the short date format `DD/MM/YYYY`
- **AND** it SHALL NOT display time or timezone information

#### Scenario: Countdown badge remains unchanged
- **WHEN** displaying the expiration countdown badge
- **THEN** it SHALL continue showing "X days / Y total days" or "X/Y" format
- **AND** it SHALL NOT be affected by the datetime display enhancement

### Requirement: UTC+7 Timezone Conversion
The system SHALL correctly convert UTC timestamps to UTC+7 (Vietnam timezone) for display.

#### Scenario: Server timestamp converted to UTC+7
- **WHEN** the expiration date is received from the backend API
- **THEN** the frontend SHALL add 7 hours to convert from UTC to UTC+7
- **AND** the displayed time SHALL accurately reflect Vietnam timezone

#### Scenario: Consistent timezone handling
- **WHEN** displaying both standard and premium credit expirations
- **THEN** both SHALL use the same UTC+7 conversion logic
- **AND** the format SHALL be consistent: `DD/MM/YYYY HH:mm:ss`

### Requirement: Responsive Display
The full datetime display SHALL work correctly on all screen sizes.

#### Scenario: Desktop display
- **WHEN** viewing on desktop screen (>= 640px)
- **THEN** the full datetime SHALL display without wrapping
- **AND** the format SHALL be easily readable

#### Scenario: Mobile display
- **WHEN** viewing on mobile screen (< 640px)
- **THEN** the datetime SHALL wrap gracefully if needed
- **AND** all datetime components SHALL remain visible and readable

