# user-dashboard Specification Delta

## ADDED Requirements

### Requirement: Admin Custom Credits Input
The admin users page SHALL allow custom amounts for setting or adding credits via two separate input fields.

#### Scenario: Display SET credits input
- **WHEN** admin views user row in users table
- **THEN** the system SHALL display a SET credits input with submit button
- **AND** input accepts decimal numbers >= 0
- **AND** button label is "SET"
- **AND** button has amber/warning styling

#### Scenario: Display ADD credits input
- **WHEN** admin views user row in users table
- **THEN** the system SHALL display an ADD credits input with submit button
- **AND** input accepts decimal numbers >= 0
- **AND** button label is "ADD"
- **AND** button has emerald/success styling

#### Scenario: SET credits action
- **WHEN** admin enters value in SET input and clicks SET button
- **AND** confirms the action
- **THEN** the system SHALL call `PATCH /admin/users/:username/credits` with `{ credits: number }`
- **AND** user's credits SHALL be replaced with the entered value
- **AND** refresh user list after success
- **AND** show error alert on failure

#### Scenario: ADD credits action
- **WHEN** admin enters value in ADD input and clicks ADD button
- **AND** confirms the action
- **THEN** the system SHALL call `POST /admin/users/:username/credits/add` with `{ amount: number }`
- **AND** entered value SHALL be added to user's existing credits
- **AND** refresh user list after success
- **AND** show error alert on failure

#### Scenario: Validation for credits inputs
- **WHEN** admin enters invalid value (negative, non-numeric)
- **THEN** the system SHALL prevent submission
- **AND** show validation error

#### Scenario: Confirmation dialog for credits actions
- **WHEN** admin clicks SET or ADD button
- **THEN** the system SHALL show confirmation dialog
- **AND** dialog shows: "SET credits to $X for {username}?" or "ADD $X credits to {username}?"
- **AND** user must confirm before action executes

## REMOVED Requirements

(None - this change adds functionality without removing existing features)

## MODIFIED Requirements

(None - existing API endpoints are already available and unchanged)
