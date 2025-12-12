## ADDED Requirements

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
