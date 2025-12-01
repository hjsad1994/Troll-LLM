## ADDED Requirements

### Requirement: User Model - Separate Input/Output Token Fields
The User model SHALL track input and output tokens separately from combined totals.

#### Scenario: User model stores input/output tokens
- **WHEN** a user makes API requests
- **THEN** the system SHALL track `totalInputTokens` for input tokens used
- **AND** track `totalOutputTokens` for output tokens used
- **AND** both fields SHALL default to 0 for new/existing users

### Requirement: Admin Users Table - Input/Output Token Columns
The admin users table SHALL display separate input and output token columns.

#### Scenario: Display input/output columns in users table
- **WHEN** admin views the users table at `/users`
- **THEN** the table SHALL include an "Input Tokens" column
- **AND** include an "Output Tokens" column
- **AND** format large numbers with K/M suffixes (e.g., 1.5M, 250K)

### Requirement: Admin Dashboard - System-Wide Token Breakdown
The admin dashboard SHALL display total input and output tokens across all users.

#### Scenario: Display total input/output tokens on admin page
- **WHEN** admin views the dashboard at `/admin`
- **THEN** the page SHALL display total input tokens for all users
- **AND** display total output tokens for all users
- **AND** format large numbers appropriately
