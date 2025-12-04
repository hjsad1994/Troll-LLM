## ADDED Requirements

### Requirement: Referral Credits Field
The system SHALL support a separate `refCredits` field for referral bonus credits.

#### Scenario: User has refCredits balance
- **WHEN** a user has been awarded referral credits
- **THEN** the user record SHALL include `refCredits` field (default: 0)
- **AND** `refCredits` is separate from main `credits` balance

---

### Requirement: Credit Deduction Priority
The system SHALL use main credits first, then referral credits when main credits are exhausted.

#### Scenario: Deduct from main credits when available
- **WHEN** user makes API request costing X credits
- **AND** user has sufficient main `credits` balance (credits >= X)
- **THEN** the system SHALL deduct X from main `credits`
- **AND** NOT touch `refCredits`
- **AND** apply user's plan RPM limit (Dev: 300 RPM, Pro: 1000 RPM)

#### Scenario: Deduct from refCredits when main credits exhausted
- **WHEN** user makes API request costing X credits
- **AND** user's main `credits` balance is 0
- **AND** user has sufficient `refCredits` balance (refCredits >= X)
- **THEN** the system SHALL deduct X from `refCredits`
- **AND** apply **Pro-level RPM (1000 RPM)** for this request regardless of user's plan

#### Scenario: Deduct from both credits (partial)
- **WHEN** user makes API request costing X credits
- **AND** user has Y main credits where 0 < Y < X
- **AND** user has sufficient `refCredits` to cover (X - Y)
- **THEN** the system SHALL deduct Y from main `credits` (reducing to 0)
- **AND** deduct (X - Y) from `refCredits`
- **AND** apply **Pro-level RPM (1000 RPM)** for this request

#### Scenario: Reject request when no credits available
- **WHEN** user makes API request
- **AND** user has 0 main `credits` AND 0 `refCredits`
- **THEN** the system SHALL reject the request with HTTP 402 Payment Required
- **AND** response SHALL include error type "insufficient_credits"

---

### Requirement: Pro-Level RPM for Referral Credits
The system SHALL apply Pro-level rate limits when user is consuming referral credits.

#### Scenario: Apply Pro RPM when using refCredits only
- **WHEN** user makes API request
- **AND** credits are deducted from `refCredits` (main credits = 0)
- **THEN** the system SHALL apply 1000 RPM rate limit for this request
- **AND** ignore user's plan-based RPM limit for this request

#### Scenario: Apply Pro RPM when using mixed credits
- **WHEN** user makes API request
- **AND** credits are deducted from both main `credits` AND `refCredits`
- **THEN** the system SHALL apply 1000 RPM rate limit for this request

#### Scenario: Apply plan RPM when using main credits only
- **WHEN** user makes API request
- **AND** credits are deducted only from main `credits`
- **AND** `refCredits` is not touched
- **THEN** the system SHALL apply user's plan-based RPM limit (Dev: 300, Pro: 1000)

---

## MODIFIED Requirements

### Requirement: Token Quota Enforcement
The system SHALL block users when their token quota is exhausted, considering both main credits and referral credits.

#### Scenario: Request with available main credits
- **WHEN** a request is made with a key that has credits > 0
- **THEN** the request SHALL be processed normally
- **AND** deduct from main credits first

#### Scenario: Request with exhausted main credits but available refCredits
- **WHEN** a request is made with a key that has credits = 0
- **AND** refCredits > 0
- **THEN** the request SHALL be processed normally
- **AND** deduct from refCredits
- **AND** apply Pro-level RPM (1000 RPM)

#### Scenario: Request with both credits exhausted
- **WHEN** a request is made with a key that has credits = 0 AND refCredits = 0
- **THEN** the system SHALL return HTTP 402 Payment Required
- **AND** response SHALL include error type "quota_exhausted"
- **AND** response SHALL include credits, refCredits values (both 0)

#### Scenario: Usage tracking after request
- **WHEN** a request completes successfully
- **THEN** tokens_used SHALL be extracted from API response (input_tokens + output_tokens)
- **AND** deduct from appropriate credit balance (credits first, then refCredits)
- **AND** user_keys.requests_count SHALL be incremented
