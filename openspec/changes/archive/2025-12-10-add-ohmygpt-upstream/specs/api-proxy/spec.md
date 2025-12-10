## ADDED Requirements

### Requirement: TrollProxy Module
The system SHALL provide a unified `TrollProxy` module (`goproxy/internal/trollproxy/`) for managing reverse proxy upstream providers.

#### Scenario: TrollProxy module initialization
- **WHEN** the server starts
- **THEN** TrollProxy module SHALL be initialized
- **AND** registered providers SHALL be configured based on environment variables

#### Scenario: Provider registration
- **WHEN** a new upstream provider is added to TrollProxy
- **THEN** it SHALL implement the Provider interface
- **AND** be registered with a unique name (e.g., "ohmygpt")

#### Scenario: Provider lookup
- **WHEN** a request needs to be routed to a TrollProxy provider
- **THEN** the system SHALL lookup the provider by name via `GetProvider(name)`
- **AND** return the configured provider or nil if not found

---

### Requirement: OhmyGPT Upstream Provider
The system SHALL support OhmyGPT as an upstream provider for Claude models via TrollProxy, routing requests to `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg`.

#### Scenario: Model routed to OhmyGPT upstream
- **WHEN** a request is made with a model configured with `upstream: "ohmygpt"`
- **THEN** the system SHALL route the request via TrollProxy to OhmyGPT endpoint
- **AND** use `OHMYGPT_API_KEY` for authentication
- **AND** billing SHALL be calculated using the same pricing and multiplier as other upstreams

#### Scenario: OhmyGPT streaming request
- **WHEN** a streaming request is sent to a model with `upstream: "ohmygpt"`
- **THEN** the system SHALL forward SSE events from OhmyGPT to client
- **AND** extract usage tokens from stream for billing

#### Scenario: OhmyGPT non-streaming request
- **WHEN** a non-streaming request is sent to a model with `upstream: "ohmygpt"`
- **THEN** the system SHALL forward complete response from OhmyGPT
- **AND** extract usage tokens from response for billing

#### Scenario: OhmyGPT not configured fallback
- **WHEN** a model is configured with `upstream: "ohmygpt"`
- **AND** `OHMYGPT_API_KEY` is not set
- **THEN** the system SHALL return HTTP 500 with error "OhmyGPT not configured"

#### Scenario: OhmyGPT error sanitization
- **WHEN** OhmyGPT returns an error response (4xx or 5xx)
- **THEN** the system SHALL sanitize the error to hide upstream details
- **AND** log the original error server-side for debugging

---

### Requirement: OhmyGPT Configuration
The system SHALL support configuration of OhmyGPT via environment variables.

#### Scenario: OhmyGPT environment configuration
- **WHEN** the server starts with `OHMYGPT_API_KEY` environment variable set
- **THEN** TrollProxy SHALL configure OhmyGPT provider with the provided API key
- **AND** log successful configuration at startup

#### Scenario: OhmyGPT endpoint is fixed
- **WHEN** OhmyGPT provider is configured
- **THEN** the endpoint SHALL be `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg`
- **AND** requests SHALL use POST method with JSON body

---

## MODIFIED Requirements

### Requirement: Model-Based Upstream Routing
The system SHALL route API requests to different upstream providers based on the requested model.

#### Scenario: Sonnet 4.5 routed to Main Target
- **WHEN** a request is made with model `claude-sonnet-4-5-20250929`
- **THEN** the system SHALL route the request to `MAIN_TARGET_SERVER` endpoint
- **AND** use `MAIN_UPSTREAM_KEY` for authentication
- **AND** billing SHALL be calculated using the same pricing and multiplier

#### Scenario: Haiku 4.5 routed to Main Target
- **WHEN** a request is made with model `claude-haiku-4-5-20251001`
- **THEN** the system SHALL route the request to `MAIN_TARGET_SERVER` endpoint
- **AND** use `MAIN_UPSTREAM_KEY` for authentication
- **AND** billing SHALL be calculated using the same pricing and multiplier

#### Scenario: Opus 4.5 routed to Troll Key
- **WHEN** a request is made with model `claude-opus-4-5-20251101`
- **THEN** the system SHALL route the request to Factory AI (troll-key pool)
- **AND** use existing proxy pool and troll-key rotation
- **AND** billing SHALL be calculated using the same pricing and multiplier

#### Scenario: Model routed to OhmyGPT
- **WHEN** a request is made with a model configured with `upstream: "ohmygpt"`
- **THEN** the system SHALL route the request to OhmyGPT endpoint
- **AND** use `OHMYGPT_API_KEY` for authentication
- **AND** billing SHALL be calculated using the same pricing and multiplier

#### Scenario: Fallback to Troll Key for unknown upstream
- **WHEN** a model has no `upstream` configuration
- **THEN** the system SHALL default to using Troll Key (Factory AI)

---

### Requirement: Upstream Configuration
The system SHALL support configuration of multiple upstream providers per model.

#### Scenario: Model config includes upstream field
- **WHEN** a model is defined in `config.json`
- **THEN** the model MAY include an `upstream` field with value `troll`, `main`, or `ohmygpt`
- **AND** `troll` indicates Factory AI via troll-key pool
- **AND** `main` indicates external provider via `MAIN_TARGET_SERVER`
- **AND** `ohmygpt` indicates OhmyGPT provider via `OHMYGPT_API_KEY`

#### Scenario: Main Target endpoint configuration
- **WHEN** `MAIN_TARGET_SERVER` environment variable is set
- **THEN** the system SHALL use this URL as the base endpoint for `main` upstream
- **AND** append `/v1/messages` path for Anthropic requests

#### Scenario: Main Upstream Key configuration
- **WHEN** `MAIN_UPSTREAM_KEY` environment variable is set
- **THEN** the system SHALL use this key for authentication with Main Target
- **AND** key SHALL be sent as `Bearer` token in Authorization header

#### Scenario: OhmyGPT endpoint configuration
- **WHEN** `OHMYGPT_API_KEY` environment variable is set
- **THEN** the system SHALL use this key for authentication with OhmyGPT
- **AND** endpoint SHALL be fixed to `https://apic1.ohmycdn.com/api/v1/ai/openai/cc-omg`

---

### Requirement: Upstream Selection Logging
The system SHALL log upstream selection for debugging and monitoring.

#### Scenario: Log upstream selection
- **WHEN** a request is routed to an upstream provider
- **THEN** the system SHALL log which upstream was selected (`main`, `troll`, or `ohmygpt`)
- **AND** include model ID in the log message
