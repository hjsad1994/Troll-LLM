## ADDED Requirements

### Requirement: Admin Edit User Referral Credits
The admin users page SHALL allow editing of user's referral credits balance.

#### Scenario: Display refCredits input in edit modal
- **WHEN** admin clicks "Edit" button on a user row
- **THEN** the edit modal SHALL display a "Ref Credits" input field
- **AND** the input SHALL be pre-populated with user's current `refCredits` value
- **AND** the input SHALL accept decimal numbers (min 0)

#### Scenario: Update user refCredits
- **WHEN** admin enters a new refCredits value and clicks "Save"
- **THEN** the system SHALL call `PATCH /admin/users/:username/refCredits`
- **AND** update the user's `refCredits` field in database
- **AND** refresh the users list to show updated value
- **AND** display success feedback

### Requirement: Update RefCredits API Endpoint
The system SHALL provide an API endpoint for updating user referral credits.

#### Scenario: Update refCredits via API
- **WHEN** admin calls `PATCH /admin/users/:username/refCredits` with `{ refCredits: number }`
- **THEN** the system SHALL validate refCredits is a non-negative number
- **AND** update the user's `refCredits` field
- **AND** return success response with updated user data
