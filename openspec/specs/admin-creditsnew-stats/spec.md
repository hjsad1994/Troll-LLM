# admin-creditsnew-stats Specification

## Purpose
TBD - created by archiving change add-creditsnew-stats-admin. Update Purpose after archive.
## Requirements
### Requirement: Backend API Support for CreditsNew Statistics
The `/admin/user-stats` API endpoint SHALL return aggregate statistics for OpenHands credits alongside existing OhMyGPT credit statistics.

#### Scenario: API response includes creditsNew totals
- **WHEN** an admin requests `/admin/user-stats` with any period parameter
- **THEN** the response SHALL include a `total_creditsNew` field
- **AND** `total_creditsNew` SHALL contain the sum of all `creditsNew` balances across all users in the `usersNew` collection
- **AND** the value SHALL be a number representing USD amount

#### Scenario: API response includes creditsNewUsed totals
- **WHEN** an admin requests `/admin/user-stats` with any period parameter
- **THEN** the response SHALL include a `total_creditsNewUsed` field
- **AND** `total_creditsNewUsed` SHALL contain the sum of all `creditsNewUsed` values across all users in the `usersNew` collection
- **AND** the value SHALL be a number representing USD amount spent

#### Scenario: CreditsNew totals are always current balances
- **WHEN** an admin requests `/admin/user-stats` with any period parameter (1h, 3h, 8h, 24h, 7d, all)
- **THEN** the `total_creditsNew` field SHALL always reflect current credit balances (not period-filtered)
- **AND** the `total_creditsNewUsed` field SHALL always reflect lifetime spending totals (not period-filtered)
- **AND** this behavior SHALL match existing `total_credits` and `total_ref_credits` fields

#### Scenario: MongoDB aggregation for creditsNew statistics
- **WHEN** the backend aggregates user statistics from the `usersNew` collection
- **THEN** the aggregation pipeline SHALL include `$sum: '$creditsNew'` for total balances
- **AND** the aggregation pipeline SHALL include `$sum: '$creditsNewUsed'` for total spending
- **AND** these operations SHALL be combined with existing aggregation for `credits`, `refCredits`, etc.

### Requirement: Admin Dashboard Display of CreditsNew Statistics
The admin dashboard User Stats card SHALL display OpenHands credit statistics with visual distinction from OhMyGPT credits.

#### Scenario: User Stats card displays creditsNew total
- **WHEN** an admin views the admin dashboard at `/admin`
- **THEN** the User Stats card SHALL display a row labeled "New Credits" or "OpenHands"
- **AND** the value SHALL be formatted using the `formatUSD()` helper function
- **AND** the value SHALL use teal or emerald color scheme (e.g., `text-teal-500 dark:text-teal-400`)
- **AND** the row SHALL include a colored dot indicator matching the text color

#### Scenario: User Stats card displays creditsNewUsed total
- **WHEN** an admin views the admin dashboard at `/admin`
- **THEN** the User Stats card SHALL display a row labeled "New Burned" or "OH Burned"
- **AND** the value SHALL be formatted using the `formatUSD()` helper function
- **AND** the value SHALL use rose or red color scheme (e.g., `text-rose-500 dark:text-rose-400`)
- **AND** the row SHALL include a colored dot indicator matching the text color

#### Scenario: Statistics placement in User Stats card
- **WHEN** the admin dashboard renders the User Stats card
- **THEN** the "New Credits" row SHALL appear after the existing "Ref" row
- **AND** the "New Burned" row SHALL appear after the "New Credits" row
- **AND** the ordering SHALL be: Total Credits, Burned, Ref, New Credits, New Burned, Input, Output, Users, Active

#### Scenario: Mobile-responsive layout for new statistics
- **WHEN** the admin dashboard is viewed on mobile devices (screen width < 640px)
- **THEN** the new statistics SHALL appear in the 2-column grid layout
- **AND** each stat SHALL have rounded background (`bg-white/50 dark:bg-white/5`)
- **AND** text truncation SHALL be applied if values are too large

### Requirement: Frontend TypeScript Interface Updates
The admin dashboard TypeScript interfaces SHALL include fields for OpenHands credit statistics.

#### Scenario: UserStats interface includes creditsNew fields
- **WHEN** the `UserStats` interface is defined in the admin dashboard component
- **THEN** the interface SHALL include `total_creditsNew: number` field
- **AND** the interface SHALL include `total_creditsNewUsed: number` field
- **AND** these fields SHALL be properly typed as numbers representing USD amounts

#### Scenario: Default values for creditsNew statistics
- **WHEN** the admin dashboard initializes the `userStats` state
- **THEN** the default value for `total_creditsNew` SHALL be 0
- **AND** the default value for `total_creditsNewUsed` SHALL be 0
- **AND** these defaults SHALL prevent undefined errors during initial render

### Requirement: Backend Repository Aggregation Logic
The `userRepository.getUserStats()` method SHALL aggregate OpenHands credit statistics efficiently.

#### Scenario: Single aggregation pipeline for all credit statistics
- **WHEN** `userRepository.getUserStats()` executes its aggregation query
- **THEN** the aggregation pipeline SHALL include `creditsNew` and `creditsNewUsed` in the same `$group` stage as existing credit fields
- **AND** the aggregation SHALL use `$sum: '$creditsNew'` for total creditsNew
- **AND** the aggregation SHALL use `$sum: '$creditsNewUsed'` for total creditsNewUsed
- **AND** no additional database queries SHALL be required

#### Scenario: Return type includes creditsNew statistics
- **WHEN** `userRepository.getUserStats()` returns its result
- **THEN** the return type SHALL include `totalCreditsNew: number` property
- **AND** the return type SHALL include `totalCreditsNewUsed: number` property
- **AND** these properties SHALL be included in the returned object with fallback to 0 if aggregation returns null

### Requirement: Visual Distinction and Color Coding
The OpenHands credit statistics SHALL use distinct colors to differentiate from OhMyGPT credits.

#### Scenario: CreditsNew uses teal/emerald color scheme
- **WHEN** the "New Credits" statistic is rendered
- **THEN** the text color SHALL be `text-teal-500 dark:text-teal-400` or similar teal/emerald variant
- **AND** the dot indicator SHALL use `bg-teal-500 dark:bg-teal-400` matching the text color
- **AND** the color SHALL visually distinguish it from the green "Total Credits" row

#### Scenario: CreditsNewUsed uses rose/red color scheme
- **WHEN** the "New Burned" statistic is rendered
- **THEN** the text color SHALL be `text-rose-500 dark:text-rose-400` or similar rose/red variant
- **AND** the dot indicator SHALL use `bg-rose-500 dark:bg-rose-400` matching the text color
- **AND** the color SHALL visually distinguish it from the orange "Burned" row

#### Scenario: Consistent formatting with existing credits
- **WHEN** any creditsNew statistic is displayed
- **THEN** the value SHALL be formatted using the `formatUSD()` helper function
- **AND** large values (>= $1,000) SHALL be abbreviated (e.g., "$1.23K")
- **AND** very large values (>= $1,000,000) SHALL be abbreviated (e.g., "$1.23M")
- **AND** the formatting SHALL match existing credit statistics exactly

