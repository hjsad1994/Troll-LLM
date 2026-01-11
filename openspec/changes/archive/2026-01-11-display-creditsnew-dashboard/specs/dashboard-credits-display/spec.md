# Dashboard Credits Display Specification

## Purpose
Enable users to view their OpenHands credits balance (`creditsNew`) alongside their OhMyGPT credits balance on the user dashboard.

## ADDED Requirements

### Requirement: Display creditsNew on Dashboard
The user dashboard SHALL display both `credits` (OhMyGPT) and `creditsNew` (OpenHands) balances with clear labeling.

#### Scenario: Dashboard shows dual credits balances
- **WHEN** a user views the dashboard at `/dashboard`
- **THEN** the Credits card SHALL display two separate credit balances
- **AND** the first balance SHALL show `credits` field labeled as "OhMyGPT Credits" or "Premium Credits"
- **AND** the second balance SHALL show `creditsNew` field labeled as "OpenHands Credits" or "Standard Credits"
- **AND** each balance SHALL display the value in USD format: `$X.XX`

#### Scenario: Credits display includes upstream rate information
- **WHEN** the dashboard displays credit balances
- **THEN** the `credits` balance SHALL show the rate "2500 VND/$1" or reference to "Premium Endpoint"
- **AND** the `creditsNew` balance SHALL show the rate "1500 VND/$1" or reference to "Standard Endpoint"
- **AND** the rate information SHALL help users understand which balance is used by which endpoint

#### Scenario: Visual differentiation between credit types
- **WHEN** the dashboard displays both credit balances
- **THEN** each balance SHALL have distinct visual styling or icons
- **AND** the styling SHALL clearly distinguish OhMyGPT credits from OpenHands credits
- **AND** the design SHALL maintain consistency with existing dashboard patterns

#### Scenario: Empty creditsNew displays as zero
- **WHEN** a user has not purchased any OpenHands credits (creditsNew = 0)
- **THEN** the dashboard SHALL display "$0.00" for OpenHands Credits
- **AND** the display SHALL not hide or omit the `creditsNew` field
- **AND** users SHALL be able to see both balances even if one is zero

### Requirement: API Returns creditsNew Field
The backend user profile API SHALL include `creditsNew` in the response payload.

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
The dashboard credits display SHALL organize both credit types in a clear, readable layout.

#### Scenario: Side-by-side or stacked layout
- **WHEN** the dashboard renders the Credits card
- **THEN** the two credit balances SHALL be displayed in a two-column grid (desktop) or stacked layout (mobile)
- **AND** each balance SHALL have equal visual weight
- **AND** the layout SHALL be responsive and adapt to screen size

#### Scenario: Consistent formatting across both balances
- **WHEN** displaying both credit balances
- **THEN** both SHALL use consistent font sizes and styling
- **AND** both SHALL use the same USD format (2 decimal places)
- **AND** both SHALL display usage/expiration information if applicable
