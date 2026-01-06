# batch-pricing Spec Delta

## ADDED Requirements

### Requirement: Batch Pricing Configuration

The system SHALL support optional batch pricing configuration for models, defaulting to 50% of regular pricing when not explicitly configured.

#### Scenario: Batch pricing with explicit configuration
- **GIVEN** a model has explicit batch pricing configured
- **WHEN** `GetBatchPricing()` is called for that model
- **THEN** return the configured `batch_input_price_per_mtok` value
- **AND** return the configured `batch_output_price_per_mtok` value

#### Scenario: Batch pricing with fallback to 50%
- **GIVEN** a model does NOT have explicit batch pricing configured
- **WHEN** `GetBatchPricing()` is called for that model
- **THEN** return 50% of regular `input_price_per_mtok`
- **AND** return 50% of regular `output_price_per_mtok`

#### Scenario: Batch pricing for Claude Opus 4.5
- **GIVEN** regular pricing is input=$5.50, output=$27.50
- **AND** batch pricing is not explicitly configured
- **WHEN** `GetBatchPricing()` is called for Claude Opus 4.5
- **THEN** return input=$2.75 (50% of $5.50)
- **AND** return output=$13.75 (50% of $27.50)

### Requirement: Batch Mode Detection

The system SHALL detect when a request uses Anthropic's Batch API and apply appropriate pricing.

#### Scenario: Detect batch from response metadata
- **GIVEN** an OhMyGPT response contains `usage.batch_size` field
- **WHEN** processing the response
- **THEN** the request SHALL be flagged as batch mode
- **AND** batch pricing SHALL be applied

#### Scenario: Detect batch from request headers
- **GIVEN** an incoming request has `anthropic-beta` header indicating batch mode
- **WHEN** processing the request
- **THEN** the request SHALL be flagged as batch mode
- **AND** batch pricing SHALL be applied

#### Scenario: Non-batch request defaults to regular pricing
- **GIVEN** a request has no batch indication in headers or response
- **WHEN** calculating the cost
- **THEN** regular (non-batch) pricing SHALL be applied
- **AND** no 50% discount SHALL be given

### Requirement: Batch Cost Calculation

The system SHALL calculate costs using batch pricing when batch mode is detected.

#### Scenario: Calculate batch request cost
- **GIVEN** a batch request uses 100,000 input tokens
- **AND** 50,000 output tokens
- **AND** regular pricing is input=$5.50, output=$27.50
- **AND** batch pricing is input=$2.75, output=$13.75
- **WHEN** calculating cost with `isBatch=true`
- **THEN** input cost SHALL be (100,000 / 1,000,000) * 2.75 = 0.275
- **AND** output cost SHALL be (50,000 / 1,000,000) * 13.75 = 0.6875
- **AND** total cost SHALL equal 0.9625

#### Scenario: Batch cost is exactly 50% of regular
- **GIVEN** a request with identical token counts
- **WHEN** comparing batch cost to regular cost
- **THEN** batch cost SHALL equal 50% of regular cost
- **AND** the discount SHALL be exactly 50%

#### Scenario: Batch request with cache usage
- **GIVEN** a batch request uses cached tokens
- **WHEN** calculating cost
- **THEN** batch input/output pricing SHALL be used
- **AND** cache pricing SHALL remain the same (not discounted)
- **AND** the discount applies only to input/output tokens

### Requirement: Backward Compatibility

The system SHALL maintain backward compatibility when batch pricing fields are not present in configuration.

#### Scenario: Load old config without batch fields
- **GIVEN** a configuration file without `batch_input_price_per_mtok` field
- **WHEN** loading the configuration
- **THEN** the config SHALL load successfully
- **AND** `GetBatchPricing()` SHALL return 50% fallback values

#### Scenario: Old code continues to work
- **GIVEN** existing code calls `CalculateBillingCostWithCache()` without batch flag
- **WHEN** the function is called
- **THEN** it SHALL default to regular pricing
- **AND** no breaking changes SHALL occur

## Cross-References

- Related to: `pricing-configuration` (defines regular pricing values)
- References: `billing` spec (cost deduction applies to batch costs too)
- Depends on: `pricing-configuration` (regular pricing must be correct first)
