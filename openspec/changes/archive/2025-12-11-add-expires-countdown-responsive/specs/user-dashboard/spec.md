## ADDED Requirements

### Requirement: User Dashboard - Expires Countdown Display
The user dashboard SHALL display subscription expiration countdown with context showing both remaining and total days.

#### Scenario: Display expires countdown on dashboard
- **WHEN** authenticated user with active subscription views dashboard
- **THEN** the billing/credits section SHALL display subscription expiration info
- **AND** format as "X/Y days" where X = remaining days, Y = total subscription days
- **AND** example: "6/7 days remaining"

#### Scenario: Color coding for expires status
- **WHEN** displaying expires information on user dashboard
- **THEN** the system SHALL use color coding:
  - Green/emerald: more than 3 days remaining
  - Amber/orange: 3 days or fewer remaining
  - Red: expired

#### Scenario: Expiring soon warning
- **WHEN** user's subscription has 3 or fewer days remaining
- **THEN** the system SHALL display a warning banner/message
- **AND** message SHALL indicate urgency to renew subscription
- **AND** use amber/orange styling to draw attention

#### Scenario: No subscription display
- **WHEN** user has no active subscription (expiresAt is null)
- **THEN** the system SHALL NOT display expires countdown section
- **OR** display "No active subscription" message

#### Scenario: Expired subscription display
- **WHEN** user's subscription has expired
- **THEN** the system SHALL display "Expired" status in red
- **AND** prompt user to purchase new subscription
