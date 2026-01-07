## ADDED Requirements

### Requirement: Model Statistics Include All Token Types

The `/admin/model-stats` endpoint SHALL return token statistics that include all token types: input tokens, output tokens, cache write tokens, and cache hit tokens.

#### Scenario: Model statistics aggregation includes cache tokens
- **Given** the system has request logs with cache token data
- **When** an admin calls `GET /admin/model-stats`
- **THEN** the aggregation pipeline SHALL sum all token types separately:
  - `inputTokens`: sum of input tokens
  - `outputTokens`: sum of output tokens
  - `cacheWriteTokens`: sum of cache write tokens
  - `cacheHitTokens`: sum of cache hit tokens
- **AND** the `totalTokens` field SHALL be calculated as:
  ```
  totalTokens = inputTokens + outputTokens + cacheWriteTokens + cacheHitTokens
  ```

#### Scenario: Model statistics response includes cache token breakdown
- **Given** an admin requests model statistics
- **When** the `GET /admin/model-stats` endpoint returns data
- **THEN** each model statistic SHALL include:
  - `model: string`
  - `inputTokens: number`
  - `outputTokens: number`
  - `cacheWriteTokens: number`
  - `cacheHitTokens: number`
  - `totalTokens: number` (sum of all four token types)
  - `creditsBurned: number`
  - `requestCount: number`

#### Scenario: Model statistics with zero cache tokens
- **Given** request logs exist without cache token data (legacy logs)
- **WHEN** `getModelStats()` aggregates the data
- **THEN** missing cache token fields SHALL be treated as `0`
- **AND** `totalTokens` SHALL still be calculated correctly (input + output only)

#### Scenario: Model statistics sorting by total tokens
- **Given** multiple models have token usage data
- **WHEN** the model statistics are returned
- **THEN** results SHALL be sorted by `totalTokens` in descending order (highest usage first)
- **AND** `totalTokens` SHALL include cache tokens in the sort calculation
