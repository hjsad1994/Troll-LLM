## ADDED Requirements

### Requirement: Token Usage Database Update
The system SHALL update user token usage in the database after each API response.

#### Scenario: Update tokens after successful response
- **WHEN** an API request completes successfully
- **AND** the response contains usage information
- **THEN** the system SHALL call `usage.UpdateUsage(userApiKey, billingTokens)`
- **AND** the user's `tokensUsed` field in MongoDB SHALL be incremented

#### Scenario: Track tokens for streaming response
- **WHEN** a streaming API request completes
- **THEN** the system SHALL extract final token count from the stream
- **AND** update the database with the total tokens used

### Requirement: Token Billing Calculation
The system SHALL calculate billing tokens by applying model-specific multipliers to raw token usage.

#### Scenario: Opus model billing
- **WHEN** a request uses model `claude-opus-4-5-20251101`
- **AND** the response contains `input_tokens: 100` and `output_tokens: 200`
- **THEN** billing tokens SHALL be calculated as:
  - `billing_input_tokens: 120` (100 * 1.2)
  - `billing_output_tokens: 240` (200 * 1.2)

#### Scenario: Sonnet model billing
- **WHEN** a request uses model `claude-sonnet-4-5-20250929`
- **AND** the response contains `input_tokens: 100` and `output_tokens: 200`
- **THEN** billing tokens SHALL be calculated as:
  - `billing_input_tokens: 120` (100 * 1.2)
  - `billing_output_tokens: 240` (200 * 1.2)

#### Scenario: Haiku model billing
- **WHEN** a request uses model `claude-haiku-4-5-20251001`
- **AND** the response contains `input_tokens: 100` and `output_tokens: 200`
- **THEN** billing tokens SHALL be calculated as:
  - `billing_input_tokens: 40` (100 * 0.4)
  - `billing_output_tokens: 80` (200 * 0.4)

### Requirement: Billing Token Response
The system SHALL include billing token information in API responses.

#### Scenario: Non-streaming response with billing
- **WHEN** a non-streaming request completes successfully
- **THEN** the response usage object SHALL contain:
  - `prompt_tokens` (raw input tokens)
  - `completion_tokens` (raw output tokens)
  - `billing_prompt_tokens` (multiplied input tokens)
  - `billing_completion_tokens` (multiplied output tokens)

#### Scenario: Streaming response with billing
- **WHEN** a streaming request completes
- **THEN** the final usage information SHALL include billing tokens

### Requirement: Model Multiplier Configuration
The system SHALL support configurable token multipliers per model.

#### Scenario: Multiplier from config
- **WHEN** a model is configured with `"token_multiplier": 1.2`
- **THEN** all token calculations for that model SHALL use 1.2 as multiplier

#### Scenario: Default multiplier
- **WHEN** a model has no configured multiplier
- **THEN** the system SHALL use 1.0 as default multiplier
