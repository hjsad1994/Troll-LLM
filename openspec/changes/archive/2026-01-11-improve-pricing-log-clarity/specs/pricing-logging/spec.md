# pricing-logging Specification

## Purpose
Defines requirements for clear, informative pricing deduction logs that help users understand how they are charged for API requests.

## ADDED Requirements

### Requirement: Detailed Deduction Log Format
The system SHALL log credit deductions with detailed pricing information including model name, per-token pricing, and any applied multipliers.

#### Scenario: Standard API request deduction log
- **WHEN** a user makes an API request and credits are deducted
- **THEN** the log SHALL include:
  - Username
  - Deducted amount in USD
  - Model name used
  - Input token count and price per million tokens
  - Output token count and price per million tokens
  - Billing multiplier (if > 1.0)
  - Remaining balance after deduction
- **AND** the log format SHALL be:
  ```
  💰 [username] Deducted $cost for ModelName (in=N @ $P/MTok, out=N @ $P/MTok, multiplier=X) remaining=$X
  ```

#### Scenario: Deduction with cache tokens
- **WHEN** a request uses cache tokens (cache_write or cache_hit)
- **THEN** the log SHALL ALSO include:
  - Cache write token count and price per million tokens (if > 0)
  - Cache hit token count and price per million tokens (if > 0)
- **AND** the log format SHALL be:
  ```
  💰 [username] Deducted $cost for ModelName (in=N @ $P/MTok, out=N @ $P/MTok, cache_write=N @ $P/MTok, cache_hit=N @ $P/MTok, multiplier=X) remaining=$X
  ```

#### Scenario: Deduction from refCredits
- **WHEN** main credits are exhausted and deduction is from refCredits
- **THEN** the log SHALL indicate the source:
  ```
  💰 [username] Deducted $cost from refCredits for ModelName (in=N @ $P/MTok, out=N @ $P/MTok, multiplier=X) remaining=$X
  ```

#### Scenario: Deduction with split credits and refCredits
- **WHEN** deduction is split between credits and refCredits
- **THEN** the log SHALL show both amounts:
  ```
  💰 [username] Deducted $X from credits + $Y from refCredits for ModelName (in=N @ $P/MTok, out=N @ $P/MTok, multiplier=X) remaining=$X
  ```

### Requirement: Pricing Information Accuracy
All pricing information displayed in deduction logs SHALL be accurate and match the model's configured pricing.

#### Scenario: Input/output price lookup
- **WHEN** logging a deduction
- **THEN** the input/output prices SHALL match the model's `input_price_per_mtok` and `output_price_per_mtok` configuration

#### Scenario: Billing multiplier lookup
- **WHEN** logging a deduction
- **THEN** the multiplier SHALL match the model's `billing_multiplier` configuration
- **AND** if multiplier is 1.0 (default), it SHALL still be displayed for transparency

#### Scenario: Cache price lookup
- **WHEN** cache tokens are present
- **THEN** the cache prices SHALL match the model's `cache_write_price_per_mtok` and `cache_hit_price_per_mtok` configuration

### Requirement: Remaining Balance Display
Deduction logs SHALL show the user's remaining balance (credits + refCredits) after the deduction.

#### Scenario: Successful deduction with balance
- **WHEN** credits are successfully deducted
- **THEN** the log SHALL show the combined remaining balance (credits + refCredits)
- **AND** the balance SHALL reflect the post-deduction amount

#### Scenario: Deduction failure for insufficient balance
- **WHEN** deduction fails due to insufficient balance
- **THEN** an error log SHALL show:
  - Required cost
  - Available balance
  - The deficit (cost - balance)
- **AND** the existing error log format SHALL be maintained:
  ```
  💸 [username] Insufficient balance: cost=$X > balance=$Y
  ```

### Requirement: Backward Compatibility
The enhanced logging format SHALL maintain the core structure of existing logs while adding more detail.

#### Scenario: Log prefix consistency
- **WHEN** logging deductions
- **THEN** the emoji prefix `💰` SHALL be maintained
- **AND** the username format `[username]` SHALL be maintained
- **AND** the "Deducted" keyword SHALL be maintained

#### Scenario: Existing log parsers
- **WHEN** external tools parse the logs
- **THEN** they SHALL still be able to extract:
  - Username (from brackets)
  - Deducted amount (after "Deducted $")
  - Token counts (from in=N, out=N pattern)
- **AND** the additional details SHALL be appended without breaking existing patterns
