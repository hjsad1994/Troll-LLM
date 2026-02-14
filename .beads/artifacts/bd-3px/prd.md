# Prevent OpenHands Upstream Model Leakage in Client Responses

**Bead:** bd-3px  
**Created:** 2026-02-14  
**Status:** Draft

## Bead Metadata

```yaml
depends_on: []
parallel: true
conflicts_with: []
blocks: []
estimated_hours: 3
```

---

## Problem Statement

### What problem are we solving?

For OpenHands-routed Claude models (especially Sonnet/Opus), goproxy maps the requested model to upstream provider models (for example minimax/glm variants). In some response paths, clients can still observe upstream model identifiers in `model` metadata. This leaks internal routing and breaks the user expectation that the response model name matches the model they requested.

### Why now?

This behavior is visible in real client/tool usage and HTTP responses, causing confusion and trust issues. The routing indirection is intentional for backend operations, but the external API contract should remain stable and provider-agnostic.

### Who is affected?

- **Primary users:** API users calling OpenAI `/v1/chat/completions` and Anthropic `/v1/messages` through goproxy
- **Secondary users:** Operators and integrators who rely on consistent model identity in logs, SDK outputs, and tool metadata

---

## Scope

### In-Scope

- Ensure client-visible `model` always matches the requested Sonnet/Opus model identity for OpenHands-routed traffic
- Cover both API surfaces: OpenAI chat completions and Anthropic messages
- Preserve existing upstream routing (`upstream_model_id`, weighted selection) without exposing upstream IDs to clients
- Add/extend tests that guard against future model-name leakage regressions

### Out-of-Scope

- Changing pricing, billing, or credit-deduction behavior
- Changing upstream selection policy or model weights in config
- Rewriting unrelated response metadata fields (`id`, `system_fingerprint`, provider headers)
- Broad refactors outside OpenHands model-name masking behavior

---

## Proposed Solution

### Overview

Treat requested model ID as the canonical client-facing identity across the full request lifecycle. Continue mapping to upstream model IDs for forwarding, but enforce response-side masking so all returned `model` values on supported paths reflect the user-requested model (including Sonnet/Opus aliases resolved by config). Implement this consistently for both streaming and non-streaming responses on OpenAI and Anthropic APIs.

### User Flow

1. Client requests `claude-sonnet-*` or `claude-opus-*`
2. Proxy resolves and forwards to upstream mapped model (minimax/glm) as internal routing detail
3. Proxy returns response where `model` remains the requested client-facing model ID
4. Client/tools do not observe upstream fake/internal model identifiers

---

## Requirements

### Functional Requirements

#### FR1: Canonical client model identity is preserved

Client responses must return requested model identity, even when upstream model differs.

**Scenarios:**

- **WHEN** request model is Sonnet/Opus and upstream is mapped to minimax/glm **THEN** response `model` equals requested model identity
- **WHEN** request uses model alias (for example `claude-sonnet-4-5`) **THEN** response `model` uses resolved user-facing model identity consistently

#### FR2: OpenAI API path remains masked in all response modes

All OpenAI responses for OpenHands-routed requests must mask upstream model names.

**Scenarios:**

- **WHEN** `/v1/chat/completions` is streaming **THEN** each chunk containing `model` uses client-facing model
- **WHEN** `/v1/chat/completions` is non-streaming **THEN** response JSON `model` uses client-facing model

#### FR3: Anthropic API path also masks upstream model identity

Anthropic message responses must not leak upstream model IDs.

**Scenarios:**

- **WHEN** `/v1/messages` returns non-stream response with `model` field **THEN** returned model is client-facing model
- **WHEN** `/v1/messages` streams events that include model metadata **THEN** model metadata does not expose upstream model IDs

### Non-Functional Requirements

- **Performance:** Response masking adds negligible overhead and must not materially increase latency
- **Reliability:** If parsing/transformation fails, service should degrade gracefully without crashing request handling
- **Compatibility:** Keep existing OpenAI/Anthropic response formats and streaming semantics unchanged except model-name masking

---

## Success Criteria

- [ ] OpenAI streaming responses for Sonnet/Opus never expose minimax/glm IDs in `model`
  - Verify: `cd goproxy && go test ./internal/maintarget -run TestHandleOpenAIStreamResponse_RewritesModel -v`
- [ ] OpenAI non-stream responses for Sonnet/Opus return requested model identity
  - Verify: `cd goproxy && go test ./internal/maintarget -run TestHandleOpenAINonStreamResponse_RewritesModel -v`
- [ ] Anthropic messages path has regression test coverage for model-name masking
  - Verify: `cd goproxy && go test ./internal/openhands/... -v`
- [ ] Full goproxy test suite passes with masking behavior intact
  - Verify: `cd goproxy && go test ./...`
- [ ] goproxy builds successfully after changes
  - Verify: `cd goproxy && go build -o /dev/null .`

---

## Technical Context

### Existing Patterns

