## MODIFIED Requirements

### Requirement: Payment Sets CreditsNew Expiration
When a payment is completed, the system MUST set expiration fields for creditsNew only.

#### Scenario: Successful payment updates creditsNew expiration
- **Given** a user with any creditsNew balance
- **When** a payment is successfully processed
- **Then** `creditsNew` SHALL be incremented by the payment amount (with bonus if applicable)
- **And** `purchasedAtNew` MUST be set to the current timestamp
- **And** `expiresAtNew` MUST be set to 7 days from the current timestamp
- **And** `purchasedAt` and `expiresAt` SHALL remain unchanged

#### Scenario: Expiration timer uses correct scheduler
- **Given** a payment is processed for creditsNew
- **When** scheduling the expiration timer
- **Then** the system MUST call `scheduleExpirationNew()` (NOT `scheduleExpiration()`)
- **And** the timer SHALL be stored in `scheduledExpirationsNew` map
- **And** when the timer fires, `resetAndLogNew()` SHALL be called to reset creditsNew fields
