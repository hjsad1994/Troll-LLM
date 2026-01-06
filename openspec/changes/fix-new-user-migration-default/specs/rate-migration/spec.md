# Spec Delta: Rate Migration System

This spec modifies the existing `rate-migration` capability to fix the schema default value for the migration field.

## MODIFIED Requirements

### Requirement: UserNew Model Schema

The UserNew mongoose model SHALL include a migration status field with a default value of `true` to ensure new users are automatically on the new billing rate.

#### Scenario: Model field definition
- **Given** the UserNew schema in `backend/src/models/user-new.model.ts`
- **When** the schema is defined
- **Then** it SHALL include `migration: { type: Boolean, default: true }`
- **And** the field SHALL be indexed for efficient querying
- **And** the IUserNew interface SHALL include `migration: boolean`
- **And** the default value SHALL be `true` (new users are on new rate)

#### Scenario: New user schema default behavior
- **Given** the UserNew model with `migration: { type: Boolean, default: true }`
- **When** a new user document is created without explicitly setting the migration field
- **Then** the migration field SHALL default to `true`
- **And** the user SHALL be considered migrated (on new rate)
- **And** the user SHALL NOT be blocked by migration check middleware
- **And** the user SHALL NOT see migration UI

#### Scenario: Existing user migration status override
- **Given** an existing user who registered before the rate change (before 2026-01-06)
- **When** the user document exists with `migration: false` explicitly set
- **Then** the migration field SHALL remain `false`
- **And** the user SHALL be required to migrate before accessing API
- **And** the user SHALL see migration UI

## ADDED Requirements

### Requirement: Database Migration for Incorrect Migration Flags

The system SHALL provide a one-time database migration script to fix any new users who were incorrectly assigned `migration: false`.

#### Scenario: Migration script identifies affected users
- **Given** users created after 2026-01-06 with `migration: false`
- **When** the migration script runs in dry-run mode
- **Then** the system SHALL identify all affected users
- **And** the system SHALL log the count of affected users
- **And** the system SHALL display the list of users to be updated
- **And** the system SHALL NOT modify any data in dry-run mode

#### Scenario: Migration script applies fixes
- **Given** the migration script has identified affected users in dry-run mode
- **When** the script runs in apply mode (with confirmation)
- **Then** the system SHALL update `migration` from `false` to `true` for all affected users
- **And** the system SHALL log each updated user
- **And** the system SHALL report total number of users updated
- **And** the system SHALL NOT modify users created before 2026-01-06

#### Scenario: Migration script is idempotent
- **Given** the migration script has already been run
- **When** the script runs again
- **Then** the system SHALL find zero users to update
- **And** the system SHALL report "No users need migration"
- **And** the system SHALL complete successfully without errors

## RATIONALE

### Why Change the Default to `true`?

1. **Safe by default**: New users should never be blocked or see migration UI
2. **Matches business logic**: All new registrations after the rate change are on the new rate
3. **Prevents data inconsistency**: Schema default matches the explicit value set in repository
4. **Future-proof**: Any new user creation path automatically gets correct value

### Why Keep the Explicit Set in Repository?

Even though the schema default is `true`, the repository should continue to explicitly set `migration: true` for:
- Code clarity and self-documentation
- Explicit intent (future developers understand new users are migrated)
- Defense in depth (explicit value overrides any schema changes)
- Compatibility with any bulk insert operations

### Migration Script Necessity

Users created between 2026-01-06 (rate change announcement) and the deployment of this fix may have `migration: false` due to:
- Edge cases in user creation flow
- Bulk operations or database migrations
- Manual database operations

The migration script ensures data consistency by correcting these edge cases.

## Testing Considerations

- Test new user registration creates user with `migration: true`
- Test existing non-migrated users remain unchanged
- Test migration script in dry-run and apply modes
- Test middleware correctly allows new users and blocks non-migrated users
- Verify migration UI only shows for non-migrated users
