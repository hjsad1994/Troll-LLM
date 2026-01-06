# Spec: Rate Migration System

## Purpose

This specification defines the Rate Migration System for transitioning existing users from the old billing rate (1,000 VNĐ/$) to the new billing rate (2,500 VNĐ/$). The system provides a mechanism for users to either migrate their credits (reducing the credit value proportionally) or request a refund. New users registering after the rate change announcement are automatically on the new rate and do not need migration. All migration events are logged to MongoDB for audit and tracking purposes.

## Requirements

### Requirement: Existing Users Must Choose Migration or Refund

Existing users (registered before the rate change announcement) SHALL be required to choose between credit migration or refund before accessing the LLM API.

#### Scenario: Existing user has not chosen
- **Given** a user with `migration: false` (existing user who hasn't chosen)
- **When** the user attempts to access LLM API features
- **Then** the system SHALL block access until migration or refund is chosen
- **And** the dashboard SHALL display the migration UI

### Requirement: New Users Are Auto-Migrated

Users registering after the rate change announcement SHALL automatically be considered migrated with no action required.

#### Scenario: New user registration
- **Given** a new user registration occurs after the rate change
- **When** the user account is created
- **Then** the system SHALL set `migration: true`
- **And** the user SHALL NOT see migration UI
- **And** the user SHALL have full API access immediately

### Requirement: Migration Audit Logging

The system SHALL log all migration events to MongoDB for audit and tracking purposes.

#### Scenario: Migration creates audit log
- **Given** a user successfully completes migration
- **When** the migration transaction commits
- **Then** a migration log SHALL be created with userId, username, oldCredits, newCredits, migratedAt, oldRate, newRate

## ADDED Requirements

### Requirement: User Migration Status Tracking

The system SHALL track whether each user has migrated to the new billing rate (2,500 VNĐ/$ from 1,000 VNĐ/$). **New users (registered after the rate change announcement) are automatically considered migrated.**

#### Scenario: Existing user before migration
- **Given** a user who registered before the rate change announcement
- **When** the user account exists in the UserNew collection
- **Then** the `migration` field SHALL be `false` by default
- **And** the user SHALL be considered "not migrated" and required to choose migration or refund

#### Scenario: New user registration (after rate change)
- **Given** a new user registers after the rate change announcement
- **When** the user account is created in the UserNew collection
- **Then** the system SHALL set `migration` field to `true`
- **And** the user SHALL be considered "migrated" automatically (no action required)

#### Scenario: Check user migration status
- **Given** an existing user
- **When** the user profile is retrieved via API
- **Then** the system SHALL return `migration: boolean` field in the response
- **And** `false` SHALL indicates not migrated (existing user, needs to choose)
- **And** `true` SHALL indicates migrated (either completed migration OR new user)

### Requirement: Migration API Endpoint

The backend SHALL provide a REST API endpoint at `/api/user/migrate` for users to initiate credit migration. **All successful migrations SHALL be logged to the `migration_logs` collection.**

#### Scenario: User initiates migration
- **Given** a user with `migration: false`
- **And** the user is authenticated
- **When** sending POST request to `/api/user/migrate`
- **Then** the system SHALL calculate new credits as `currentCredits / 2.5`
- **And** SHALL update `migration` field to `true`
- **And** SHALL update the user's credit balance to the new amount
- **And** SHALL insert a migration log record into `migration_logs` collection with:
  - `userId`, `username`, `oldCredits`, `newCredits`
  - `migratedAt` (current timestamp)
  - `oldRate: 1000`, `newRate: 2500`
- **And** SHALL return HTTP 200 with `{ success: true, newCredits, oldCredits }`

#### Scenario: Migrated user attempts migration again
- **Given** a user with `migration: true`
- **When** sending POST request to `/api/user/migrate`
- **Then** the system SHALL return HTTP 400 with error "Already migrated"
- **And** SHALL NOT modify the user's credits or migration status

#### Scenario: Migration calculation preserves precision
- **Given** a user with credits at any value (e.g., $50.00)
- **When** migration is processed
- **Then** the new credits SHALL be calculated as `currentCredits / 2.5`
- **And** the result SHALL be rounded to 4 decimal places (e.g., $50.00 → $20.00)

#### Scenario: Unauthenticated migration request
- **Given** an unauthenticated request
- **When** sending POST to `/api/user/migrate`
- **Then** the system SHALL return HTTP 401 Unauthorized

### Requirement: API Access Control for Non-Migrated Users

The system SHALL block LLM API requests from users who have not migrated to the new rate.

#### Scenario: Non-migrated user attempts LLM API request
- **Given** a user with `migration: false`
- **And** the user is not an admin
- **When** the user makes an LLM API request (e.g., POST /v1/messages)
- **Then** the system SHALL reject the request with HTTP 403
- **And** the error message SHALL indicate migration is required
- **And** the response SHALL include `{ error: "Migration required", dashboardUrl: "/dashboard" }`

#### Scenario: Migrated user makes LLM API request
- **Given** a user with `migration: true`
- **When** the user makes an LLM API request
- **Then** the request SHALL be processed normally
- **And** the migration check SHALL NOT add measurable latency

#### Scenario: Admin bypasses migration check
- **Given** a user with role `admin`
- **And** the admin has `migration: false`
- **When** the admin makes an LLM API request
- **Then** the migration check SHALL be bypassed
- **And** the request SHALL be processed successfully

### Requirement: Dashboard Migration UI

The frontend SHALL display a migration interface on the dashboard for **existing non-migrated users only**. New users (who are automatically migrated) should never see this UI.

#### Scenario: Existing non-migrated user visits dashboard
- **Given** a user with `migration: false` (existing user who hasn't chosen)
- **When** the user navigates to `/dashboard`
- **Then** the system SHALL display a migration banner/overlay
- **And** the banner SHALL explain the rate change (1,000 → 2,500 VNĐ/$)
- **And** two options SHALL be presented: "Request Refund" and "Migrate Credits"

#### Scenario: New user (auto-migrated) visits dashboard
- **Given** a user with `migration: true` (newly registered after rate change)
- **When** the user navigates to `/dashboard`
- **Then** no migration UI SHALL be displayed
- **And** the dashboard SHALL function normally
- **And** the user SHALL NOT be prompted for migration

#### Scenario: User clicks "Request Refund"
- **Given** the migration UI is displayed
- **When** the user clicks "Request Refund"
- **Then** the Discord support page SHALL open in a new tab
- **And** the user SHALL remain on the current page

#### Scenario: User clicks "Migrate Credits"
- **Given** the migration UI is displayed
- **When** the user clicks "Migrate Credits"
- **Then** a confirmation dialog SHALL be displayed
- **And** the dialog SHALL show current credits and new credits (after / 2.5)
- **And** the dialog SHALL warn that this action is irreversible
- **And** Confirm and Cancel buttons SHALL be provided

#### Scenario: User confirms migration
- **Given** the migration confirmation dialog is displayed
- **When** the user clicks Confirm
- **Then** the system SHALL call `POST /api/user/migrate`
- **And** on success, a success message SHALL be displayed
- **And** the credit balance SHALL be updated to reflect the new amount
- **And** the migration UI SHALL be removed
- **And** the dashboard SHALL function normally

#### Scenario: Migrated user visits dashboard
- **Given** a user with `migration: true` (completed migration)
- **When** the user navigates to `/dashboard`
- **Then** no migration UI SHALL be displayed
- **And** the dashboard SHALL function normally

### Requirement: Migration Status in User Profile API

The user profile API SHALL include the migration status field.

#### Scenario: Fetch user profile includes migration status
- **Given** an authenticated user
- **When** calling `GET /api/user/profile`
- **Then** the response SHALL include the `migration: boolean` field
- **And** the value SHALL be `true` or `false`

### Requirement: Migration Transaction Safety

The system SHALL handle migration as an atomic transaction with rollback on failure.

#### Scenario: Migration fails mid-process
- **Given** a user initiates migration
- **When** the migration calculation succeeds but database update fails
- **Then** the entire transaction SHALL be rolled back
- **And** the user SHALL remain in "not migrated" state
- **And** an error message SHALL be returned to the client
- **And** credits SHALL NOT be modified

#### Scenario: User has zero credits during migration
- **Given** a user with `credits: 0`
- **When** migration is processed
- **Then** the migration SHALL complete successfully
- **And** `migration` SHALL be set to `true`
- **And** credits SHALL remain at `0`
- **And** a migration log SHALL still be created with oldCredits=0, newCredits=0

### Requirement: MigrationLog Model

The system SHALL create a `MigrationLog` model to store migration audit logs in MongoDB.

#### Scenario: MigrationLog model schema
- **Given** the MigrationLog schema in `backend/src/models/migration-log.model.ts` (new file)
- **When** the schema is defined
- **Then** it SHALL include the following fields:
  - `_id: ObjectId` (auto-generated)
  - `userId: string` (reference to UserNew._id)
  - `username: string`
  - `oldCredits: number`
  - `newCredits: number`
  - `migratedAt: Date`
  - `oldRate: number` (1000)
  - `newRate: number` (2500)
- **And** the collection SHALL be named `migration_logs`
- **And** `userId` and `migratedAt` SHALL be indexed for efficient querying

#### Scenario: Migration log is created on successful migration
- **Given** a user successfully completes migration
- **When** the migration transaction commits
- **Then** a new document SHALL be inserted into `migration_logs` collection
- **And** the document SHALL contain all migration details
- **And** `migratedAt` SHALL be the timestamp of migration completion

## MODIFIED Requirements

### Requirement: UserNew Model Schema

The UserNew mongoose model SHALL include a migration status field.

#### Scenario: Model field definition
- **Given** the UserNew schema in `backend/src/models/user-new.model.ts`
- **When** the schema is defined
- **Then** it SHALL include `migration: { type: Boolean, default: false }`
- **And** the field SHALL be indexed for efficient querying
- **And** the IUserNew interface SHALL include `migration: boolean`

## Data Types

### MigrationStatus
```typescript
{
  migration: boolean  // false = not migrated, true = migrated
}
```

### MigrationRequest
```typescript
POST /api/user/migrate
// No body required (uses authenticated user)
```

### MigrationResponse
```typescript
{
  success: true
  newCredits: number  // Credit balance after migration (currentCredits / 2.5)
  oldCredits: number  // Credit balance before migration
}
```

### MigrationRequiredError
```typescript
{
  error: "Migration required"
  message: "Please visit your dashboard to complete the migration process"
  dashboardUrl: "/dashboard"
}
```

### MigrationLog
```typescript
{
  _id: ObjectId
  userId: string      // Reference to UserNew._id
  username: string
  oldCredits: number  // Credits before migration
  newCredits: number  // Credits after migration (oldCredits / 2.5)
  migratedAt: Date    // Timestamp when migration occurred
  oldRate: number     // 1000 (VNĐ per USD)
  newRate: number     // 2500 (VNĐ per USD)
}
```

## Constraints

- Migration is a one-way operation (cannot be reversed)
- Credits are divided by exactly 2.5 (no rounding to integers)
- All users must migrate before accessing the API
- Admin users are exempt from migration requirement
- Refund requests are handled externally (Discord)
