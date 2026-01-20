# Spec Delta: Rate Migration System

This spec extends the existing `rate-migration` capability to add auto-migration for users with zero credits.

## ADDED Requirements

### Requirement: Auto-Migration for Users with Zero Credits

The system SHALL automatically set `migration: true` for existing users who have `credits = 0`, as they have no credits to migrate and their next top-up will be at the new rate.

#### Scenario: User with zero credits attempts API access
- **Given** a user with `migration: false` and `credits: 0`
- **When** the user attempts to access LLM API (e.g., POST /v1/messages)
- **Then** the system SHALL automatically set `migration: true` for the user
- **And** the system SHALL create a migration log entry with oldCredits=0, newCredits=0
- **And** the request SHALL be processed successfully (not blocked)
- **And** the user SHALL NOT see migration UI on dashboard

#### Scenario: User with zero credits visits dashboard
- **Given** a user with `migration: false` and `credits: 0`
- **When** the user navigates to `/dashboard`
- **And** the dashboard fetches user profile via API
- **Then** the system SHALL automatically set `migration: true` for the user
- **And** the system SHALL create a migration log entry with oldCredits=0, newCredits=0
- **And** the migration UI SHALL NOT be displayed
- **And** the dashboard SHALL function normally

#### Scenario: User with positive credits still requires migration
- **Given** a user with `migration: false` and `credits > 0`
- **When** the user attempts to access LLM API
- **Then** the system SHALL NOT auto-migrate the user
- **And** the request SHALL be blocked with HTTP 403
- **And** the error message SHALL indicate migration is required
- **And** the migration UI SHALL be displayed on dashboard

#### Scenario: Auto-migration is idempotent
- **Given** a user with `migration: true` (already migrated)
- **When** the auto-migration logic is triggered
- **Then** the system SHALL recognize the user is already migrated
- **And** the system SHALL NOT create a duplicate migration log
- **And** the user SHALL continue normally

#### Scenario: Auto-migration for user with zero credits but refCredits
- **Given** a user with `migration: false`, `credits: 0`, and `refCredits > 0`
- **When** the user attempts API access
- **Then** the system SHALL auto-migrate the user (set `migration: true`)
- **And** the migration log SHALL show oldCredits=0, newCredits=0
- **And** the request SHALL be processed successfully
- **And** `refCredits` SHALL remain unchanged

### Requirement: Auto-Migration Service Method

The MigrationService SHALL provide a method to check and auto-migrate users with zero credits.

#### Scenario: Auto-migrate method signature
- **Given** the MigrationService in `backend/src/services/migration.service.ts`
- **When** the service is defined
- **Then** it SHALL include a method `autoMigrateIfZeroCredits(userId: string): Promise<boolean>`
- **And** the method SHALL return `true` if auto-migration was performed
- **And** the method SHALL return `false` if user was already migrated or has credits > 0

#### Scenario: Auto-migrate method creates audit log
- **Given** a user with `migration: false` and `credits: 0`
- **When** `autoMigrateIfZeroCredits(userId)` is called
- **Then** the method SHALL set `migration: true` for the user
- **And** the method SHALL create a migration log entry with:
  - `userId`, `username`, `oldCredits: 0`, `newCredits: 0`
  - `migratedAt` (current timestamp)
  - `oldRate: 1000`, `newRate: 2500`
  - `autoMigrated: true` (flag to distinguish from manual migration)
- **And** the method SHALL return `true`

#### Scenario: Auto-migrate method skips users with credits
- **Given** a user with `migration: false` and `credits > 0`
- **When** `autoMigrateIfZeroCredits(userId)` is called
- **Then** the method SHALL NOT modify the user's migration status
- **And** the method SHALL NOT create a migration log
- **And** the method SHALL return `false`

### Requirement: Database Migration for Zero-Credit Users

The system SHALL provide a one-time database migration script to auto-migrate all existing users with zero credits.

#### Scenario: Migration script identifies zero-credit users
- **Given** users with `migration: false` and `credits: 0`
- **When** the migration script runs in dry-run mode
- **Then** the system SHALL identify all affected users
- **And** the system SHALL log the count of affected users
- **And** the system SHALL display the list of users to be updated
- **And** the system SHALL NOT modify any data in dry-run mode

#### Scenario: Migration script applies auto-migration
- **Given** the migration script has identified zero-credit users in dry-run mode
- **When** the script runs in apply mode (with confirmation)
- **Then** the system SHALL update `migration` from `false` to `true` for all affected users
- **And** the system SHALL create migration log entries with oldCredits=0, newCredits=0
- **And** the migration logs SHALL include `autoMigrated: true` flag
- **And** the system SHALL log each updated user
- **And** the system SHALL report total number of users updated
- **And** the system SHALL NOT modify users with `credits > 0`

