# Response Model Name Masking

**Bead:** bd-gww  
**Created:** 2026-02-13  
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

When the goproxy routes a user request to a different upstream model (e.g., user requests `claude-sonnet-4-5` but the proxy routes to `glm-5` via Modal), the response body contains the actual upstream model name (`zai-org/GLM-5-FP8`) instead of the model the user originally requested. Users who interact via SDKs, API clients, or tools that expose the raw response body can see this mismatch, revealing that their request was not served by the model they selected.

### Why now?

The GLM-5 weighted routing (bd-34y) was just deployed. Users making API calls through SDKs will immediately notice the model field discrepancy. IDE-based tools (Cursor, Windsurf, etc.) typically don't expose this, but SDK users and custom integrations will.

### Who is affected?

- **Primary users:** SDK/API users who inspect response bodies and see an unexpected model name
- **Secondary users:** Admin monitoring logs where model names should reflect the user-facing identity

---

## Scope

### In-Scope

- Rewrite `model` field in **streaming SSE chunks** (OpenAI format) for all passthrough providers (Modal, OpenHands, OhMyGPT)
- Rewrite `model` field in **non-streaming JSON responses** for all passthrough providers
- Apply rewriting in the `maintarget.HandleOpenAIStreamResponse` and `maintarget.HandleOpenAINonStreamResponse` handlers (single point of change for all providers using these)
- Pass the user-facing `modelID` into the response handlers so they know what to rewrite to

### Out-of-Scope

- Rewriting `model` in Anthropic-format responses (already handled by transformers)
- Rewriting `model` in Troll OpenAI responses (already handled by `handleTrollOpenAIStreamResponse`)
- Stripping/rewriting provider-specific headers (e.g., `x-request-id`, `openai-organization`)
- Rewriting `id` field format or `system_fingerprint`
- Error message model name rewriting

---

## Proposed Solution

### Overview

Pass the user-facing `modelID` into the `maintarget.HandleOpenAIStreamResponse` and `maintarget.HandleOpenAINonStreamResponse` functions. In the streaming handler, parse each `data:` SSE line as JSON, replace the `model` field with the user-facing model ID, re-serialize, and forward. In the non-streaming handler, parse the JSON response, replace the `model` field, re-serialize, and write. This approach centralizes the rewriting in the maintarget handlers which are already used by Modal, OpenHands, and OhMyGPT passthrough paths.

### Data Flow

1. User sends request for `claude-sonnet-4-5`
2. Proxy resolves upstream to `glm-5` → Modal (`zai-org/GLM-5-FP8`)
3. Modal responds with `"model": "zai-org/GLM-5-FP8"` in response body
4. **NEW:** `maintarget.HandleOpenAI*Response` rewrites `"model"` to `"claude-sonnet-4-5-20250929"` (the user-facing `modelID`)
5. Client receives response with expected model name

---

## Requirements

### Functional Requirements

#### FR1: Streaming SSE model name rewriting

The proxy must rewrite the `model` field in every SSE `data:` chunk of streaming responses to match the user-facing model ID.

**Scenarios:**

- **WHEN** a streaming response contains `"model": "zai-org/GLM-5-FP8"` in SSE chunks **THEN** each chunk is rewritten to `"model": "claude-sonnet-4-5-20250929"` (or whatever the user requested)
- **WHEN** an SSE line is `data: [DONE]` **THEN** it is forwarded as-is without JSON parsing
- **WHEN** an SSE line fails JSON parsing **THEN** it is forwarded as-is (graceful degradation)
- **WHEN** a chunk does not contain a `model` field **THEN** it is forwarded unchanged

#### FR2: Non-streaming JSON model name rewriting

The proxy must rewrite the `model` field in non-streaming JSON responses.

**Scenarios:**

- **WHEN** a non-streaming response contains `"model": "zai-org/GLM-5-FP8"` **THEN** it is rewritten to the user-facing model ID
- **WHEN** the response body fails JSON parsing **THEN** it is forwarded as-is

