## ADDED Requirements

### Requirement: Troll-2 Streaming Usage Tracking

The system SHALL track token usage and deduct credits for ALL Troll-2 requests, including streaming requests.

For streaming requests, the system SHALL:
1. Include `stream_options: {"include_usage": true}` in the request to upstream (for future compatibility)
2. Capture streamed content and estimate output tokens if upstream doesn't provide usage data
3. Estimate tokens using ~4 characters per token ratio
4. Deduct credits based on actual or estimated token usage

#### Scenario: Streaming request with token estimation
- **WHEN** a user makes a streaming request to a Troll-2 model
- **AND** the upstream does not return usage data in SSE events
- **THEN** the system captures all streamed content
- **AND** estimates output tokens from content length (~4 chars/token)
- **AND** logs show: `📊 [Troll-2] Estimated output tokens from X chars: Y tokens`
- **AND** credits are deducted based on estimated token usage

#### Scenario: Streaming with native usage support
- **WHEN** a streaming request returns usage data from upstream
- **THEN** the system uses the actual `prompt_tokens` and `completion_tokens` values
- **AND** credits are deducted based on actual token usage