#### Scenario: Migration script is idempotent
- **Given** the migration script has already been run
- **When** the script runs again
- **Then** the system SHALL find zero users to update
- **And** the system SHALL report "No users need auto-migration"
- **And** the system SHALL complete successfully without errors

## MODIFIED Requirements

### Requirement: MigrationLog Model

The MigrationLog model SHALL include an `autoMigrated` flag to distinguish between manual and automatic migrations.

#### Scenario: MigrationLog schema includes autoMigrated field
- **Given** the MigrationLog schema in `backend/src/models/migration-log.model.ts`
- **When** the schema is defined
- **Then** it SHALL include `autoMigrated: { type: Boolean, default: false }`
- **And** the field SHALL be `true` for auto-migrations (zero credits)
- **And** the field SHALL be `false` for manual migrations (user clicked migrate button)

#### Scenario: Migration log for manual migration
- **Given** a user with `credits > 0` completes manual migration
- **When** the migration log is created
- **Then** `autoMigrated` SHALL be `false`
- **And** `oldCredits` and `newCredits` SHALL reflect the credit reduction

#### Scenario: Migration log for auto-migration
- **Given** a user with `credits: 0` is auto-migrated
- **When** the migration log is created
- **Then** `autoMigrated` SHALL be `true`
- **And** `oldCredits` and `newCredits` SHALL both be `0`

### Requirement: API Access Control for Non-Migrated Users

The migration check middleware SHALL attempt auto-migration before blocking users with zero credits.

#### Scenario: Middleware attempts auto-migration
- **Given** a user with `migration: false` and `credits: 0`
- **When** the user makes an LLM API request
- **Then** the middleware SHALL call `autoMigrateIfZeroCredits(userId)`
- **And** upon successful auto-migration, the request SHALL proceed normally
- **And** the user SHALL NOT receive a migration error

#### Scenario: Middleware blocks users with credits
- **Given** a user with `migration: false` and `credits > 0`
- **When** the user makes an LLM API request
- **Then** the middleware SHALL call `autoMigrateIfZeroCredits(userId)`
- **And** when auto-migration returns `false`, the request SHALL be blocked
- **And** the user SHALL receive HTTP 403 with migration required error

### Requirement: Dashboard Migration UI

The dashboard migration UI SHALL be hidden from users who are auto-migrated (zero credits).

#### Scenario: Dashboard fetch auto-migrates zero-credit users
- **Given** a user with `migration: false` and `credits: 0`
- **When** the dashboard loads and fetches user profile
- **Then** the backend SHALL call `autoMigrateIfZeroCredits(userId)` before returning profile
- **And** the profile response SHALL include `migration: true`
- **And** the migration UI SHALL NOT be displayed

#### Scenario: Migration UI filtering logic
- **Given** a user profile response includes `migration: true`
- **When** the frontend renders the dashboard
- **Then** the MigrationBanner component SHALL NOT be rendered
- **And** the dashboard SHALL display normally without migration prompts

## RATIONALE

### Why Auto-Migrate Zero-Credit Users?

1. **No economic impact**: Users with `credits = 0` have nothing to lose from the rate change
2. **Reduces friction**: These users don't need to click through meaningless migration UI
3. **Future top-ups at new rate**: When they add credits, they'll automatically be at the 2,500 VNĐ/$ rate
4. **Better UX**: Confusing to ask users to "migrate 0 credits"
5. **Maintains integrity**: Users with actual credits still require explicit migration

### Why Track Auto-Migration Separately?

1. **Audit trail**: Distinguish between users who actively chose migration vs auto-migrated
2. **Analytics**: Understand how many users were affected by auto-migration
3. **Debugging**: Identify if auto-migration is working correctly
4. **Transparency**: Clear record of all migration events

### Why Auto-Migrate on Multiple Touchpoints?

1. **API access**: Catch users who try to use API directly
2. **Dashboard load**: Ensure users don't see migration UI unnecessarily
3. **Database migration**: Clean up existing users proactively
4. **Defense in depth**: Ensure auto-migration happens regardless of user's entry point

## Testing Considerations

- Test auto-migration for user with exactly 0 credits
- Test that users with 0.0001 credits are NOT auto-migrated
- Test that auto-migration creates proper audit log with `autoMigrated: true`
- Test that users with `credits > 0` still see migration UI
- Test idempotency (calling auto-migrate twice on same user)
- Test migration script in dry-run and apply modes
- Verify admin users bypass migration check regardless of credits
- Test edge case: user with 0 credits but positive refCredits