- `goproxy/internal/maintarget/handler.go` already rewrites OpenAI `model` in `HandleOpenAIStreamResponse` and `HandleOpenAINonStreamResponse`
- `goproxy/internal/maintarget/handler.go` currently passes through generic stream/non-stream responses (`HandleStreamResponseWithPrefix`, `HandleNonStreamResponseWithPrefix`) without model rewriting
- `goproxy/main.go` OpenHands handlers map request model to upstream model before forwarding
- `goproxy/config/config.go` resolves aliases via `GetModelByID` and upstream IDs via `GetUpstreamModelID`

### Key Files

- `goproxy/main.go` - OpenHands request handling and response handler wiring for both `/v1/chat/completions` and `/v1/messages`
- `goproxy/internal/maintarget/handler.go` - Response streaming/non-streaming handling and model rewrite logic
- `goproxy/internal/maintarget/handler_test.go` - Existing OpenAI masking tests to extend or mirror
- `goproxy/internal/openhands/` - OpenHands-specific tests and response behavior coverage
- `goproxy/config/config.go` - Canonical model/alias/upstream mapping helpers
- `goproxy/config-openhands-prod.json` - Active Sonnet/Opus upstream mapping to minimax/glm variants

### Affected Files

Files this bead will modify:

```yaml
files:
  - goproxy/main.go # Ensure canonical client model ID is propagated through all OpenHands response paths
  - goproxy/internal/maintarget/handler.go # Add/extend response-side model masking where leakage can occur
  - goproxy/internal/maintarget/handler_test.go # Extend model-masking unit tests
  - goproxy/internal/openhands/anthropic_error_test.go # Add Anthropic path coverage if model masking lands in OpenHands path
  - goproxy/internal/openhands/types_test.go # Add parsing/sanitization edge-case tests if applicable
```

---

## Risks & Mitigations

| Risk                                                                         | Likelihood | Impact | Mitigation                                                                  |
| ---------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------- |
| Anthropic stream event format differences make model rewrite brittle         | Medium     | Medium | Add format-aware tests and fall back to passthrough when event cannot parse |
| Masking applied too broadly changes unrelated providers                      | Low        | Medium | Scope change to OpenHands-routed flows and verify existing provider tests   |
| Alias/resolved ID mismatch causes inconsistent model names in some responses | Medium     | Medium | Use canonical resolved model ID from config path as single output source    |

---

## Open Questions

| Question                                                                             | Owner       | Due Date      | Status |
| ------------------------------------------------------------------------------------ | ----------- | ------------- | ------ |
| Should client-facing model always use canonical resolved ID vs alias used by caller? | huynhgiabuu | Before /start | Open   |

---

## Tasks

### Propagate canonical client model ID through OpenHands handlers [backend]

OpenHands request handlers consistently compute and pass one canonical client-facing model ID into all downstream response writers for both OpenAI and Anthropic paths.

**Metadata:**

```yaml
depends_on: []
parallel: false
conflicts_with: []
files:
  - goproxy/main.go
  - goproxy/config/config.go
```

**Verification:**

- `cd goproxy && go build -o /dev/null .`
- `cd goproxy && go test ./...`

### Enforce model-name masking in leak-prone response paths [backend]

Any OpenHands response path that can return upstream model names (especially Anthropic passthrough and shared handlers) rewrites client-visible `model` to the canonical requested identity.

**Metadata:**

```yaml
depends_on: ["Propagate canonical client model ID through OpenHands handlers"]
parallel: false
conflicts_with: []
files:
  - goproxy/internal/maintarget/handler.go
  - goproxy/main.go
```

**Verification:**

- `cd goproxy && go test ./internal/maintarget/... -v`
- `cd goproxy && go test ./internal/openhands/... -v`

### Add regression tests for OpenHands Sonnet/Opus model identity [test]

Automated tests fail if Sonnet/Opus requests ever return minimax/glm model names on either API surface.

**Metadata:**

```yaml
depends_on: ["Enforce model-name masking in leak-prone response paths"]
parallel: false
conflicts_with: []
files:
  - goproxy/internal/maintarget/handler_test.go
  - goproxy/internal/openhands/anthropic_error_test.go
  - goproxy/internal/openhands/types_test.go
```

**Verification:**

- `cd goproxy && go test ./internal/maintarget/... -v`
- `cd goproxy && go test ./internal/openhands/... -v`

### End-to-end validation for both APIs [test]

Manual and automated checks confirm that OpenAI and Anthropic responses expose only requested Sonnet/Opus model identity while upstream routing remains unchanged.

**Metadata:**

```yaml
depends_on: ["Add regression tests for OpenHands Sonnet/Opus model identity"]
parallel: false
conflicts_with: []
files: []
```

**Verification:**

- `cd goproxy && go test ./...`
- `cd goproxy && go build -o /dev/null .`
- `curl -sS http://localhost:8004/v1/chat/completions -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"model":"claude-sonnet-4-5-20250929","messages":[{"role":"user","content":"hi"}],"stream":false}' | jq -r '.model'`
- `curl -sS http://localhost:8004/v1/messages -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"model":"claude-opus-4-5-20251101","max_tokens":128,"messages":[{"role":"user","content":"hi"}]}' | jq -r '.model'`

---

## Notes

- `goproxy/config-openhands-prod.json` intentionally maps Claude Sonnet/Opus IDs to upstream minimax variants; this remains unchanged
- This bead is contract-focused: preserve external model identity while keeping internal routing flexibility
