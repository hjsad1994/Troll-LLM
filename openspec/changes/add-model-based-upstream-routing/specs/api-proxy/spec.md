## ADDED Requirements

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

#### Scenario: Fallback to Troll Key for unknown upstream
- **WHEN** a model has no `upstream` configuration
- **THEN** the system SHALL default to using Troll Key (Factory AI)

---

### Requirement: Upstream Configuration
The system SHALL support configuration of multiple upstream providers per model.

#### Scenario: Model config includes upstream field
- **WHEN** a model is defined in `config.json`
- **THEN** the model MAY include an `upstream` field with value `troll` or `main`
- **AND** `troll` indicates Factory AI via troll-key pool
- **AND** `main` indicates external provider via `MAIN_TARGET_SERVER`

#### Scenario: Main Target endpoint configuration
- **WHEN** `MAIN_TARGET_SERVER` environment variable is set
- **THEN** the system SHALL use this URL as the base endpoint for `main` upstream
- **AND** append `/v1/messages` path for Anthropic requests

#### Scenario: Main Upstream Key configuration
- **WHEN** `MAIN_UPSTREAM_KEY` environment variable is set
- **THEN** the system SHALL use this key for authentication with Main Target
- **AND** key SHALL be sent as `Bearer` token in Authorization header

---

### Requirement: Upstream Selection Logging
The system SHALL log upstream selection for debugging and monitoring.

#### Scenario: Log upstream selection
- **WHEN** a request is routed to an upstream provider
- **THEN** the system SHALL log which upstream was selected (`main` or `troll`)
- **AND** include model ID in the log message

## MODIFIED Requirements

### Requirement: Proxy-Based Request Routing
The system SHALL route API requests through configured proxies using round-robin selection, with support for model-based upstream routing.

#### Scenario: Request routed through proxy with model-based upstream
- **WHEN** user sends chat request
- **AND** model is configured with `upstream: "main"`
- **THEN** system routes request to `MAIN_TARGET_SERVER` using `MAIN_UPSTREAM_KEY`
- **AND** does NOT use proxy pool for `main` upstream requests

#### Scenario: Request routed through proxy with troll upstream
- **WHEN** user sends chat request
- **AND** model is configured with `upstream: "troll"` or has no upstream config
- **THEN** system selects next proxy in round-robin order
- **AND** uses primary key bound to selected proxy
- **AND** routes request through proxy to Factory AI upstream

#### Scenario: Primary key rate limited
- **WHEN** request fails with 429 (rate limit) using primary key
- **AND** proxy has secondary key bound
- **THEN** system retries with secondary key on same proxy

#### Scenario: Both keys exhausted on proxy
- **WHEN** both primary and secondary keys on proxy return 429/402
- **THEN** system marks proxy as temporarily unhealthy
- **AND** selects next healthy proxy
- **AND** retries request

#### Scenario: All proxies exhausted
- **WHEN** all configured proxies are unhealthy or exhausted
- **THEN** system returns 503 Service Unavailable
- **AND** includes retry-after header

#### Scenario: No proxies configured (direct mode)
- **WHEN** no proxies are configured in database
- **AND** model uses `troll` upstream
- **THEN** system uses direct connection (existing behavior)
- **AND** uses keypool without proxy routing