#### FR3: All passthrough providers benefit

The rewriting must work for all providers that use `maintarget.HandleOpenAI*Response`: Modal, OpenHands OpenAI path, and OhMyGPT.

**Scenarios:**

- **WHEN** Modal returns a response **THEN** model name is rewritten
- **WHEN** OpenHands OpenAI returns a response **THEN** model name is rewritten
- **WHEN** OhMyGPT returns a response **THEN** model name is rewritten

### Non-Functional Requirements

- **Performance:** JSON parse + re-serialize per SSE chunk must add < 2ms latency (negligible vs network)
- **Reliability:** If rewriting fails for any reason, the original response must be forwarded unchanged (no data loss)

---

## Success Criteria

- [ ] Streaming responses from Modal show user-facing model ID in every SSE chunk
  - Verify: `curl -X POST http://localhost:8004/v1/chat/completions -H "Authorization: Bearer <key>" -d '{"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}],"stream":true}' | grep -o '"model":"[^"]*"' | head -5`
- [ ] Non-streaming responses from Modal show user-facing model ID
  - Verify: `curl -X POST http://localhost:8004/v1/chat/completions -H "Authorization: Bearer <key>" -d '{"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}],"stream":false}' | jq '.model'`
- [ ] Go tests pass
  - Verify: `go test ./... -v`
- [ ] Go build succeeds
  - Verify: `go build -o /dev/null ./...`
- [ ] Graceful degradation: unparseable responses forwarded unchanged

---

## Technical Context

### Existing Patterns

- `handleTrollOpenAIStreamResponse` already rewrites `model` field in SSE chunks via `eventData["model"] = modelID` (`main.go:2949-2964`) — same pattern to apply in maintarget handlers
- `AnthropicResponseTransformer` sets `Model` from constructor param (`transformers/response.go:318-323`) — already handled
- `FilterDroidIdentity` shows pattern for per-chunk content modification (`transformers/response.go:120-149`)

### Key Files

- `goproxy/internal/maintarget/handler.go` — `HandleOpenAIStreamResponse` (line 317-404) and `HandleOpenAINonStreamResponse` (line 406-443) are the single points to modify
- `goproxy/main.go` — Call sites that invoke these handlers need to pass `modelID`
- `goproxy/internal/openhands/openhands.go` — OpenHands passthrough handlers (line 815-976) that delegate to maintarget
- `goproxy/internal/ohmygpt/ohmygpt.go` — OhMyGPT passthrough handlers (line 912-1088) that delegate to maintarget or have own passthrough

### Affected Files

Files this bead will modify:

```yaml
files:
  - goproxy/internal/maintarget/handler.go # Add model rewriting to HandleOpenAI*Response
  - goproxy/main.go # Pass modelID to response handlers
  - goproxy/internal/openhands/openhands.go # Pass modelID through to maintarget handlers
  - goproxy/internal/ohmygpt/ohmygpt.go # Pass modelID through to maintarget handlers (if using maintarget)
```

---

## Risks & Mitigations

| Risk                                                 | Likelihood | Impact | Mitigation                                                             |
| ---------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------- |
| JSON parse/re-serialize breaks streaming latency     | Low        | Medium | Parse only `data:` lines, skip `[DONE]`, fallback to original on error |
| Re-serialized JSON changes field order or formatting | Low        | Low    | OpenAI SDK clients parse JSON, don't depend on field order             |
| Some providers don't include `model` in every chunk  | Medium     | Low    | Only rewrite if `model` key exists                                     |
| Response body too large to buffer (non-stream)       | Low        | Low    | Non-streaming responses already fully buffered in current code         |

---

## Open Questions

