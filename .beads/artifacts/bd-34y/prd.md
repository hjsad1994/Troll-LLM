# Replace GLM-4.6 with GLM-5 via Modal Provider

**Bead:** bd-34y  
**Created:** 2026-02-13  
**Status:** Draft

## Bead Metadata

```yaml
depends_on: []
parallel: true
conflicts_with: []
blocks: []
estimated_hours: 2
```

---

## Problem Statement

### What problem are we solving?

The OpenHands production config (`config-openhands-prod.json`) currently uses `glm-4.6` as a random fallback model routed through the OpenHands proxy (`llm-proxy.app.all-hands.dev`). GLM-5 (`zai-org/GLM-5-FP8`) is now available via Modal's API (`api.us-west-2.modal.direct`) and offers improved performance. We need to switch from GLM-4.6 to GLM-5 and route GLM-5 requests through Modal instead of OpenHands.

### Why now?

GLM-5 is available and provides better quality than GLM-4.6. The Modal provider is ready with API access.

### Who is affected?

- **Primary users:** TrollLLM proxy users on the OpenHands config (chat.trollllm.xyz) — their random fallback model improves from GLM-4.6 to GLM-5
- **Secondary users:** Operators — need to configure Modal API key

---

## Scope

### In-Scope

- Add Modal as a new upstream provider in goproxy
- Replace `glm-4.6` with `glm-5` in `config-openhands-prod.json` upstream_model_id arrays
- Route GLM-5 requests to Modal API (`https://api.us-west-2.modal.direct/v1/chat/completions`) with proper auth
- Ensure random/weighted model selection continues to work (OpenHands models + GLM-5)
- Store Modal API key securely (environment variable, NOT in config JSON)

### Out-of-Scope

- Changing GLM routing in `config-ohmygpt-prod.json` (unless user requests)
- Adding Modal as a general-purpose provider for all models
- Modifying billing logic (GLM-5 still bills to `creditsNew` via `billing_upstream: "openhands"`)
- Adding Anthropic/Messages format support for Modal (Modal only supports OpenAI format)
- UI changes

---

## Proposed Solution

### Overview

Create a new Modal provider package (`internal/modal/`) following the same pattern as the OpenHands and OhMyGPT providers. The provider will forward requests to Modal's OpenAI-compatible API endpoint. Update `selectUpstreamConfig()` in `main.go` to route `upstream: "modal"` models to this provider. Update `config-openhands-prod.json` to use `glm-5` (routed via Modal) instead of `glm-4.6` (routed via OpenHands).

### Request Flow

1. User sends request for `claude-opus-4-6`
2. Config random selection picks between `prod/claude-sonnet-4-5-20250929` (70%) and `glm-5` (30%)
3. If `glm-5` selected → route to Modal provider → forward to `https://api.us-west-2.modal.direct/v1/chat/completions` with model `zai-org/GLM-5-FP8`
4. If OpenHands model selected → existing OpenHands routing (unchanged)

---

## Requirements

### Functional Requirements

#### FR1: Modal Provider Support

The goproxy must support routing requests to Modal's OpenAI-compatible API.

**Scenarios:**

- **WHEN** a model's `upstream_model_id` resolves to `glm-5` **THEN** the request is forwarded to `https://api.us-west-2.modal.direct/v1/chat/completions` with model field set to `zai-org/GLM-5-FP8`
- **WHEN** the Modal API key env var is not set **THEN** the proxy logs a warning at startup but does not crash
- **WHEN** the Modal upstream returns an error **THEN** the proxy returns the error to the client in OpenAI format

#### FR2: Config Update

The OpenHands production config must use GLM-5 instead of GLM-4.6.

**Scenarios:**

- **WHEN** any OpenHands model has `upstream_model_id` containing `glm-4.6` **THEN** it is replaced with `glm-5`
- **WHEN** weighted random selection occurs **THEN** the weights remain the same (70/30 split)

#### FR3: Model ID Mapping

GLM-5 requests must map `glm-5` to the Modal model ID `zai-org/GLM-5-FP8`.

**Scenarios:**

- **WHEN** `GetUpstreamModelID()` returns `glm-5` **THEN** the actual request to Modal uses model `zai-org/GLM-5-FP8`
- **WHEN** Haiku model (100% glm) is requested **THEN** it routes entirely to Modal with `zai-org/GLM-5-FP8`

### Non-Functional Requirements

- **Security:** Modal API key must be stored in environment variable `MODAL_API_KEY`, never in config JSON or committed to git
- **Performance:** No additional latency beyond normal network round-trip to Modal
- **Compatibility:** OpenAI format only (Modal uses standard OpenAI chat completions API)

---

## Success Criteria

- [ ] All `glm-4.6` references in `config-openhands-prod.json` are replaced with `glm-5`
  - Verify: `grep -c "glm-4.6" goproxy/config-openhands-prod.json` returns 0
- [ ] All `glm-5` requests route to Modal API endpoint
  - Verify: `grep -r "api.us-west-2.modal.direct" goproxy/internal/modal/` returns matches
- [ ] Modal API key is loaded from environment variable
  - Verify: `grep "MODAL_API_KEY" goproxy/internal/modal/modal.go` returns match
- [ ] Random model selection works with new config (70/30 OpenHands/Modal split)
  - Verify: `go build ./...` succeeds in goproxy/
- [ ] No references to `glm-4.6` remain in active config
  - Verify: `grep -r "glm-4.6" goproxy/config-openhands-prod.json` returns nothing
- [ ] Proxy compiles and existing tests pass
  - Verify: `go test ./... && go build -o /dev/null .` in goproxy/

---

## Technical Context

### Existing Patterns

