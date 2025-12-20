# documentation Specification

## Purpose
TBD - created by archiving change update-quickstart-to-requests. Update Purpose after archive.
## Requirements
### Requirement: Bilingual Documentation Support

The quickstart documentation SHALL support both English and Vietnamese languages.

#### Scenario: English language support
- **WHEN** a user views the quickstart page with English language selected
- **THEN** all instructional text SHALL be displayed in English
- **AND** code examples SHALL remain in their original programming language

#### Scenario: Vietnamese language support
- **WHEN** a user views the quickstart page with Vietnamese language selected
- **THEN** all instructional text SHALL be displayed in Vietnamese
- **AND** code examples SHALL remain in their original programming language

### Requirement: Direct HTTP Request Examples

The quickstart documentation SHALL provide code examples using direct HTTP request libraries instead of official LLM provider SDKs.

#### Scenario: Python example uses requests library
- **WHEN** a user views the Python code example for OpenAI format
- **THEN** the example SHALL use the `requests` library to make HTTP POST requests
- **AND** the example SHALL NOT import or use the `openai` package

#### Scenario: Python example uses requests for Anthropic format
- **WHEN** a user views the Python code example for Anthropic format
- **THEN** the example SHALL use the `requests` library to make HTTP POST requests
- **AND** the example SHALL NOT import or use the `anthropic` package

#### Scenario: JavaScript example uses fetch API
- **WHEN** a user views the JavaScript code example for OpenAI format
- **THEN** the example SHALL use the native `fetch` API to make HTTP POST requests
- **AND** the example SHALL NOT import or use the `openai` npm package

#### Scenario: JavaScript example uses fetch for Anthropic format
- **WHEN** a user views the JavaScript code example for Anthropic format
- **THEN** the example SHALL use the native `fetch` API to make HTTP POST requests
- **AND** the example SHALL NOT import or use the `@anthropic-ai/sdk` npm package

### Requirement: Simplified Environment Variables

The quickstart documentation SHALL guide users to use a single API key environment variable.

#### Scenario: API key environment variable
- **WHEN** a user sets up environment variables
- **THEN** the documentation SHALL recommend using `TROLLLLM_API_KEY` as the primary variable name
- **AND** the documentation SHALL NOT require SDK-specific variables like `OPENAI_BASE_URL` or `ANTHROPIC_BASE_URL`

### Requirement: API Endpoint Configuration

The quickstart documentation SHALL clearly specify the TrollLLM API endpoints for each format.

#### Scenario: OpenAI format endpoint
- **WHEN** a user makes a request using OpenAI format
- **THEN** the base URL SHALL be `https://chat.trollllm.xyz/v1`
- **AND** the chat completions endpoint SHALL be `https://chat.trollllm.xyz/v1/chat/completions`

#### Scenario: Anthropic format endpoint
- **WHEN** a user makes a request using Anthropic format
- **THEN** the messages endpoint SHALL be `https://chat.trollllm.xyz/v1/messages`
- **AND** the request SHALL include `anthropic-version: 2023-06-01` header

### Requirement: Authentication Header

The quickstart documentation SHALL show the correct authentication header format.

#### Scenario: OpenAI format authentication
- **WHEN** a user authenticates with OpenAI format
- **THEN** the example SHALL use `Authorization: Bearer <api-key>` header

#### Scenario: Anthropic format authentication
- **WHEN** a user authenticates with Anthropic format
- **THEN** the example SHALL use `x-api-key: <api-key>` header

