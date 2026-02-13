# OpenHands Model Alias Masking in Responses

**Bead:** bd-28i  
**Created:** 2026-02-13  
**Status:** Draft

## Bead Metadata

```yaml
depends_on: []
parallel: true
conflicts_with: ["bd-15k"]
blocks: []
estimated_hours: 2
```

---

## Problem Statement

### What problem are we solving?

When clients request public model IDs in OpenHands production config (including Opus, Sonnet, and Haiku variants), responses can still expose upstream model IDs (for example `claude-sonnet-4-5-20250929` or `minimax-m2.5`). This leaks internal routing strategy, breaks the expected API contract, and confuses users because returned `model` does not match the client request.

### Why now?

The issue is already user-visible in OpenHands production traffic. If not fixed, users continue seeing internal model names and cannot trust model identity in responses, especially for Anthropic flows with thinking/caching where transparency of the external contract matters for billing trust.

### Who is affected?

- **Primary users:** API clients calling goproxy OpenHands endpoints (`/v1/messages`, `/v1/chat/completions`) with public model aliases.
- **Secondary users:** Operators and support engineers investigating billing/model complaints caused by mismatched request/response model IDs.

---

## Scope

### In-Scope

- Ensure response `model` field always returns the client-requested model ID for all OpenHands models in `config-openhands-prod.json`.
- Cover both Anthropic and OpenAI API surfaces.
- Cover both stream and non-stream responses.
- Preserve existing routing and billing behavior while changing only response-model masking behavior.

### Out-of-Scope

- Changing model pricing, billing multipliers, or credit deduction logic.
- Introducing new model aliases or changing upstream routing weights in config.
- Refactoring non-OpenHands providers beyond what is required for consistent masking behavior.

---

## Proposed Solution

### Overview

Establish a single response-model contract: the `model` returned to clients must equal the requested model ID resolved by goproxy, not the raw upstream provider model. Apply this consistently in OpenHands request handlers and response transformers for both streaming and non-streaming flows so all emitted chunks/final payloads are masked to the external model identity.

### User Flow

1. Client requests any OpenHands public model ID from config (e.g. `claude-opus-4-6`, `claude-opus-4-5-20251101`, `claude-sonnet-4-5-20250929`, `claude-haiku-4-5-20251001`, or aliases).
2. goproxy may route upstream to different provider model IDs based on weighted `upstream_model_id` mapping.
3. Client still receives response/chunks with `model` equal to the originally requested model ID.

---

## Requirements

### Functional Requirements

#### FR1: Response model equals requested model for OpenHands

All OpenHands responses must expose the external requested model ID rather than upstream model ID.

**Scenarios:**

- **WHEN** a request uses a model alias that maps to another upstream model **THEN** response `model` equals the requested alias.
- **WHEN** upstream provider returns a different model identifier **THEN** goproxy rewrites/masks it before returning to client.
- **WHEN** request model is any configured OpenHands model ID in `config-openhands-prod.json` **THEN** response `model` equals that exact requested model ID.

#### FR2: Anthropic and OpenAI parity

Masking behavior must be identical for Anthropic (`/v1/messages`) and OpenAI (`/v1/chat/completions`) APIs.

**Scenarios:**

- **WHEN** client calls `/v1/messages` **THEN** final Anthropic/OpenAI-transformed payloads expose requested model ID.
- **WHEN** client calls `/v1/chat/completions` **THEN** final OpenAI payloads/chunks expose requested model ID.

#### FR3: Stream and non-stream parity

Masking must hold for every streaming chunk and non-stream final response.

**Scenarios:**

- **WHEN** `stream=true` **THEN** each emitted chunk with `model` contains requested model ID.
- **WHEN** `stream=false` **THEN** final JSON response `model` contains requested model ID.

#### FR4: Coverage across full OpenHands model set

Regression checks must cover all currently configured OpenHands public model IDs and aliases in production config.

**Scenarios:**

- **WHEN** request model is `claude-opus-4-6` **THEN** response/chunks keep `model=claude-opus-4-6`.
- **WHEN** request model is `claude-opus-4-5-20251101` **THEN** response/chunks keep `model=claude-opus-4-5-20251101`.
- **WHEN** request model is `claude-sonnet-4-5-20250929` or alias `claude-sonnet-4-5` **THEN** response/chunks keep requested ID.
- **WHEN** request model is `claude-haiku-4-5-20251001` or alias `claude-haiku-4-5` **THEN** response/chunks keep requested ID.

### Non-Functional Requirements

- **Performance:** Response rewrite overhead remains negligible and does not introduce additional upstream round trips.
- **Security:** Internal upstream model IDs are not leaked in external response payloads for OpenHands path.
- **Compatibility:** Existing model routing, cache behavior, and billing paths remain unchanged.

---

## Success Criteria

