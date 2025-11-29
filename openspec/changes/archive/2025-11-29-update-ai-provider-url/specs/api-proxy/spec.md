## ADDED Requirements

### Requirement: Public API Endpoint Documentation
The system SHALL document `https://chat.trollllm.xyz` as the primary LLM API endpoint for all client integrations.

#### Scenario: OpenAI SDK Configuration
- **WHEN** user configures OpenAI SDK
- **THEN** base_url SHALL be `https://chat.trollllm.xyz/v1`

#### Scenario: Anthropic SDK Configuration
- **WHEN** user configures Anthropic SDK
- **THEN** base_url SHALL be `https://chat.trollllm.xyz`

#### Scenario: Direct API Calls
- **WHEN** user makes direct curl/HTTP requests
- **THEN** endpoint SHALL be `https://chat.trollllm.xyz/v1/chat/completions` for OpenAI format
- **AND** endpoint SHALL be `https://chat.trollllm.xyz/v1/messages` for Anthropic format
