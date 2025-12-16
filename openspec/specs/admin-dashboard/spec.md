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

### Requirement: Admin Users Table - Column Sorting
The admin users table SHALL support sorting by Credits, Burned, and Expires columns to help administrators analyze user data.

#### Scenario: Sort by Credits column
- **WHEN** admin clicks on the Credits column header
- **THEN** the table SHALL sort users by credits amount in descending order (highest first)
- **AND** clicking again SHALL toggle to ascending order (lowest first)
- **AND** a visual indicator (arrow) SHALL show the current sort direction

#### Scenario: Sort by Burned column
- **WHEN** admin clicks on the Burned column header
- **THEN** the table SHALL sort users by credits burned amount in descending order
- **AND** clicking again SHALL toggle to ascending order
- **AND** a visual indicator SHALL show the current sort direction

#### Scenario: Sort by Expires column
- **WHEN** admin clicks on the Expires column header
- **THEN** the table SHALL sort users by days remaining (daysRemaining value) in descending order
- **AND** users with no expiration date SHALL appear at the end when sorting descending
- **AND** clicking again SHALL toggle to ascending order
- **AND** a visual indicator SHALL show the current sort direction

#### Scenario: Clear sort state
- **WHEN** admin applies a new filter (role, status) or search
- **THEN** the current sort state SHALL be preserved
- **AND** sorting SHALL apply to the filtered results

### Requirement: Admin Users Table - Last Login Column
The admin users table SHALL display a Last Login column showing when each user last authenticated.

#### Scenario: Display Last Login in desktop table
- **WHEN** admin views the users table on desktop at `/users`
- **THEN** the table SHALL include a "Last Login" column between Expires and Created columns
- **AND** the column SHALL display the date and time in format "DD/MM/YYYY HH:MM"
- **AND** display "-" for users who have never logged in

#### Scenario: Display Last Login in mobile card
- **WHEN** admin views the users list on mobile (viewport < 768px)
- **THEN** each user card SHALL display "Last Login: DD/MM/YYYY HH:MM" below the Created date
- **AND** display "-" for users who have never logged in

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

