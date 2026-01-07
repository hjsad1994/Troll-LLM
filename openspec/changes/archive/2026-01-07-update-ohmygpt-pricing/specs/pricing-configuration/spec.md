# pricing-configuration Spec Delta

## ADDED Requirements

### Requirement: Accurate OhMyGPT Pricing Configuration

The system SHALL configure pricing values that exactly match OhMyGPT's official published rates for all Claude models.

#### Scenario: Claude Opus 4.5 pricing configuration
- **GIVEN** the system is configured for OhMyGPT upstream
- **WHEN** loading pricing configuration for Claude Opus 4.5
- **THEN** the `input_price_per_mtok` SHALL be 5.5
- **AND** the `output_price_per_mtok` SHALL be 27.5
- **AND** the `cache_write_price_per_mtok` SHALL be 6.88
- **AND** the `cache_hit_price_per_mtok` SHALL be 0.55

#### Scenario: Claude Sonnet 4.5 pricing configuration
- **GIVEN** the system is configured for OhMyGPT upstream
- **WHEN** loading pricing configuration for Claude Sonnet 4.5
- **THEN** the `input_price_per_mtok` SHALL be 3.0
- **AND** the `output_price_per_mtok` SHALL be 15.0
- **AND** the `cache_write_price_per_mtok` SHALL match OhMyGPT rate
- **AND** the `cache_hit_price_per_mtok` SHALL match OhMyGPT rate

#### Scenario: Claude Haiku 4.5 pricing configuration
- **GIVEN** the system is configured for OhMyGPT upstream
- **WHEN** loading pricing configuration for Claude Haiku 4.5
- **THEN** the `input_price_per_mtok` SHALL be 1.0
- **AND** the `output_price_per_mtok` SHALL be 5.0
- **AND** the `cache_write_price_per_mtok` SHALL match OhMyGPT rate
- **AND** the `cache_hit_price_per_mtok` SHALL match OhMyGPT rate

### Requirement: Database Default Pricing Accuracy

The system SHALL store accurate default pricing values in the database model for new model initialization.

#### Scenario: Default pricing for Claude Opus 4.5
- **GIVEN** a new Claude Opus 4.5 model is being initialized
- **WHEN** reading from `DEFAULT_MODEL_PRICING` array
- **THEN** `inputPricePerMTok` SHALL be 5.5
- **AND** `outputPricePerMTok` SHALL be 27.5

#### Scenario: Default pricing for Claude Sonnet 4.5
- **GIVEN** a new Claude Sonnet 4.5 model is being initialized
- **WHEN** reading from `DEFAULT_MODEL_PRICING` array
- **THEN** `inputPricePerMTok` SHALL be 3.0
- **AND** `outputPricePerMTok` SHALL be 15.0

#### Scenario: Default pricing for Claude Haiku 4.5
- **GIVEN** a new Claude Haiku 4.5 model is being initialized
- **WHEN** reading from `DEFAULT_MODEL_PRICING` array
- **THEN** `inputPricePerMTok` SHALL be 1.0
- **AND** `outputPricePerMTok` SHALL be 5.0

### Requirement: Configuration Synchronization

The system SHALL maintain consistent pricing values across development and production environments.

#### Scenario: Dev and prod config consistency
- **GIVEN** pricing is updated in production configuration
- **WHEN** comparing development and production configs
- **THEN** all pricing values SHALL match between environments
- **AND** model configurations SHALL be identical

## MODIFIED Requirements

### Requirement: Cost Calculation Accuracy

The system SHALL calculate user costs accurately based on actual token usage and correct pricing rates.

#### Scenario: Calculate cost with cache usage
- **GIVEN** a request uses 100,000 input tokens
- **AND** 50,000 output tokens
- **AND** 20,000 cache write tokens
- **AND** 30,000 cache hit tokens
- **WHEN** calculating cost for Claude Opus 4.5
- **THEN** input cost SHALL be (100,000 / 1,000,000) * 5.5 = 0.55
- **AND** output cost SHALL be (50,000 / 1,000,000) * 27.5 = 1.375
- **AND** cache write cost SHALL be (20,000 / 1,000,000) * 6.88 = 0.1376
- **AND** cache hit cost SHALL be (30,000 / 1,000,000) * 0.55 = 0.0165
- **AND** total cost SHALL equal 2.0791 (before multiplier)

## Cross-References

- Related to: `batch-pricing` (batch mode uses different pricing)
- References: `billing` spec (cost deduction from user credits)
