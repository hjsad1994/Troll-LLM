# dashboard-credits-display Specification

## Purpose
TBD - created by archiving change display-creditsnew-dashboard. Update Purpose after archive.
## Requirements
### Requirement: Display creditsNew on Dashboard
The user dashboard SHALL display only `creditsNew` (OpenHands/Standard) balance with clear labeling. The legacy `credits` (OhMyGPT/Premium) balance SHALL be temporarily hidden from the UI but remain in the backend.

#### Scenario: Dashboard shows only creditsNew balance
- **WHEN** a user views the dashboard at `/dashboard`
- **THEN** the Credits card SHALL display only the `creditsNew` balance
- **AND** the balance SHALL be labeled as "OpenHands Credits" or "Standard Credits"
- **AND** the balance SHALL display the value in USD format: `$X.XX`
- **AND** the legacy `credits` balance SHALL NOT be visible in the UI

#### Scenario: Credits display includes only standard rate information
- **WHEN** the dashboard displays credit balance
- **THEN** the balance SHALL show the rate "1500 VND/$1" or reference to "Standard Endpoint"
- **AND** the Premium Endpoint rate information SHALL NOT be displayed

#### Scenario: Legacy credits UI code remains in codebase
- **WHEN** developers inspect the dashboard code
- **THEN** the legacy credits display code SHALL be present but commented out
- **AND** comments SHALL clearly mark sections as "LEGACY CREDITS - TEMPORARILY HIDDEN"
- **AND** the code SHALL be preserved for potential future re-enablement

#### Scenario: Empty creditsNew displays as zero
- **WHEN** a user has not purchased any OpenHands credits (creditsNew = 0)
- **THEN** the dashboard SHALL display "$0.00" for OpenHands Credits
- **AND** the display SHALL not hide or omit the `creditsNew` field

### Requirement: API Returns creditsNew Field
The backend user profile API SHALL include `creditsNew` in the response payload. (No changes - backend remains unchanged)

#### Scenario: getUserProfile returns creditsNew
- **WHEN** the frontend calls `GET /api/users/profile`
- **THEN** the response SHALL include a `creditsNew` field
- **AND** the `creditsNew` value SHALL be a number representing USD balance
- **AND** the field SHALL be included alongside existing `credits` field

#### Scenario: Frontend TypeScript interfaces include creditsNew
- **WHEN** the frontend defines the `UserProfile` interface
- **THEN** the interface SHALL include `creditsNew: number` property
- **AND** the interface SHALL include `tokensUserNew: number` property for OpenHands usage tracking
- **AND** the TypeScript types SHALL match the backend API response structure

### Requirement: Credits Display Layout
The dashboard credits display SHALL show only the `creditsNew` balance in a clear, readable layout.

#### Scenario: Single balance display layout
- **WHEN** the dashboard renders the Credits card
- **THEN** only the `creditsNew` balance SHALL be displayed
- **AND** the layout SHALL be responsive and adapt to screen size
- **AND** legacy dual-column layout code SHALL remain commented in the codebase

#### Scenario: Consistent formatting for creditsNew
- **WHEN** displaying the credit balance
- **THEN** it SHALL use the standard USD format (2 decimal places)
- **AND** it SHALL display expiration information for `expiresAtNew` if applicable
- **AND** it SHALL NOT display expiration information for legacy `expiresAt`

