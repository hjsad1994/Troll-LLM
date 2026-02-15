# Beads PRD

**Bead:** bd-3nv  
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

Responses proxied from upstream OpenHands sometimes reach clients with visible escaped formatting characters (for example `\\n`, `\\uXXXX`, and related escaped markers) instead of rendering as intended text/code formatting. This degrades readability, breaks markdown/code block presentation, and creates a perception that the proxy response is corrupted.

### Why now?

A production bug report was raised for OpenHands upstream responses. Leaving it unresolved keeps user-visible output quality low and increases support/debugging cost for every affected request.

### Who is affected?

- **Primary users:** API consumers using OpenHands-routed models through TrollLLM proxy.
- **Secondary users:** Internal operators debugging model output quality and response integrity.

---

## Scope

### In-Scope

- OpenHands OpenAI-compatible response handling in goproxy for both stream and non-stream responses.
- Behavior where response content is re-serialized and may become double-escaped.
- Regression tests for escaped newline/unicode/formatting preservation.

### Out-of-Scope

- UI rendering logic in frontend components.
- Changes to OpenHands upstream service payload format.
- Unrelated provider behavior unless needed for regression verification.

---

## Proposed Solution

### Overview

Adjust OpenHands OpenAI response handling so model masking and usage extraction still work, but content formatting remains correctly represented (no additional escaping introduced by proxy processing). Add focused regression tests that reproduce escaped formatting symptoms and protect against future regressions in stream and non-stream paths.

### User Flow (if user-facing)

1. User sends a request routed to OpenHands through TrollLLM.
2. Proxy returns stream or non-stream OpenAI-compatible response.
3. User sees correctly formatted content (new lines, unicode characters, markdown/code formatting) without extra escape artifacts.

---

## Requirements

### Functional Requirements

#### Preserve formatting fidelity for OpenHands stream responses

OpenHands stream responses processed by OpenAI-compatible handler must not introduce extra escaping in content fields.

**Scenarios:**

- **WHEN** upstream SSE chunk contains text that includes escaped newline/unicode representations **THEN** proxy output remains semantically equivalent and does not add another escaping layer.
- **WHEN** model rewriting logic is applied in streaming path **THEN** formatting content remains intact while `model` masking behavior still works.

#### Preserve formatting fidelity for OpenHands non-stream responses

OpenHands non-stream responses processed by OpenAI-compatible handler must not introduce extra escaping in assistant content.

**Scenarios:**

- **WHEN** upstream JSON completion contains formatting-sensitive content **THEN** client-visible content is not double-escaped.
- **WHEN** response parsing fails in fallback path **THEN** current passthrough safety behavior is preserved.

#### Maintain compatibility for unaffected handlers

Existing passthrough handlers and provider-specific behavior must keep current semantics.

**Scenarios:**

- **WHEN** OpenHands `/v1/messages` path is used **THEN** passthrough behavior remains unchanged.
- **WHEN** OhMyGPT/MainTarget tests run **THEN** no regressions are introduced by this bug fix.

### Non-Functional Requirements

- **Performance:** No meaningful latency increase in stream processing path.
- **Security:** Do not log raw sensitive payload contents while debugging escape behavior.
- **Accessibility:** Not applicable (backend/proxy behavior change only).
- **Compatibility:** Keep OpenAI-compatible JSON/SSE contract intact for existing clients.

---

## Success Criteria

- [ ] Stream path no longer produces user-visible extra escaped formatting artifacts for OpenHands OpenAI responses.
  - Verify: `go test -run 'TestHandleOpenAIStreamResponse' ./internal/maintarget/...`
- [ ] Non-stream path no longer produces user-visible extra escaped formatting artifacts for OpenHands OpenAI responses.
  - Verify: `go test -run 'TestHandleOpenAINonStreamResponse' ./internal/maintarget/...`
- [ ] New regression tests cover escaped newline/unicode/formatting cases for both stream and non-stream handling.
  - Verify: `go test ./internal/maintarget/...`
