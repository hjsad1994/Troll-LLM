# Revert a72b7cb model-selection regression

**Bead:** bd-354  
**Created:** 2026-02-14  
**Status:** Draft

## Bead Metadata

```yaml
depends_on: []
parallel: false
conflicts_with: []
blocks: []
estimated_hours: 1
```

---

## Problem Statement

### What problem are we solving?

Commit `a72b7cb` introduced Anthropic response-model rewrite wiring for OpenHands flows. After this change, selecting `claude-opus-4-5-20251101` can fail with: "There's an issue with the selected model ... It may not exist or you may not have access to it." This breaks previously stable model selection behavior and blocks normal request execution.

### Why now?

The regression is user-visible and impacts core request routing. The fastest safe recovery is to restore the previous stable behavior by reverting the regression scope introduced by `a72b7cb`.

### Who is affected?

- **Primary users:** Users selecting OpenHands model `claude-opus-4-5-20251101` (and potentially related aliases) in production/dev flows.
- **Secondary users:** Operators debugging model-access incidents and support handling failed model selection reports.

---

## Scope

### In-Scope

- Revert runtime behavior changes from commit `a72b7cb` that enforce Anthropic/OpenHands response model rewrite.
- Restore previous handler wiring in OpenHands message response path.
- Update or remove tests added by `a72b7cb` that encode the regressed behavior.
- Preserve repository health with passing Go build/tests after rollback.

### Out-of-Scope

- New model-masking redesign or alternative architecture.
- Pricing, billing, spend-checker, or rate-limit logic changes.
- New model aliases, routing weights, or config expansion.

---

## Proposed Solution

### Overview

Perform a targeted rollback of functional code introduced by `a72b7cb` in OpenHands Anthropic response handling. Specifically, remove or disable the optional model rewrite path and return to the previous pass-through response behavior in OpenHands message handlers. Keep the change minimal and focused on restoring known-good model selection behavior.

### User Flow (if user-facing)

1. User selects `claude-opus-4-5-20251101` via model selection flow.
2. Request is proxied through existing OpenHands route without forced response-model override introduced by `a72b7cb`.
3. Request succeeds under prior stable behavior (no access/not-exist regression from this commit).

---

## Requirements

### Functional Requirements

#### FR1: Remove a72b7cb Anthropic rewrite behavior from OpenHands path

OpenHands Anthropic response handling no longer applies the `a72b7cb` model rewrite contract.

**Scenarios:**

- **WHEN** OpenHands handles `/v1/messages` stream responses **THEN** it uses stable pre-`a72b7cb` response handling semantics.
- **WHEN** OpenHands handles `/v1/messages` non-stream responses **THEN** it uses stable pre-`a72b7cb` response handling semantics.

#### FR2: Restore pre-regression handler wiring in main request path

Main OpenHands routing path should not depend on the optional model rewrite helpers introduced in `a72b7cb`.

**Scenarios:**

- **WHEN** OpenHands message response handler is invoked **THEN** `main.go` routes through stable handler signatures.
- **WHEN** request model is `claude-opus-4-5-20251101` **THEN** regression tied to `a72b7cb` no longer reproduces.

#### FR3: Test suite reflects restored behavior

Regression tests that assert forced rewrite behavior from `a72b7cb` are removed or updated so test expectations match restored stable behavior.

**Scenarios:**

- **WHEN** maintarget handler tests run **THEN** they validate restored semantics and pass.
- **WHEN** full Go test suite runs **THEN** no failures remain from rollback changes.

### Non-Functional Requirements

- **Performance:** Rollback must not add latency or extra upstream calls.
- **Security:** No new secrets/logging exposure introduced by rollback.
- **Accessibility:** Not applicable (backend-only change).
- **Compatibility:** Existing OpenAI/OpenHands request handling remains compatible with current API contracts.

---

## Success Criteria

- [ ] OpenHands Anthropic response path no longer uses model rewrite behavior introduced in `a72b7cb`
  - Verify: `go test ./internal/maintarget/...`
- [ ] OpenHands main route is restored to stable handler wiring
  - Verify: `go test ./...`
- [ ] goproxy builds cleanly after rollback
  - Verify: `go build -o /dev/null ./...`
- [ ] Commit-level scope is limited to rollback of `a72b7cb` behavior
  - Verify: `git diff --name-only a72b7cb^..a72b7cb`

---

## Technical Context

### Existing Patterns

- OpenHands Anthropic response handling entry point is in `goproxy/main.go` and delegates to maintarget helper handlers.
- `a72b7cb` introduced optional model rewrite helpers in `goproxy/internal/maintarget/handler.go` (`HandleStreamResponseWithPrefixAndModel`, `HandleNonStreamResponseWithPrefixAndModel`).
- Regression coverage added in `goproxy/internal/maintarget/handler_test.go` currently asserts rewritten model IDs for OpenHands matrix cases.

### Key Files

- `goproxy/main.go` - OpenHands message response wiring and handler invocation.
- `goproxy/internal/maintarget/handler.go` - Anthropic stream/non-stream response helper behavior.
- `goproxy/internal/maintarget/handler_test.go` - Regression and behavior expectations that must match restored logic.

### Affected Files

Files this bead will modify (for conflict detection):

```yaml
files:
  - goproxy/main.go # revert OpenHands message handler wiring to stable calls
  - goproxy/internal/maintarget/handler.go # remove/disable optional model rewrite path from a72b7cb
  - goproxy/internal/maintarget/handler_test.go # align tests with reverted behavior
```

---

## Open Questions

| Question                                                                                                                           | Owner       | Due Date | Status |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------- | ------ |
| Should rollback include bead artifact files introduced in `a72b7cb` (`.beads/artifacts/bd-28i/*`) or only runtime/test code paths? | huynhgiabuu | -        | Open   |

---

## Tasks

### Revert OpenHands response handler wiring [backend]

`goproxy/main.go` routes OpenHands Anthropic responses through stable pre-`a72b7cb` handlers without forced model rewrite arguments.

**Metadata:**

```yaml
depends_on: []
parallel: false
conflicts_with: []
files:
  - goproxy/main.go
```

**Verification:**

- `go test ./...`

### Roll back optional Anthropic rewrite helpers [backend]

`goproxy/internal/maintarget/handler.go` no longer applies the `a72b7cb` optional rewrite behavior that mutates outgoing Anthropic model identifiers.

**Metadata:**

```yaml
depends_on: ["Revert OpenHands response handler wiring"]
parallel: false
conflicts_with: []
files:
  - goproxy/internal/maintarget/handler.go
```

**Verification:**

- `go test ./internal/maintarget/...`
- `go build -o /dev/null ./...`

### Re-baseline maintarget tests to stable behavior [test]

`goproxy/internal/maintarget/handler_test.go` validates restored stable behavior and no longer enforces the rewrite expectations added by `a72b7cb`.

**Metadata:**

```yaml
depends_on: ["Roll back optional Anthropic rewrite helpers"]
parallel: false
conflicts_with: []
files:
  - goproxy/internal/maintarget/handler_test.go
```

**Verification:**

- `go test ./internal/maintarget/...`
- `go test ./...`

---

## Notes

- This PRD defines specification only for `/create`; implementation happens in `/ship bd-354`.
- The intended recovery strategy is minimal rollback to last known stable behavior, not a broader OpenHands refactor.
