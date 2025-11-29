# Spec Delta: GoProxy TrollLLM Branding

## MODIFIED Requirements

### Requirement: TrollOpenAI Request Transformation
The GoProxy SHALL use TrollOpenAI-branded type names and functions for request transformation.

#### Scenario: Transform OpenAI request to TrollOpenAI format
- **WHEN** an OpenAI format request is received
- **THEN** the system SHALL use `TransformToTrollOpenAI()` function
- **AND** create a `TrollOpenAIRequest` struct
- **AND** populate `TrollOpenAIMessage` array

### Requirement: TrollOpenAI Response Transformation  
The GoProxy SHALL use TrollOpenAI-branded transformer for response handling.

#### Scenario: Create response transformer
- **WHEN** processing upstream API response
- **THEN** the system SHALL use `NewTrollOpenAIResponseTransformer()` function
- **AND** return a `TrollOpenAIResponseTransformer` instance

#### Scenario: Transform non-stream response
- **WHEN** a non-streaming response is received
- **THEN** the `TrollOpenAIResponseTransformer` SHALL parse the response
- **AND** convert to OpenAI format

### Requirement: TrollKey Pool Management
The GoProxy SHALL use TrollKey naming for upstream API key management.

#### Scenario: Load TrollKeys from database
- **WHEN** the server starts
- **THEN** the system SHALL load keys from `troll_keys` collection
- **AND** store them as `TrollKey` structs
- **AND** track status using `TrollKeyStatus` enum

#### Scenario: Select TrollKey for request
- **WHEN** a request needs an upstream API key
- **THEN** the system SHALL use `trollKeyPool` to select a healthy key
- **AND** store the key ID as `trollKeyID`

### Requirement: TrollLLM Environment Configuration
The GoProxy SHALL use TROLL_API_KEY environment variable for default upstream API key.

#### Scenario: Load default API key from environment
- **WHEN** no proxy pool is configured
- **THEN** the system SHALL read `TROLL_API_KEY` environment variable
- **AND** use it as the default upstream API key
