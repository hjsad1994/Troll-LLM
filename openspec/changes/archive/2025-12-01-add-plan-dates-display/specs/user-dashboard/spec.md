## MODIFIED Requirements

### Requirement: Plan Expiration Display
The system SHALL display plan start and expiration information prominently to users.

#### Scenario: Display plan period for paid users
- **WHEN** user with Dev or Pro plan views dashboard Credits section
- **THEN** the system SHALL display a "Plan Period" section showing:
  - `planStartDate` formatted as "Started: DD/MM/YYYY"
  - `planExpiresAt` formatted as "Expires: DD/MM/YYYY"
  - Days remaining until expiration (e.g., "(15 days)")

#### Scenario: Display plan period styling
- **WHEN** plan period is displayed
- **THEN** the dates SHALL be shown in a distinct visual section
- **AND** use appropriate colors (normal for active, amber for expiring soon)

#### Scenario: Display warning for expiring plan
- **WHEN** user's plan is expiring within 7 days
- **THEN** the system SHALL display a warning banner
- **AND** show message "Your plan will expire on {date}. Contact admin to renew."
- **AND** highlight the days remaining in amber/orange color

#### Scenario: Free tier user does not see plan period
- **WHEN** Free Tier user views dashboard Credits section
- **THEN** the system SHALL NOT display plan start date
- **AND** NOT display plan expiration date
- **AND** NOT display days remaining