- [ ] No regressions in adjacent OpenHands/OhMyGPT response handlers.
  - Verify: `go test ./internal/maintarget/... ./internal/openhands/... ./internal/ohmygpt/...`

---

## Technical Context

### Existing Patterns

- OpenHands OpenAI routing delegates to maintarget OpenAI handlers: `goproxy/main.go`.
- OpenAI stream handling parses SSE line JSON, may rewrite `model`, and re-marshals JSON: `goproxy/internal/maintarget/handler.go`.
- OpenAI non-stream handling unmarshals payload and re-marshals after model rewrite: `goproxy/internal/maintarget/handler.go`.
- OpenHands `/v1/messages` handlers are largely passthrough for body/SSE framing while extracting usage: `goproxy/internal/maintarget/handler.go`, `goproxy/internal/openhands/openhands.go`.

### Key Files

- `goproxy/main.go` - OpenHands request routing and handler delegation.
- `goproxy/internal/maintarget/handler.go` - Primary stream/non-stream OpenAI response transformation point.
- `goproxy/internal/maintarget/handler_test.go` - Existing stream/non-stream rewrite and fallback tests.
- `goproxy/internal/openhands/types_test.go` - Existing unicode escape handling coverage in error sanitization.

### Affected Files

Files this bead is expected to modify:

```yaml
files:
  - goproxy/internal/maintarget/handler.go # Fix serialization path to avoid double escaping
  - goproxy/internal/maintarget/handler_test.go # Add regression tests for escaped formatting
```

---

## Open Questions

| Question                                                                                                            | Owner       | Due Date   | Status |
| ------------------------------------------------------------------------------------------------------------------- | ----------- | ---------- | ------ |
| Which exact OpenHands endpoint/model pair reproduced the issue first (`/v1/chat/completions` stream vs non-stream)? | Implementer | 2026-02-15 | Open   |

---

## Tasks

### Add stream regression coverage for escaped formatting [test]

`goproxy/internal/maintarget/handler_test.go` contains deterministic stream tests that assert no extra escaping is introduced for newline/unicode/formatting-sensitive content.

**Metadata:**

```yaml
depends_on: []
parallel: true
conflicts_with: []
files:
  - goproxy/internal/maintarget/handler_test.go
```

**Verification:**

- `go test -run 'TestHandleOpenAIStreamResponse' ./internal/maintarget/...`

### Add non-stream regression coverage for escaped formatting [test]

`goproxy/internal/maintarget/handler_test.go` contains deterministic non-stream tests that assert response content is not double-escaped after handler processing.

**Metadata:**

```yaml
depends_on: []
parallel: true
conflicts_with: []
files:
  - goproxy/internal/maintarget/handler_test.go
```

**Verification:**

- `go test -run 'TestHandleOpenAINonStreamResponse' ./internal/maintarget/...`

### Fix OpenHands OpenAI serialization path to prevent double-escaping [bugfix]

`goproxy/internal/maintarget/handler.go` preserves content formatting semantics while retaining required model masking/usage behavior.

**Metadata:**

```yaml
depends_on:
  - Add stream regression coverage for escaped formatting
  - Add non-stream regression coverage for escaped formatting
parallel: false
conflicts_with: []
files:
  - goproxy/internal/maintarget/handler.go
```

**Verification:**

- `go test ./internal/maintarget/...`

### Run focused regression sweep across neighboring handlers [verification]

Response handler packages that share stream/non-stream patterns pass without regressions after the fix.

**Metadata:**

```yaml
depends_on:
  - Fix OpenHands OpenAI serialization path to prevent double-escaping
parallel: false
conflicts_with: []
files:
  - goproxy/internal/maintarget/handler.go
  - goproxy/internal/maintarget/handler_test.go
```

**Verification:**

- `go test ./internal/maintarget/... ./internal/openhands/... ./internal/ohmygpt/...`

---

## Notes

- This PRD intentionally targets specification only (`/create` phase). No implementation changes are included.
- If reproduction later confirms issue also affects Anthropic-to-OpenAI transformer path, open a follow-up bead instead of widening current scope.