- [ ] OpenHands non-stream responses return requested model ID instead of upstream model ID
  - Verify: `go test ./...`
- [ ] OpenHands stream responses emit requested model ID on each relevant chunk/event
  - Verify: `go test ./...`
- [ ] Anthropic and OpenAI endpoints both preserve model masking contract for all OpenHands models
  - Verify: `curl -sS -X POST http://localhost:8004/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer <key>" -d '{"model":"claude-opus-4-5-20251101","stream":false,"messages":[{"role":"user","content":"ping"}]}'`
  - Verify: `curl -sS -X POST http://localhost:8004/v1/messages -H "Content-Type: application/json" -H "Authorization: Bearer <key>" -H "anthropic-version: 2023-06-01" -d '{"model":"claude-opus-4-5-20251101","max_tokens":128,"messages":[{"role":"user","content":"ping"}]}'`
- [ ] Regression matrix covers Opus/Sonnet/Haiku IDs and aliases from production config
  - Verify: `go test -run Mask ./...`
  - Verify: `go test ./...`
- [ ] goproxy build remains healthy after masking fix
  - Verify: `go build -o /dev/null ./...`

---

## Technical Context

### Existing Patterns

- `goproxy/main.go` already routes OpenHands OpenAI handling via `handleOpenHandsOpenAIRequest`, then stream/non-stream helpers.
- `goproxy/internal/maintarget/handler.go` already contains explicit model rewrite logic (`HandleOpenAIStreamResponse`, `HandleOpenAINonStreamResponse`) that sets response model to caller model.
- `goproxy/transformers/response.go` transformers explicitly assign output `Model = t.Model` for Anthropic/OpenAI transform flows and stream chunk creation.

### Key Files

- `goproxy/main.go` - OpenHands request handling entry points and response handler wiring.
- `goproxy/internal/maintarget/handler.go` - Existing proven rewrite behavior for OpenAI stream/non-stream responses.
- `goproxy/transformers/response.go` - Anthropic and OpenAI response transformers that set outgoing model field.
- `goproxy/config-openhands-prod.json` - Model alias/upstream mapping used to reproduce mismatch.

### Affected Files

Files this bead is expected to modify:

```yaml
files:
  - goproxy/main.go # enforce consistent model passed into OpenHands response handlers
  - goproxy/transformers/response.go # guarantee requested-model masking in transformed stream/non-stream outputs
  - goproxy/internal/openhands/openhands.go # provider-specific normalization points if leakage occurs there
  - goproxy/internal/maintarget/handler.go # optional parity alignment with existing rewrite helper patterns
  - goproxy/internal/openhands/types_test.go # concrete regression coverage anchor in openhands package
  - goproxy/transformers/truncate_test.go # concrete regression coverage anchor in transformers package
```

---

## Open Questions

| Question                                                                                                           | Owner       | Due Date | Status |
| ------------------------------------------------------------------------------------------------------------------ | ----------- | -------- | ------ |
| Should model masking be enforced only for OpenHands upstream, or standardized for all providers in follow-up work? | huynhgiabuu | -        | Open   |

---

## Tasks

### Lock response-model contract for OpenHands handlers [backend]

OpenHands handler flow always propagates the client-requested model ID into downstream response rewrite paths for both API surfaces.

**Metadata:**

```yaml
depends_on: []
parallel: false
conflicts_with: []
files:
  - goproxy/main.go
```

**Verification:**

- `go build -o /dev/null ./...`
- `go test ./...`

### Ensure transformer-level masking parity (stream + non-stream) [backend]

All relevant transformers emit requested model ID consistently in final responses and stream chunks, regardless of upstream returned model.

**Metadata:**

```yaml
depends_on: ["Lock response-model contract for OpenHands handlers"]
parallel: false
conflicts_with: []
files:
  - goproxy/transformers/response.go
  - goproxy/internal/openhands/openhands.go
```

**Verification:**

- `go test ./...`
- `go test ./internal/openhands/... -v`

### Add regression coverage for alias masking by endpoint type [test]

Regression tests validate that requests using all configured OpenHands model IDs and aliases never expose upstream model IDs in Anthropic or OpenAI responses.

**Metadata:**

```yaml
depends_on:
  [
    "Lock response-model contract for OpenHands handlers",
    "Ensure transformer-level masking parity (stream + non-stream)",
  ]
parallel: false
conflicts_with: []
files:
  - goproxy/internal/openhands/types_test.go
  - goproxy/internal/openhands/spend_checker_test.go
  - goproxy/transformers/truncate_test.go
  - goproxy/main.go
```

**Verification:**

- `go test ./...`
- `go test -run Mask ./...`

---

## Notes

- This PRD is specification-only for `/create`; implementation happens in `/ship bd-28i`.
- Existing in-progress bead `bd-15k` may touch related OpenHands routing files, so merge coordination is required before shipping.
