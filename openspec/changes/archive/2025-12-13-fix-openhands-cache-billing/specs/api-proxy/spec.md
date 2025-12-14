## MODIFIED Requirements

### Requirement: OpenHands Billing Accuracy
The system SHALL calculate billing tokens for OpenHands requests based on the fact that OpenHands API returns input tokens that are **already net of cache deductions**, unlike MainTarget which returns gross input tokens.

#### Scenario: Calculate billing for OpenHands request with cache hits
- **GIVEN** OpenHands API returns usage: `input_tokens=1000`, `cache_creation_input_tokens=500`, `cache_read_input_tokens=300`, `output_tokens=200`
- **AND** the `input_tokens` value of 1000 is already net of cache (gross would be 1000 + 500 + 300 = 1800)
- **WHEN** the system calculates billing tokens
- **THEN** billing tokens = `input + cacheWrite + output + EffectiveCacheHit(cacheHit)` = `1000 + 500 + 200 + EffectiveCacheHit(300)`
- **AND** the system MUST NOT add cache back to input (since input is already net)

#### Scenario: Calculate billing for OpenHands request without cache
- **GIVEN** OpenHands API returns usage: `input_tokens=1000`, `output_tokens=200`, no cache fields
- **WHEN** the system calculates billing tokens
- **THEN** billing tokens = `input + output` = `1000 + 200` = `1200`
- **AND** no cache adjustments are applied

#### Scenario: Log OpenHands usage correctly
- **GIVEN** an OpenHands request completes with usage tokens
- **WHEN** the system logs the usage
- **THEN** the log MUST show: `[OpenHands] Usage: in=X out=Y cache_write=W cache_hit=H (discounted=D) cost=$C`
- **AND** clearly indicate that input is net of cache

### Requirement: Consistent Cache Billing Documentation
The system SHALL document the difference in cache token handling between MainTarget and OpenHands to prevent future billing errors.

#### Scenario: Code comments explain cache behavior
- **GIVEN** a developer reads the OpenHands billing code
- **WHEN** they see the usage callback
- **THEN** comments MUST explain that OpenHands input is already net of cache
- **AND** contrast this with MainTarget which requires adding cache back
