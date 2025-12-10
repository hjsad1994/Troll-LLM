## REMOVED Requirements

### Requirement: User Billing Dashboard (Credits)
**Reason**: Replaced by token-based billing system
**Migration**: Users see token balance instead of credits

### Requirement: User Dashboard - Credits Usage By Period
**Reason**: Credits system replaced with tokens
**Migration**: Show token usage instead

### Requirement: Deduct Credits Per Request
**Reason**: Replaced by token deduction
**Migration**: Deduct actual tokens used instead of USD cost

---

## MODIFIED Requirements

### Requirement: User Billing Dashboard
The system SHALL display billing information including token balance, usage, and expiration.

#### Scenario: View token balance
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display total tokens remaining
- **AND** format as "X.XM Tokens" (e.g., "6.0M Tokens", "11.5M Tokens")
- **AND** show progress bar of tokens used vs purchased

#### Scenario: View token usage
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display tokens used since purchase
- **AND** show breakdown: "Input: X.XM | Output: X.XM"

#### Scenario: View expiration date
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display expiration date
- **AND** format as "Expires: DD/MM/YYYY (X days left)"
- **AND** show warning if expiring within 2 days

#### Scenario: Expired tokens
- **WHEN** user's tokens have expired (current date > expiresAt)
- **THEN** the system SHALL display "Tokens Expired"
- **AND** show prompt to purchase new tokens
- **AND** token balance SHALL be treated as 0

---

### Requirement: Token Deduction Per Request
The system SHALL deduct tokens from user balance based on actual token usage.

#### Scenario: Deduct tokens on API request
- **WHEN** user makes an API request
- **THEN** the system SHALL deduct (inputTokens + outputTokens) from tokenBalance
- **AND** NOT apply any multiplier or pricing conversion

#### Scenario: Token deduction example
- **WHEN** request uses 1000 input tokens and 500 output tokens
- **THEN** deduct 1500 tokens from user's tokenBalance

#### Scenario: Insufficient tokens
- **WHEN** user makes API request
- **AND** user's tokenBalance < required tokens
- **THEN** the system SHALL reject request with "insufficient_tokens" error

#### Scenario: Expired tokens block access
- **WHEN** user makes API request
- **AND** current date > user's expiresAt
- **THEN** the system SHALL reject request with "tokens_expired" error

---

## ADDED Requirements

### Requirement: Token Balance Display Format
The system SHALL display token balances in millions format for readability.

#### Scenario: Format token balance
- **WHEN** displaying token balance
- **THEN** format as "X.XM" where M = millions
- **AND** examples: 6000000 -> "6.0M", 11500000 -> "11.5M", 500000 -> "0.5M"

#### Scenario: Format small token balance
- **WHEN** token balance < 100000 (0.1M)
- **THEN** format as "XXK" where K = thousands
- **AND** example: 50000 -> "50K"

---

### Requirement: Weekly Token Expiration
The system SHALL expire token packages after 1 week from purchase date.

#### Scenario: Set expiration on purchase
- **WHEN** user purchases token package
- **THEN** the system SHALL set expiresAt to 7 days from now
- **AND** set purchasedAt to current timestamp

#### Scenario: Check expiration on each request
- **WHEN** user makes API request
- **THEN** the system SHALL check if current date > expiresAt
- **AND** if expired, reject request and prompt renewal

#### Scenario: Display days remaining
- **WHEN** user views dashboard
- **THEN** the system SHALL calculate and display days remaining
- **AND** show warning styling if <= 2 days remaining
