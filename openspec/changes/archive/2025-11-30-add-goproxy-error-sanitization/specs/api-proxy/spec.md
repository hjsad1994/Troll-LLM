## ADDED Requirements

### Requirement: Upstream Error Sanitization
The system SHALL sanitize error responses from upstream providers before returning them to clients, preventing exposure of sensitive backend infrastructure details.

#### Scenario: Sanitize 402 Payment Required error
- **WHEN** upstream returns HTTP 402 with details like `{"detail":"Ready for more? Reload your tokens at https://app.factory.ai/settings/billing...","requestId":"..."}`
- **THEN** the system SHALL log original error server-side for debugging
- **AND** return sanitized response `{"error":{"message":"Payment required","type":"payment_error"}}` to client
- **AND** NOT expose upstream URLs, request IDs, or billing links

#### Scenario: Sanitize 429 Rate Limit error
- **WHEN** upstream returns HTTP 429 with provider-specific details
- **THEN** the system SHALL return sanitized response `{"error":{"message":"Rate limit exceeded","type":"rate_limit_error"}}`
- **AND** NOT expose upstream rate limit details or retry hints

#### Scenario: Sanitize 401 Authentication error
- **WHEN** upstream returns HTTP 401 with authentication details
- **THEN** the system SHALL return sanitized response `{"error":{"message":"Authentication failed","type":"authentication_error"}}`
- **AND** NOT expose upstream authentication mechanism details

#### Scenario: Sanitize 5xx Server errors
- **WHEN** upstream returns HTTP 500, 502, 503, or 504
- **THEN** the system SHALL return sanitized response `{"error":{"message":"Upstream service unavailable","type":"server_error"}}`
- **AND** NOT expose upstream server details or stack traces

#### Scenario: Sanitize Anthropic format errors
- **WHEN** upstream returns error in Anthropic format and client expects Anthropic format
- **THEN** the system SHALL return sanitized response in Anthropic format: `{"type":"error","error":{"type":"<error_type>","message":"<generic_message>"}}`

#### Scenario: Server-side error logging
- **WHEN** any upstream error is sanitized
- **THEN** the original error response SHALL be logged with prefix `🔒 [Handler] Original error (hidden):`
- **AND** include full upstream response body for debugging
