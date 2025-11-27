## MODIFIED Requirements

### Requirement: Request Logging
The proxy SHALL log all API requests to enable usage tracking and analytics for both User Keys and Factory Keys.

#### Scenario: Log successful request with usage update
- **GIVEN** a valid user key and factory key
- **WHEN** an API request completes successfully
- **THEN** the request is logged to request_logs collection
- **AND** the user key's tokensUsed and requestsCount are incremented
- **AND** the factory key's tokensUsed and requestsCount are incremented

#### Scenario: Log failed request
- **GIVEN** a valid user key and factory key
- **WHEN** an API request fails (4xx/5xx)
- **THEN** the request is logged with isSuccess=false
- **AND** the factory key's requestsCount is incremented
