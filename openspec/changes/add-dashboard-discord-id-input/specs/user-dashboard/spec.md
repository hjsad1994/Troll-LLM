## ADDED Requirements

### Requirement: Discord ID Input on Dashboard
The system SHALL allow users to view and update their Discord ID directly from the user dashboard.

#### Scenario: Display Discord Integration section
- **WHEN** authenticated user views dashboard at `/dashboard`
- **THEN** the API Key card SHALL display a "Discord Integration" section below the AI Provider section
- **AND** show Discord icon with label "Discord ID"
- **AND** show input field for Discord ID
- **AND** show "Save" button to update Discord ID

#### Scenario: Display existing Discord ID
- **WHEN** user has a Discord ID saved in their profile
- **THEN** the input field SHALL be pre-populated with the current discordId
- **AND** user can edit and save a new value

#### Scenario: Display empty Discord ID
- **WHEN** user does not have a Discord ID saved
- **THEN** the input field SHALL show placeholder text "Enter your Discord ID"
- **AND** user can enter and save a new value

#### Scenario: Validate Discord ID format
- **WHEN** user enters a Discord ID and clicks Save
- **THEN** the system SHALL validate the ID matches format: 17-19 digits only
- **AND** if invalid, show error message "Invalid Discord ID format (17-19 digits required)"
- **AND** if valid, proceed with save

#### Scenario: Save Discord ID successfully
- **WHEN** user enters a valid Discord ID and clicks Save
- **THEN** the system SHALL call `PATCH /api/user/discord-id`
- **AND** update the user's `discordId` field in database
- **AND** show success feedback (checkmark or "Saved" text)
- **AND** button returns to normal state after 2 seconds

#### Scenario: Clear Discord ID
- **WHEN** user clears the Discord ID input and clicks Save
- **THEN** the system SHALL set `discordId` to null in database
- **AND** show success feedback

---

### Requirement: Discord ID Update API
The system SHALL provide an API endpoint for users to update their Discord ID.

#### Scenario: Update Discord ID via API
- **WHEN** authenticated user calls `PATCH /api/user/discord-id` with `{ discordId: string }`
- **THEN** the system SHALL validate discordId is 17-19 digits (or empty/null to clear)
- **AND** update the user's `discordId` field in usersNew collection
- **AND** return success response `{ success: true, discordId: string | null }`

#### Scenario: Invalid Discord ID format
- **WHEN** user calls `PATCH /api/user/discord-id` with invalid format
- **THEN** the system SHALL return 400 error with message "Invalid Discord ID format"

#### Scenario: Get profile includes Discord ID
- **WHEN** authenticated user calls `GET /api/user/me`
- **THEN** response SHALL include `discordId` field (string or null)
