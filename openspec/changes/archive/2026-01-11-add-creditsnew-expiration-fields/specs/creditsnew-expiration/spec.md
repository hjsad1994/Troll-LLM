# CreditsNew Expiration Specification

## Overview
Separate expiration tracking for creditsNew (OpenHands credits) independent from credits (OhMyGPT credits).

## ADDED Requirements

### Requirement: CreditsNew Expiration Fields
The system SHALL store separate expiration timestamps for creditsNew.

#### Scenario: New user fields
- **Given** the UserNew model
- **When** a user document is created or updated
- **Then** the following fields MUST be available:
  - `purchasedAtNew: Date | null` - timestamp of last creditsNew purchase
  - `expiresAtNew: Date | null` - expiration timestamp for creditsNew
- **And** both fields SHALL default to `null` for new users

### Requirement: Payment Sets CreditsNew Expiration
When a payment is completed, the system MUST set expiration fields for creditsNew only.

#### Scenario: Successful payment updates creditsNew expiration
- **Given** a user with any creditsNew balance
- **When** a payment is successfully processed
- **Then** `creditsNew` SHALL be incremented by the payment amount (with bonus if applicable)
- **And** `purchasedAtNew` MUST be set to the current timestamp
- **And** `expiresAtNew` MUST be set to 7 days from the current timestamp
- **And** `purchasedAt` and `expiresAt` SHALL remain unchanged

### Requirement: CreditsNew Expiration Scheduling
The system MUST schedule automatic reset of creditsNew when it expires.

#### Scenario: Schedule expiration on payment
- **Given** a payment is processed successfully
- **When** `expiresAtNew` is set
- **Then** an expiration timer MUST be scheduled for the user's creditsNew
- **And** the timer SHALL be independent from any credits (OhMyGPT) expiration timer

#### Scenario: Backend initialization schedules pending expirations
- **Given** the backend service starts
- **When** `ExpirationSchedulerService.init()` is called
- **Then** all users with `creditsNew > 0` and `expiresAtNew` set MUST be queried
- **And** expiration timers SHALL be scheduled for each qualifying user

### Requirement: CreditsNew Expiration Reset
When creditsNew expires, only creditsNew SHALL be reset.

#### Scenario: CreditsNew expires
- **Given** a user with `creditsNew > 0` and `expiresAtNew` in the past
- **When** the expiration timer fires or the system checks expiration
- **Then** `creditsNew` MUST be set to 0
- **And** `purchasedAtNew` MUST be set to null
- **And** `expiresAtNew` MUST be set to null
- **And** `credits`, `purchasedAt`, and `expiresAt` SHALL remain unchanged
- **And** the reset MUST be logged in the credits reset log

### Requirement: API Returns CreditsNew Expiration Info
The API MUST return expiration information for creditsNew.

#### Scenario: GET /api/users/profile returns creditsNew expiration
- **Given** an authenticated user
- **When** the user requests their profile
- **Then** the response MUST include `purchasedAtNew` and `expiresAtNew` fields

#### Scenario: GET /api/users/billing returns creditsNew expiration details
- **Given** an authenticated user
- **When** the user requests their billing info
- **Then** the response MUST include:
  - `purchasedAtNew: Date | null`
  - `expiresAtNew: Date | null`
  - `daysUntilExpirationNew: number | null` (days remaining)
  - `isExpiringSoonNew: boolean` (true if <= 3 days remaining)

### Requirement: Dashboard Displays CreditsNew Expiration
The dashboard MUST display expiration information for creditsNew separately from credits.

#### Scenario: Dashboard shows creditsNew expiration countdown
- **Given** a user with `creditsNew > 0` and `expiresAtNew` set
- **When** the user views their dashboard
- **Then** the creditsNew section SHALL show the remaining time until expiration
- **And** a warning MUST be displayed if expiration is within 3 days

### Requirement: Expiration Scheduler Handles Both Credit Types
The expiration scheduler MUST handle both credits and creditsNew independently.

#### Scenario: Dual expiration tracking on init
- **Given** the backend starts
- **When** the expiration scheduler initializes
- **Then** it SHALL schedule expirations for users with `credits > 0` and `expiresAt` set
- **And** it SHALL schedule expirations for users with `creditsNew > 0` and `expiresAtNew` set
- **And** a user MAY have both types of expiration timers active simultaneously

## Dependencies
- Depends on: `billing` spec (credit system foundation)
- Related to: `rate-migration` spec (credits vs creditsNew separation)
