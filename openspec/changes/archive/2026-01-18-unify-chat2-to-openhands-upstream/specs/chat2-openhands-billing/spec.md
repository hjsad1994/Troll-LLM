# chat2-openhands-billing Specification

## Purpose

Define billing behavior for chat2.trollllm.xyz endpoint when using OpenHands upstream but deducting from the legacy `credits` field instead of `creditsNew`.

## MODIFIED Requirements

### Requirement: Upstream-Specific Billing Routing

The GoProxy billing system SHALL support independent configuration of upstream provider and credit field selection, allowing different domains to use the same upstream while billing to different credit fields.

**Context**: This requirement is being modified to clarify that upstream provider and credit field selection are independent concerns.

**Changes**:
- Add explicit scenario for chat2 domain using OpenHands upstream with `credits` field
- Clarify that `billing_upstream` configuration controls credit field selection, not upstream provider

#### Scenario: chat2.trollllm.xyz requests use OpenHands upstream with credits field
- **WHEN** a request is received on chat2.trollllm.xyz endpoint (goproxy-ohmygpt container, port 8005)
- **AND** the model configuration uses OpenHands upstream endpoints
- **AND** the model's `billing_upstream` is configured as "ohmygpt" (indicating `credits` field usage)
- **THEN** the request SHALL be routed to OpenHands upstream API
- **AND** the billing system SHALL deduct token costs from the user's `credits` balance (NOT `creditsNew`)
- **AND** the billing system SHALL increment the user's `creditsUsed` field with token usage
- **AND** the request SHALL be rejected if `credits` + `refCredits` balance is insufficient
- **AND** logs SHALL indicate "Billing upstream: OhMyGPT" (referring to credit field, not upstream provider)
- **AND** logs SHALL indicate the request was sent to OpenHands upstream

#### Scenario: chat.trollllm.xyz continues using creditsNew field
- **WHEN** a request is received on chat.trollllm.xyz endpoint (goproxy-openhands container, port 8004)
- **AND** the model configuration uses OpenHands upstream endpoints
- **AND** the model's `billing_upstream` is configured as "openhands"
- **THEN** the request SHALL be routed to OpenHands upstream API
- **AND** the billing system SHALL deduct token costs from the user's `creditsNew` balance
- **AND** the billing system SHALL increment the user's `tokensUserNew` field
- **AND** the request SHALL be rejected if `creditsNew` balance is insufficient
- **AND** logs SHALL indicate "Billing upstream: OpenHands"

#### Scenario: Both domains share same OpenHands upstream configuration
- **WHEN** both goproxy-openhands and goproxy-ohmygpt containers are configured
- **THEN** both SHALL use identical OpenHands upstream endpoints (base URLs, API keys)
- **AND** the only difference SHALL be the credit field selection based on `billing_upstream` config
- **AND** both SHALL apply the same billing_multiplier for OpenHands models
- **AND** both SHALL use the same model pricing (input/output/cache token prices)

### Requirement: Billing Function Naming Clarification

The Go proxy billing functions SHALL use names that reflect the credit field they operate on, independent of the upstream provider that handles the request.

**Context**: Function names like `DeductCreditsOhMyGPT()` refer to the credit field they use, not the upstream provider.

#### Scenario: DeductCreditsOhMyGPT function usage
- **WHEN** the Go proxy determines billing deduction for a request
- **AND** the `billing_upstream` configuration is "ohmygpt"
- **THEN** the proxy SHALL call `DeductCreditsOhMyGPT()` function
- **AND** this function SHALL deduct from `credits` field (and `refCredits` if needed)
- **AND** this SHALL occur regardless of which upstream provider handles the request (OpenHands, OhMyGPT, etc.)
- **AND** code comments SHALL clarify that function name refers to credit field, not upstream provider

#### Scenario: DeductCreditsOpenHands function usage
- **WHEN** the Go proxy determines billing deduction for a request
- **AND** the `billing_upstream` configuration is "openhands"
- **THEN** the proxy SHALL call `DeductCreditsOpenHands()` function
- **AND** this function SHALL deduct from `creditsNew` field
- **AND** this SHALL occur regardless of which upstream provider handles the request
- **AND** code comments SHALL clarify that function name refers to credit field, not upstream provider

## ADDED Requirements

### Requirement: chat2 Domain Configuration for OpenHands Upstream

The goproxy-ohmygpt container (serving chat2.trollllm.xyz) SHALL be configured to use OpenHands upstream while maintaining `credits` field billing.

#### Scenario: Configure chat2 with OpenHands endpoints
- **WHEN** the goproxy-ohmygpt container starts with config-ohmygpt-prod.json
- **THEN** the config file SHALL define OpenHands endpoints:
  - `openhands-openai`: `https://llm-proxy.app.all-hands.dev/v1/chat/completions`
  - `openhands-anthropic`: `https://llm-proxy.app.all-hands.dev/v1/messages`
