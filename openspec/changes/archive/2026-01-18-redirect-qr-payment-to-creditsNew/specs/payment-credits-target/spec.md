# Payment Credits Target Specification

## MODIFIED Requirements

### Requirement: QR Payment Credits Destination

After successful QR payment via Sepay webhook, credits MUST be added to the `creditsNew` field (OpenHands system) instead of the `credits` field (OhMyGPT system).

#### Scenario: Successful QR payment adds creditsNew
**Given** a user with 0 creditsNew
**And** a pending payment of $20
**When** the Sepay webhook confirms the payment
**Then** the user's creditsNew should increase by $20 (plus any promo bonus)
**And** the user's expiresAtNew should be set to 7 days from now
**And** the user's purchasedAtNew should be set to current timestamp
**And** the payment record should store creditsBefore and creditsAfter values

#### Scenario: Existing creditsNew balance is preserved
**Given** a user with $15 creditsNew remaining
**And** a pending payment of $50
**When** the Sepay webhook confirms the payment
**Then** the user's creditsNew should be $65 (15 + 50)
**And** expiresAtNew should be reset to 7 days from now

#### Scenario: Promo bonus applies to creditsNew
**Given** the promo period is active (20% bonus)
**And** a user purchases $100
**When** the Sepay webhook confirms the payment
**Then** the user's creditsNew should increase by $120 (100 + 20% bonus)

### Requirement: Payment History Tracking

Payment records MUST continue to track creditsBefore and creditsAfter, but these values now reference the `creditsNew` field.

#### Scenario: Payment record stores correct balance
**Given** a user with $30 creditsNew
**When** they complete a $20 payment
**Then** the payment record should have creditsBefore = 30
**And** creditsAfter = 50
