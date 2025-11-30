## ADDED Requirements

### Requirement: Plan Expiration Tracking
The system SHALL track when a user's plan was upgraded and when it will expire.

#### Scenario: Set plan start date on upgrade
- **WHEN** admin upgrades user plan from Free to Dev or Pro
- **THEN** the system SHALL set `planStartDate` to current timestamp
- **AND** set `planExpiresAt` to 1 month from current timestamp

#### Scenario: Update plan expiration on plan change
- **WHEN** admin changes user plan between Dev and Pro
- **THEN** the system SHALL update `planStartDate` to current timestamp
- **AND** set `planExpiresAt` to 1 month from current timestamp

#### Scenario: Clear plan dates on downgrade to Free
- **WHEN** admin sets user plan to Free
- **THEN** the system SHALL set `planStartDate` to null
- **AND** set `planExpiresAt` to null

---

### Requirement: Automatic Plan Expiration
The system SHALL automatically reset expired plans to Free Tier.

#### Scenario: Check plan expiration on API request
- **WHEN** user makes an API request
- **AND** current time is past `planExpiresAt`
- **THEN** the system SHALL reset user's `plan` to `'free'`
- **AND** reset `credits` to `0`
- **AND** reset `totalTokens` to `0`
- **AND** set `planStartDate` to null
- **AND** set `planExpiresAt` to null
- **AND** continue processing the request with Free Tier limits

#### Scenario: Check plan expiration on login
- **WHEN** user logs in
- **AND** current time is past `planExpiresAt`
- **THEN** the system SHALL reset user's plan to Free Tier (same as API request scenario)

#### Scenario: Scheduled plan expiration check (optional)
- **WHEN** scheduled job runs (e.g., daily at 00:00 UTC)
- **THEN** the system SHALL find all users where `planExpiresAt < current time`
- **AND** reset their plans to Free Tier

---

### Requirement: Plan Expiration Display
The system SHALL display plan expiration information to users.

#### Scenario: Display plan expiration date in dashboard
- **WHEN** user with Dev or Pro plan views billing section
- **THEN** the system SHALL display `planExpiresAt` as "Plan expires on: YYYY-MM-DD"
- **AND** show countdown if expiring within 7 days

#### Scenario: Display warning for expiring plan
- **WHEN** user's plan is expiring within 7 days
- **THEN** the system SHALL display a warning banner
- **AND** show message "Your plan will expire on {date}. Contact admin to renew."

#### Scenario: Free tier user does not see expiration
- **WHEN** Free Tier user views billing section
- **THEN** the system SHALL NOT display plan expiration date
- **AND** NOT display expiration warning

---

## MODIFIED Requirements

### Requirement: User Billing Dashboard
The system SHALL display billing information including token usage, current plan, and plan expiration.

#### Scenario: View total tokens remaining
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display total tokens remaining
- **AND** format large numbers with K/M suffixes (e.g., 1.5M)

#### Scenario: View tokens used this month
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display tokens used in current billing month
- **AND** show usage percentage as progress bar
- **AND** show reset date (first day of next month)

#### Scenario: View current plan
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display current plan with badge
- **AND** plan types are: Free, Dev, Pro
- **AND** show plan limits (e.g., "Dev: 15M tokens/month")
- **AND** show plan expiration date for Dev/Pro plans

#### Scenario: Monthly token usage reset
- **WHEN** new billing month starts (first day of month, 00:00 UTC)
- **THEN** the system SHALL reset `monthlyTokensUsed` to 0
- **AND** update `monthlyResetDate` to current date

---

### Requirement: Auto-Grant Credits on Plan Upgrade
The system SHALL automatically grant credits to users when their plan is upgraded by admin and set plan expiration.

#### Scenario: Admin upgrades user to Dev plan
- **WHEN** admin sets user plan from Free to Dev
- **THEN** user receives $225 credits added to their balance
- **AND** `planStartDate` is set to current timestamp
- **AND** `planExpiresAt` is set to 1 month from now

#### Scenario: Admin upgrades user to Pro plan
- **WHEN** admin sets user plan from Free to Pro
- **THEN** user receives $500 credits added to their balance
- **AND** `planStartDate` is set to current timestamp
- **AND** `planExpiresAt` is set to 1 month from now

#### Scenario: Admin changes plan between paid tiers
- **WHEN** admin changes user plan from Dev to Pro
- **THEN** user receives the difference in credits ($500 - $225 = $275)
- **AND** `planStartDate` is updated to current timestamp
- **AND** `planExpiresAt` is updated to 1 month from now
