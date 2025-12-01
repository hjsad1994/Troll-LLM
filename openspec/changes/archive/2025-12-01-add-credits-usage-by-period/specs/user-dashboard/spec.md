## ADDED Requirements

### Requirement: User Dashboard - Credits Usage By Period
The user dashboard SHALL display credits used in recent time periods.

#### Scenario: Display credits usage breakdown
- **WHEN** user views their dashboard at `/dashboard`
- **THEN** the page SHALL display credits used in last 1 hour
- **AND** display credits used in last 24 hours
- **AND** display credits used in last 7 days
- **AND** display credits used in last 30 days
- **AND** format credits as USD with 2 decimal places

### Requirement: Admin Dashboard - Credits Burned Metric
The admin dashboard SHALL display total credits burned filtered by period.

#### Scenario: Display total credits burned
- **WHEN** admin views the dashboard at `/admin`
- **THEN** the User Stats card SHALL include "Credits Burned" metric
- **AND** credits burned SHALL be filtered by the selected time period
- **AND** format as USD with 2 decimal places