- **Provider pattern:** `internal/openhands/openhands.go` — hardcoded endpoint constants, MongoDB key pool, `ForwardRequest()` + `forwardToEndpoint()` pattern
- **Config routing:** `main.go:176-253` — `selectUpstreamConfig()` switches on `model.upstream` field
- **Random selection:** `config/config.go:232-324` — `GetUpstreamModelID()` handles string/array with weighted selection via `selectUpstreamWithWeights()`
- **Model config struct:** `config/config.go:20-42` — `UpstreamModelID interface{}`, `UpstreamModelWeights []int`

### Key Files

- `goproxy/config-openhands-prod.json` — Config with `glm-4.6` references to replace
- `goproxy/main.go:176-253` — `selectUpstreamConfig()` for adding Modal routing
- `goproxy/main.go:758-835` — `chatCompletionsHandler()` where upstream is dispatched
- `goproxy/config/config.go:20-42` — Model struct definition
- `goproxy/config/config.go:232-324` — `GetUpstreamModelID()` and weighted selection
- `goproxy/internal/openhands/openhands.go` — Reference provider implementation

### Affected Files

Files this bead will modify:

```yaml
files:
  - goproxy/config-openhands-prod.json # Replace glm-4.6 with glm-5
  - goproxy/main.go # Add Modal routing in selectUpstreamConfig + handler dispatch
  - goproxy/internal/modal/modal.go # NEW: Modal provider (ForwardRequest, forwardToEndpoint)
```

---

## Risks & Mitigations

| Risk                                 | Likelihood | Impact | Mitigation                                              |
| ------------------------------------ | ---------- | ------ | ------------------------------------------------------- |
| Modal API downtime                   | Low        | Medium | 30% weight means 70% still routes to OpenHands          |
| API key exposure in config           | Medium     | High   | Store in env var, PRD explicitly forbids committing key |
| Different response format from Modal | Low        | Low    | Modal uses standard OpenAI format, same as current flow |

---

## Open Questions

| Question                                                        | Owner | Due Date      | Status                                  |
| --------------------------------------------------------------- | ----- | ------------- | --------------------------------------- |
| Should `config-ohmygpt-prod.json` also switch to GLM-5?         | User  | Before /start | Open                                    |
| Should Modal provider use a MongoDB key pool or single env var? | User  | Before /start | Resolved: env var (single key provided) |

---

## Tasks

### 1. Create Modal provider package [backend]

A new `internal/modal/` package exists with `ForwardRequest()` that sends OpenAI-format requests to `https://api.us-west-2.modal.direct/v1/chat/completions` with Bearer auth from `MODAL_API_KEY` env var.

**Metadata:**

```yaml
depends_on: []
parallel: true
conflicts_with: []
files:
  - goproxy/internal/modal/modal.go
```

**Verification:**

- `go build ./internal/modal/...` compiles successfully
- `grep "api.us-west-2.modal.direct" goproxy/internal/modal/modal.go` returns match
- `grep "MODAL_API_KEY" goproxy/internal/modal/modal.go` returns match

### 2. Add Modal routing in main.go [backend]

`selectUpstreamConfig()` recognizes `upstream: "modal"` and routes to the Modal provider. `chatCompletionsHandler()` dispatches Modal requests through the new provider.

**Metadata:**

```yaml
depends_on: ["Create Modal provider package"]
parallel: false
conflicts_with: []
files:
  - goproxy/main.go
```

**Verification:**

- `grep -A5 '"modal"' goproxy/main.go` shows Modal routing case
- `go build -o /dev/null .` compiles successfully

### 3. Update OpenHands config to use GLM-5 [config]

All `glm-4.6` references in `config-openhands-prod.json` are replaced with `glm-5`, and the `upstream_model_id` array entries that were `glm-4.6` now include a mapping mechanism to route to Modal provider with model ID `zai-org/GLM-5-FP8`.

**Metadata:**

```yaml
depends_on: ["Add Modal routing in main.go"]
parallel: false
conflicts_with: []
files:
  - goproxy/config-openhands-prod.json
```

**Verification:**

- `grep -c "glm-4.6" goproxy/config-openhands-prod.json` returns 0
- `grep "glm-5" goproxy/config-openhands-prod.json` returns matches
- Config JSON is valid: `python3 -c "import json; json.load(open('goproxy/config-openhands-prod.json'))"`

### 4. Integration verification [testing]

The proxy compiles, all existing tests pass, and the Modal provider is properly initialized at startup.

**Metadata:**

```yaml
depends_on: ["Update OpenHands config to use GLM-5"]
parallel: false
conflicts_with: []
files: []
```

**Verification:**

- `go build -o /dev/null .` in goproxy/ succeeds
- `go test ./...` in goproxy/ passes
- `go vet ./...` in goproxy/ passes

---

## Dependency Legend

| Field            | Purpose                                           | Example                                    |
| ---------------- | ------------------------------------------------- | ------------------------------------------ |
| `depends_on`     | Must complete before this task starts             | `["Setup database", "Create schema"]`      |
| `parallel`       | Can run concurrently with other parallel tasks    | `true` / `false`                           |
| `conflicts_with` | Cannot run in parallel (same files)               | `["Update config"]`                        |
| `files`          | Files this task modifies (for conflict detection) | `["src/db/schema.ts", "src/db/client.ts"]` |

---

## Notes

- Modal API is OpenAI-compatible (`/v1/chat/completions`), no format transformation needed
- Modal API key: stored in `MODAL_API_KEY` env var (provided by user, not committed)
- The Modal provider is simpler than OpenHands/OhMyGPT — single API key (env var), no MongoDB key pool, no Anthropic format support needed
- Model ID mapping: config uses `glm-5` as logical name, Modal requires `zai-org/GLM-5-FP8` as actual model ID — mapping can be done in provider or config
