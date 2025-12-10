# User Migration - Credits Conversion

## ADDED Requirements

### Requirement: Credits Conversion Script
The system MUST provide a script to convert credits from old system to new system in UsersNew collection.

#### Scenario: Convert credits with correct formula
- **Given** a user in `usersNew` has `credits` and `refCredits` values
- **When** the conversion script runs
- **Then** the new credits value MUST be calculated as: `((credits + refCredits) * 144) / 1000`
- **And** the result MUST be rounded up to nearest 0.5
- **And** `refCredits` MUST be set to 0

#### Scenario: Set expiration based on balance threshold
- **Given** a user's new converted credits value
- **When** the new balance is less than $50
- **Then** `expiresAt` MUST be set to 7 days from conversion time
- **When** the new balance is $50 or more
- **Then** `expiresAt` MUST be set to 14 days from conversion time

#### Scenario: Update purchasedAt timestamp
- **Given** a user's credits are being converted
- **When** the conversion is applied
- **Then** `purchasedAt` MUST be set to the current timestamp