| Question                                                     | Owner       | Due Date | Status                  |
| ------------------------------------------------------------ | ----------- | -------- | ----------------------- |
| Should error responses also have model name rewritten?       | huynhgiabuu | -        | Deferred (out of scope) |
| Should `system_fingerprint` or `id` format be rewritten too? | huynhgiabuu | -        | Deferred (out of scope) |

---

## Tasks

### Add modelID parameter to maintarget OpenAI response handlers [backend]

The `HandleOpenAIStreamResponse` and `HandleOpenAINonStreamResponse` functions accept a `modelID` string parameter and use it to rewrite the `model` field in response bodies before forwarding to the client.

**Metadata:**

```yaml
depends_on: []
parallel: false
conflicts_with: []
files:
  - goproxy/internal/maintarget/handler.go
```

**Verification:**

- `go build ./...` succeeds
- `go vet ./...` passes

### Implement streaming SSE model name rewriting [backend]

Inside `HandleOpenAIStreamResponse`, each `data:` line (except `[DONE]`) is parsed as JSON, the `model` field is replaced with the provided `modelID`, re-serialized, and forwarded. Lines that fail parsing are forwarded unchanged.

**Metadata:**

```yaml
depends_on: ["Add modelID parameter to maintarget OpenAI response handlers"]
parallel: false
conflicts_with: []
files:
  - goproxy/internal/maintarget/handler.go
```

**Verification:**

- `go build ./...` succeeds
- `go test ./internal/maintarget/...` passes
- Manual test: streaming response shows user-facing model name

### Implement non-streaming JSON model name rewriting [backend]

Inside `HandleOpenAINonStreamResponse`, the response body is parsed as JSON, the `model` field is replaced with the provided `modelID`, re-serialized, and written. Bodies that fail parsing are forwarded unchanged.

**Metadata:**

```yaml
depends_on: ["Add modelID parameter to maintarget OpenAI response handlers"]
parallel: true
conflicts_with: ["Implement streaming SSE model name rewriting"]
files:
  - goproxy/internal/maintarget/handler.go
```

**Verification:**

- `go build ./...` succeeds
- `go test ./internal/maintarget/...` passes
- Manual test: non-streaming response shows user-facing model name

### Update all call sites to pass modelID [backend]

All callers of `HandleOpenAIStreamResponse` and `HandleOpenAINonStreamResponse` (in `main.go`, `openhands.go`, `ohmygpt.go`) pass the user-facing `modelID` to the updated handlers.

**Metadata:**

```yaml
depends_on: ["Add modelID parameter to maintarget OpenAI response handlers"]
parallel: false
conflicts_with: []
files:
  - goproxy/main.go
  - goproxy/internal/openhands/openhands.go
  - goproxy/internal/ohmygpt/ohmygpt.go
```

**Verification:**

- `go build ./...` succeeds (all call sites compile with new signature)
- `go vet ./...` passes
- `go test ./...` passes

### End-to-end verification [test]

Verify that streaming and non-streaming requests for models with upstream routing (e.g., `claude-sonnet-4-5` routed to `glm-5`) return the user-facing model name in the response body.

**Metadata:**

```yaml
depends_on:
  [
    "Implement streaming SSE model name rewriting",
    "Implement non-streaming JSON model name rewriting",
    "Update all call sites to pass modelID",
  ]
parallel: false
conflicts_with: []
files: []
```

**Verification:**

- `go build -o /dev/null ./...` succeeds
- `go test ./...` passes
- Manual curl test with streaming shows correct model name in all chunks
- Manual curl test without streaming shows correct model name in response

---

## Notes

- The Anthropic-format response path and Troll OpenAI path already handle model name correctly via their respective transformers — only the OpenAI passthrough path (maintarget) needs this fix
- The `handleTrollOpenAIStreamResponse` in `main.go:2949-2964` already demonstrates the exact pattern needed: `eventData["model"] = modelID`
- Performance impact is negligible: JSON parse/marshal adds ~1-2ms per chunk, which is < 1% of typical network latency
