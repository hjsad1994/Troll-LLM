## ADDED Requirements

### Requirement: Admin Users Table - Tokens Used Column
The admin users table SHALL display token usage information for each user.

#### Scenario: Display tokens used column in users table
- **WHEN** admin views the users table at `/users`
- **THEN** the table SHALL include a "Tokens Used" column
- **AND** display total tokens used (lifetime) for each user
- **AND** display monthly tokens used below or beside the total
- **AND** format large numbers with K/M suffixes (e.g., 1.5M, 250K)

#### Scenario: Token usage display format
- **WHEN** displaying token usage in users table
- **THEN** total tokens SHALL be displayed with icon or label indicating "Total"
- **AND** monthly tokens SHALL be displayed with label indicating "Monthly"
- **AND** numbers over 1,000,000 SHALL show as X.XM
- **AND** numbers over 1,000 SHALL show as X.XK
