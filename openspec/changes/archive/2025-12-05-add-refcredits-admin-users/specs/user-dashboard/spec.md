## ADDED Requirements

### Requirement: Admin Users Table - Referral Credits Column
The admin users table SHALL display referral credits (refCredits) information for each user.

#### Scenario: Display refCredits column in users table
- **WHEN** admin views the users table at `/users`
- **THEN** the table SHALL include a "Ref Credits" column
- **AND** display the user's `refCredits` balance formatted as USD (e.g., $25.00)
- **AND** use consistent styling with the existing "Credits" column

#### Scenario: Display refCredits in mobile card view
- **WHEN** admin views the users list on mobile device
- **THEN** each user card SHALL display "Ref Credits" in the stats grid
- **AND** format the value as USD with 2 decimal places
