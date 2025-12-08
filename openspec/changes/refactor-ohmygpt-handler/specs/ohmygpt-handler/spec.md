# OhmyGPT Handler Specification

## MODIFIED Requirements

### Requirement: OhmyGPT Stream Response Handling
The OhmyGPT handler SHALL forward streaming responses from OhmyGPT API to clients using pure passthrough pattern without modifying response content.

The handler SHALL:
- Forward SSE events directly to client without JSON parsing/modification
- Extract usage tokens (prompt_tokens, completion_tokens) for billing
- Maintain proper SSE format (data: ...\n for each line)
- Handle error responses with sanitized error messages

#### Scenario: Stream response passthrough
- **WHEN** OhmyGPT returns streaming response with status 200
- **THEN** handler forwards each SSE line directly to client
- **AND** extracts usage from final event for billing
- **AND** does not modify response JSON content

#### Scenario: Stream error handling
- **WHEN** OhmyGPT returns error status (4xx, 5xx)
- **THEN** handler returns sanitized error message to client
- **AND** logs original error for debugging

### Requirement: OhmyGPT Non-Stream Response Handling
The OhmyGPT handler SHALL forward non-streaming responses from OhmyGPT API using pure passthrough pattern.

The handler SHALL:
- Forward response body directly without modification
- Extract usage tokens for billing
- Handle error responses with sanitized error messages

#### Scenario: Non-stream response passthrough
- **WHEN** OhmyGPT returns non-streaming response with status 200
- **THEN** handler extracts usage from response
- **AND** forwards response body directly to client without modification

## REMOVED Requirements

### Requirement: Response JSON Transformation
**Reason**: OhmyGPT is an external service that already handles response formatting. No transformation needed.
**Migration**: Remove cleanNulls function and all JSON modification logic.

### Requirement: Anthropic Endpoint Support
**Reason**: OhmyGPT only supports OpenAI format (/v1/chat/completions). Anthropic endpoint returns 503.
**Migration**: Remove ForwardMessagesRequest function and related code.
