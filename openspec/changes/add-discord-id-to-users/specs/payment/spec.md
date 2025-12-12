# Payment Specification - Discord ID Extension

## MODIFIED Requirements

### Requirement: User Discord ID Storage
The system SHALL store the user's Discord ID in the `usersNew` collection when a payment is completed.

#### Scenario: Save Discord ID on successful payment
- **WHEN** a payment is completed successfully
- **AND** the payment record contains a valid `discordId`
- **THEN** the system SHALL update the user's `discordId` field in `usersNew` collection
- **AND** the `discordId` SHALL be stored as a string (17-19 digits)

#### Scenario: Payment without Discord ID preserves existing
- **WHEN** a payment is completed successfully
- **AND** the payment record does NOT contain a `discordId`
- **AND** the user already has a `discordId` stored
- **THEN** the system SHALL NOT modify the existing `discordId`

#### Scenario: Update Discord ID on subsequent payment
- **WHEN** a user completes a new payment with a different `discordId`
- **THEN** the system SHALL update the user's `discordId` to the new value

---

## ADDED Requirements

### Requirement: UserNew Discord ID Field
The `usersNew` collection SHALL include an optional `discordId` field.

#### Scenario: UserNew schema structure
- **WHEN** a user record is created or updated
- **THEN** the schema SHALL support:
  - `discordId`: string (optional, 17-19 digit Discord User ID)

#### Scenario: Discord ID format validation
- **WHEN** storing a `discordId`
- **THEN** the value SHALL be a string of 17-19 digits
- **AND** non-digit characters SHALL NOT be accepted
