## ADDED Requirements

### Requirement: Admin Discord ID Management
Admin users SHALL be able to update the discordId field of any user from the Users management page.

#### Scenario: Admin updates user Discord ID
- **WHEN** admin enters a valid Discord ID (17-19 digits) for a user
- **THEN** the system updates the user's discordId in the database
- **AND** displays a success message

#### Scenario: Admin clears user Discord ID
- **WHEN** admin clears the Discord ID field and saves
- **THEN** the system sets the user's discordId to null
- **AND** displays a success message

#### Scenario: Admin enters invalid Discord ID
- **WHEN** admin enters an invalid Discord ID (not 17-19 digits)
- **THEN** the system displays a validation error
- **AND** does not save the changes

### Requirement: Discord ID Display in Users Table
The Users management table SHALL display the discordId field for each user.

#### Scenario: User has Discord ID
- **WHEN** user has a discordId set
- **THEN** the table displays the discordId value

#### Scenario: User has no Discord ID
- **WHEN** user has no discordId (null)
- **THEN** the table displays a placeholder (e.g., "-")