- **AND** endpoint names MAY retain "ohmygpt" prefix for backward compatibility
- **AND** base URLs SHALL point to OpenHands upstream
- **AND** models SHALL configure `billing_upstream: "ohmygpt"` to use `credits` field
- **AND** comments SHALL clarify: "Uses OpenHands upstream but deducts from credits field (for chat2 domain)"

#### Scenario: Configure identical OpenHands models for chat2
- **WHEN** defining models in config-ohmygpt-prod.json for chat2 endpoint
- **THEN** the model list SHALL include the same OpenHands models as config-openhands-prod.json
- **AND** model pricing SHALL match exactly (input_price_per_mtok, output_price_per_mtok, etc.)
- **AND** billing_multiplier SHALL match the OpenHands configuration (1.1)
- **AND** `upstream` field SHALL be "openhands" (provider)
- **AND** `billing_upstream` SHALL be "ohmygpt" (credit field selector)
- **AND** `type` field SHOULD be "ohmygpt" for consistency with billing_upstream

#### Scenario: User agent consistency for OpenHands
- **WHEN** both goproxy containers send requests to OpenHands upstream
- **THEN** both SHALL use the same User-Agent header value
- **AND** the User-Agent SHALL be "openhands-cli/1.0.0" or similar
- **AND** this ensures OpenHands treats requests from both domains identically

### Requirement: Configuration Documentation via Comments

All configuration files involved in the chat2 → OpenHands migration SHALL include comments explaining the routing and billing logic.

#### Scenario: Config file comments explain credit field mapping
- **WHEN** a developer or operator reviews config-ohmygpt-prod.json
- **THEN** the file SHALL include a header comment explaining:
  - "This config serves chat2.trollllm.xyz (port 8005)"
  - "Uses OpenHands upstream but deducts from 'credits' field (not creditsNew)"
  - "billing_upstream='ohmygpt' means use credits field, NOT the upstream provider name"
- **AND** the config-openhands-prod.json SHALL include a similar header:
  - "This config serves chat.trollllm.xyz (port 8004)"
  - "Uses OpenHands upstream and deducts from 'creditsNew' field"

#### Scenario: Nginx config comments clarify routing
- **WHEN** reviewing nginx.conf server blocks for chat and chat2 domains
- **THEN** the chat2.trollllm.xyz server block SHALL include a comment:
  - "# Proxies to goproxy-ohmygpt:8005 (OpenHands upstream, deducts from 'credits' field)"
- **AND** the chat.trollllm.xyz server block SHALL include a comment:
  - "# Proxies to goproxy-openhands:8004 (OpenHands upstream, deducts from 'creditsNew' field)"

#### Scenario: Docker Compose comments document container purposes
- **WHEN** reviewing docker-compose.prod.yml service definitions
- **THEN** the goproxy-ohmygpt service SHALL include a comment:
  - "# Serves chat2.trollllm.xyz - Uses OpenHands upstream but bills to 'credits' field"
- **AND** the goproxy-openhands service SHALL include a comment:
  - "# Serves chat.trollllm.xyz - Uses OpenHands upstream and bills to 'creditsNew' field"

#### Scenario: Go code comments explain billing function behavior
- **WHEN** reviewing internal/usage/tracker.go billing functions
- **THEN** the `DeductCreditsOhMyGPT()` function SHALL include a comment:
  - "// DeductCreditsOhMyGPT deducts from 'credits' field (legacy pool). Function name refers to credit field, not upstream provider. Used by chat2.trollllm.xyz with OpenHands upstream."
- **AND** the `DeductCreditsOpenHands()` function SHALL include a comment:
  - "// DeductCreditsOpenHands deducts from 'creditsNew' field. Function name refers to credit field. Used by chat.trollllm.xyz with OpenHands upstream."

### Requirement: Request Logging for Dual-Domain OpenHands Usage

Request logs SHALL clearly identify which credit field was used for billing when both domains use the same upstream.

#### Scenario: Log entries distinguish credit field usage
- **WHEN** a request is processed and logged
- **AND** the request used OpenHands upstream
- **THEN** the log entry SHALL include a field indicating which credit field was debited
- **AND** logs SHALL use consistent naming:
  - "💰 [username] Deducted $X.XX from credits" (for chat2 domain)
  - "💰 [OpenHands] [username] Deducted $X.XX from creditsNew" (for chat domain)
- **AND** the log prefix SHALL help operators identify which domain/container generated the log

#### Scenario: Billing logs mention upstream and credit field
- **WHEN** the Go proxy logs billing information
- **THEN** logs SHALL include both the upstream provider name and credit field
- **EXAMPLE**: "Billing upstream: OhMyGPT (credits field), Request upstream: OpenHands"
- **AND** this SHALL prevent confusion about which upstream actually received the request

## REMOVED Requirements

None - this change adds new scenarios and clarifications without removing existing functionality.
