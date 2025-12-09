# admin-dashboard Specification

## Purpose
Admin Dashboard displays system monitoring, user statistics, and API metrics for administrators.
## Requirements

(No requirements defined yet)

### Requirement: User Stats Card Display
The admin dashboard User Stats card SHALL display credits (USD) instead of tokens for balance and usage metrics.

#### Scenario: Display User Stats with Credits
- **WHEN** admin views the User Stats card on admin dashboard
- **THEN** the system SHALL display the following metrics:
  - Header: "Total Credits Burned" with formatted USD value (e.g., "$123.45" or "$1.23K")
  - Total Credits: Sum of all users' remaining credits in USD
  - Credits Burned: Sum of all credits used/deducted in USD
  - Ref Credits: Sum of all referral credits in USD
  - Total Input Tokens: Sum of input tokens (keep as tokens)
  - Total Output Tokens: Sum of output tokens (keep as tokens)
  - Total Users: Count of all users
  - Active Users: Count of users with credits > 0

#### Scenario: Format large USD values
- **WHEN** credits value >= 1,000,000
- **THEN** display as "$X.XXM"
- **WHEN** credits value >= 1,000
- **THEN** display as "$X.XXK"
- **OTHERWISE** display as "$X.XX"

