## ADDED Requirements

### Requirement: User List Credits Burned Display
The admin users list endpoint SHALL include credits burned information for each user.

#### Scenario: Users list includes credits burned
- **WHEN** admin calls `GET /admin/users`
- **THEN** each user object in the response SHALL include a `creditsBurned` field
- **AND** the `creditsBurned` value SHALL be the total USD amount the user has consumed from API requests
- **AND** if the user has no usage history, `creditsBurned` SHALL be `0`

#### Scenario: Credits burned aggregation
- **WHEN** calculating `creditsBurned` for a user
- **THEN** the system SHALL sum all `creditsCost` values from `request_logs` collection where `userId` matches the user
- **AND** the result SHALL be accurate within the 30-day TTL window of request logs
