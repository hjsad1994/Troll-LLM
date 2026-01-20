# admin-creditsnew-endpoints Specification

## Purpose
Enable administrators to manually manage OpenHands credit balances (`creditsNew`) through dedicated HTTP endpoints, providing the same set/add functionality available for OhMyGPT credits (`credits`).

## Requirements

### Requirement: Admin Set CreditsNew Endpoint
The system SHALL provide an admin-only endpoint to set a user's `creditsNew` field to an absolute value.

#### Scenario: Set creditsNew with expiration reset
- **WHEN** an administrator sends `PATCH /admin/users/:username/creditsNew` with body `{ creditsNew: 100, resetExpiration: true }`
- **THEN** the user's `creditsNew` field SHALL be set to 100
- **AND** the user's `expiresAt` field SHALL be set to 7 days from the current timestamp
- **AND** the user's `purchasedAt` field SHALL be set to the current timestamp
- **AND** the response SHALL return HTTP 200 with `{ success: true, message: "...", user: { username, creditsNew, expiresAt } }`

#### Scenario: Set creditsNew without expiration reset
- **WHEN** an administrator sends `PATCH /admin/users/:username/creditsNew` with body `{ creditsNew: 50, resetExpiration: false }`
- **THEN** the user's `creditsNew` field SHALL be set to 50
- **AND** the user's `expiresAt` field SHALL NOT be modified
- **AND** the user's `purchasedAt` field SHALL NOT be modified
- **AND** the response SHALL return HTTP 200 with updated user state

#### Scenario: Set creditsNew validation failure
- **WHEN** an administrator sends `PATCH /admin/users/:username/creditsNew` with invalid input (negative number, non-number, missing field)
- **THEN** the request SHALL return HTTP 400
- **AND** the error message SHALL state "CreditsNew must be a non-negative number"
- **AND** the database SHALL NOT be modified

#### Scenario: Set creditsNew for non-existent user
- **WHEN** an administrator sends `PATCH /admin/users/:username/creditsNew` for a user that does not exist
- **THEN** the request SHALL return HTTP 404
- **AND** the error message SHALL state "User not found"

#### Scenario: Set creditsNew without admin privileges
- **WHEN** a non-admin user sends `PATCH /admin/users/:username/creditsNew`
- **THEN** the request SHALL return HTTP 401 or 403
- **AND** the database SHALL NOT be modified

### Requirement: Admin Add CreditsNew Endpoint
The system SHALL provide an admin-only endpoint to increment a user's `creditsNew` field by a specified amount.

#### Scenario: Add creditsNew with expiration reset
- **WHEN** an administrator sends `POST /admin/users/:username/creditsNew/add` with body `{ amount: 25, resetExpiration: true }`
- **AND** the user's current `creditsNew` is 100
- **THEN** the user's `creditsNew` field SHALL be incremented to 125
- **AND** the user's `expiresAt` field SHALL be set to 7 days from the current timestamp
- **AND** the user's `purchasedAt` field SHALL be set to the current timestamp
- **AND** the response SHALL return HTTP 200 with `{ success: true, message: "Added $25 creditsNew to {username}", user: { username, creditsNew, expiresAt } }`

#### Scenario: Add creditsNew without expiration reset
- **WHEN** an administrator sends `POST /admin/users/:username/creditsNew/add` with body `{ amount: 10, resetExpiration: false }`
- **AND** the user's current `creditsNew` is 50
- **THEN** the user's `creditsNew` field SHALL be incremented to 60
- **AND** the user's `expiresAt` field SHALL NOT be modified
- **AND** the user's `purchasedAt` field SHALL NOT be modified

#### Scenario: Add creditsNew validation failure
- **WHEN** an administrator sends `POST /admin/users/:username/creditsNew/add` with invalid input (non-positive number, non-number, missing field)
- **THEN** the request SHALL return HTTP 400
- **AND** the error message SHALL state "Amount must be a positive number"
- **AND** the database SHALL NOT be modified

#### Scenario: Add creditsNew for non-existent user
- **WHEN** an administrator sends `POST /admin/users/:username/creditsNew/add` for a user that does not exist
- **THEN** the request SHALL return HTTP 404
- **AND** the error message SHALL state "User not found"

#### Scenario: Add creditsNew without admin privileges
- **WHEN** a non-admin user sends `POST /admin/users/:username/creditsNew/add`
- **THEN** the request SHALL return HTTP 401 or 403
- **AND** the database SHALL NOT be modified

### Requirement: CreditsNew Expiration Consistency
The `resetExpiration` parameter behavior SHALL match the existing `credits` endpoint implementation exactly.

#### Scenario: Default expiration reset behavior
- **WHEN** the `resetExpiration` parameter is not provided in the request body
- **THEN** the system SHALL default to `resetExpiration: true`
- **AND** the `expiresAt` SHALL be set to 7 days from the current timestamp

#### Scenario: Expiration calculation precision
- **WHEN** `resetExpiration: true` is set
- **THEN** the `expiresAt` SHALL be calculated as `Date.now() + (7 * 24 * 60 * 60 * 1000)` milliseconds
- **AND** the calculation SHALL match the `VALIDITY_DAYS` constant used in `payment.service.ts`

## MODIFIED Requirements

### Requirement: User Repository CreditsNew Methods
The `userRepository` SHALL provide methods to set and add `creditsNew` values with optional expiration reset.

#### Scenario: setCreditsNew repository method
- **WHEN** `userRepository.setCreditsNew(username, creditsNew, resetExpiration)` is called
- **THEN** the method SHALL update the user document in the `usersNew` collection
- **AND** if `resetExpiration` is true, SHALL set `expiresAt` to 7 days from now and `purchasedAt` to current timestamp
- **AND** SHALL return the updated user document

#### Scenario: addCreditsNew repository method
- **WHEN** `userRepository.addCreditsNew(username, amount, resetExpiration)` is called
- **THEN** the method SHALL use MongoDB `$inc` operator to increment `creditsNew` by the specified amount
- **AND** if `resetExpiration` is true, SHALL set `expiresAt` to 7 days from now and `purchasedAt` to current timestamp
- **AND** SHALL return the updated user document
