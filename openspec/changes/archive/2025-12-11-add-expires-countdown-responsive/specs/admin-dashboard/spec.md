## ADDED Requirements

### Requirement: Admin Users Table - Expires Column Display
The admin users table SHALL display subscription expiration information with context showing both remaining and total days.

#### Scenario: Display expires countdown with total days
- **WHEN** admin views the users table at `/users`
- **THEN** the Expires column SHALL display format "X/Y" where:
  - X = number of days remaining until expiration
  - Y = total subscription period in days (7 days per CREDIT_PACKAGES config)
- **AND** example: "6/7" means 6 days remaining out of 7 days total

#### Scenario: Color coding for expires status
- **WHEN** displaying expires information
- **THEN** the system SHALL use color coding:
  - Green/emerald: more than 3 days remaining
  - Amber/orange: 3 days or fewer remaining
  - Red: expired (0 or negative days)
- **AND** display "-" for users without subscription

#### Scenario: Expired user display
- **WHEN** user's subscription has expired (expiresAt < now)
- **THEN** the system SHALL display "Expired" text in red color
- **AND** optionally show how many days ago it expired

### Requirement: Admin Users Table - Mobile Responsive Layout
The admin users table SHALL provide a mobile-friendly layout for small screens.

#### Scenario: Switch to card layout on mobile
- **WHEN** viewport width is less than 768px (md breakpoint)
- **THEN** the system SHALL hide the table layout
- **AND** display a card-based layout instead

#### Scenario: Mobile card content
- **WHEN** viewing users list on mobile
- **THEN** each user card SHALL display:
  - Username with role badge (admin/user)
  - Credits balance (formatted as USD)
  - Ref Credits balance (formatted as USD)
  - Credits Burned (formatted as USD)
  - Expires countdown in X/Y format
  - Created date
  - SET and ADD credits input controls

#### Scenario: Mobile card actions
- **WHEN** admin interacts with mobile card
- **THEN** SET and ADD credits controls SHALL work identically to desktop version
- **AND** confirmation modal SHALL be mobile-optimized
