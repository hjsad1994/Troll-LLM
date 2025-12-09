# user-migration Specification

## Purpose
TBD - created by archiving change copy-user-to-usernew. Update Purpose after archive.
## Requirements
### Requirement: UserNew Model
The system MUST provide a UserNew model with identical schema to User model.

#### Scenario: UserNew schema matches User schema
- **Given** the User model exists with defined fields
- **When** UserNew model is created
- **Then** UserNew must have all the same fields as User:
  - `_id` (String, required)
  - `passwordHash` (String, required)
  - `passwordSalt` (String, required)
  - `role` (String, enum: 'admin'|'user', default: 'user')
  - `isActive` (Boolean, default: true)
  - `createdAt` (Date, default: now)
  - `lastLoginAt` (Date, optional)
  - `apiKey` (String, unique, sparse)
  - `apiKeyCreatedAt` (Date)
  - `credits` (Number, default: 0)
  - `creditsUsed` (Number, default: 0)
  - `totalInputTokens` (Number, default: 0)
  - `totalOutputTokens` (Number, default: 0)
  - `purchasedAt` (Date, optional)
  - `expiresAt` (Date, optional)
  - `referralCode` (String, unique, sparse)
  - `referredBy` (String, optional)
  - `refCredits` (Number, default: 0)
  - `referralBonusAwarded` (Boolean, default: false)

#### Scenario: UserNew uses separate collection
- **Given** the UserNew model is defined
- **When** documents are saved
- **Then** they must be stored in the `usersNew` collection

### Requirement: Data Migration Script
The system MUST provide a migration script to copy all User data to UserNew.

#### Scenario: Successful migration
- **Given** the `users` collection contains N documents
- **When** the migration script runs
- **Then** N documents must be inserted into `usersNew` collection
- **And** all field values must be preserved exactly

#### Scenario: Migration handles errors
- **Given** the migration script is running
- **When** an error occurs during migration
- **Then** the script must log the error
- **And** provide information about which documents failed

