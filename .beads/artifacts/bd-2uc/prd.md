# Beads PRD

**Bead:** bd-2uc  
**Created:** 2026-02-14  
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

SpendChecker in `goproxy/internal/openhands/spend_checker.go` currently does more than spend monitoring: it rotates keys when spend reaches threshold, rotates on `budget_exceeded`, and triggers pool rotation handling on some API errors (for example 401). This mixes monitoring with recovery actions and can rotate keys for upstream/model routing errors that are not caused by key spend.

### Why now?

Recent runtime errors include upstream 404/fallback-model-group failures. The requested behavior is to keep SpendChecker as a USD spend observer only, so key rotation does not happen from SpendChecker error paths.

### Who is affected?

- **Primary users:** Operators running OpenHands key pools in `goproxy`.
- **Secondary users:** End users affected by unnecessary key churn and unstable key availability.

---

## Scope

### In-Scope

- Make SpendChecker monitor-only: fetch spend, update spend stats, and log check outcomes.
- Prevent SpendChecker from rotating keys on threshold, `budget_exceeded`, or non-spend API errors.
- Keep request-path rotation behavior outside SpendChecker unchanged.
- Update SpendChecker-focused tests to validate non-rotation behavior.

### Out-of-Scope

- Changing `OpenHandsProvider.CheckAndRotateOnError` behavior for normal request forwarding paths.
- Changing model routing/fallback configuration.
- Redesigning key pool schema or backup key lifecycle.

---

## Proposed Solution

### Overview

Refactor SpendChecker into a pure monitoring component: it continues polling spend and storing `totalSpend`/`lastSpendCheck`, but it no longer performs or triggers rotation actions. Any key rotation policy remains in request-handling paths and dedicated rotation components, not in periodic spend polling.

### User Flow (operator)

1. Service starts SpendChecker and polls spend on schedule.
2. SpendChecker updates spend stats and logs monitoring results.
3. On threshold or API errors, SpendChecker records/logs state but does not rotate keys.

---

## Requirements

### Functional Requirements

#### SpendChecker remains spend-monitoring only

SpendChecker must only check spend and update key spend metadata.

**Scenarios:**

- **WHEN** SpendChecker receives normal spend data **THEN** it updates spend stats in memory/DB and continues polling.
- **WHEN** spend is at or above threshold **THEN** SpendChecker does not call rotation APIs.

#### No rotation side effects from SpendChecker error paths

SpendChecker error handling must not trigger key rotation.

**Scenarios:**

- **WHEN** spend endpoint returns `budget_exceeded` or other non-200 status **THEN** SpendChecker reports/logs the check failure without rotating keys.
- **WHEN** spend endpoint returns 401/auth errors **THEN** SpendChecker does not call pool/provider rotation handlers.

#### Rotation remains isolated to request handling

Normal request error rotation outside SpendChecker must stay unchanged.

**Scenarios:**

- **WHEN** a forwarded request path hits rotation-worthy errors **THEN** existing request-path rotation logic still works.

### Non-Functional Requirements

- **Performance:** Keep current fixed `10s` polling cadence and parallel key checks.
- **Security:** Do not leak full API keys in new logs.
- **Compatibility:** No changes to model routing config format or API contract.

---

## Success Criteria

- [ ] SpendChecker code no longer invokes key rotation methods.
  - Verify: `cd goproxy && rg "RotateKey\(|CheckAndRotateOnError\(" internal/openhands/spend_checker.go`
- [ ] Spend polling still updates spend metadata and stats.
  - Verify: `cd goproxy && go test ./internal/openhands -run TestSpendCheckerStats -count=1`
- [ ] Threshold/error behaviors are covered by tests proving non-rotation in SpendChecker.
  - Verify: `cd goproxy && go test ./internal/openhands -run "SpendChecker|Threshold|budget" -count=1`
- [ ] Request-path rotation logic remains available outside SpendChecker.
  - Verify: `cd goproxy && go test ./internal/openhands -run "CheckAndRotateOnError|RotateKey" -count=1`

---

## Technical Context

### Existing Patterns

- `goproxy/internal/openhands/spend_checker.go` - Current SpendChecker polling flow includes threshold/error-triggered rotation branches.
- `goproxy/internal/openhands/openhands.go` - Request-path `CheckAndRotateOnError` owns error-driven rotation for forwarded requests.
- `goproxy/main.go` - Startup wiring and runtime messaging for SpendChecker behavior.

### Key Files

- `goproxy/internal/openhands/spend_checker.go` - Core behavior to remove rotation side effects from periodic checks.
- `goproxy/internal/openhands/spend_checker_test.go` - Behavioral tests to reflect monitoring-only scope.
- `goproxy/internal/openhands/openhands.go` - Control file to ensure request-path rotation scope is unchanged.
- `goproxy/main.go` - Optional log text alignment with monitoring-only semantics.

### Affected Files

```yaml
files:
  - goproxy/internal/openhands/spend_checker.go # Remove rotation calls from threshold/error handling
  - goproxy/internal/openhands/spend_checker_test.go # Add/update non-rotation behavior tests
  - goproxy/main.go # Align spend checker startup wording if needed
```

---

## Tasks

### Remove SpendChecker rotation side effects [backend]

`SpendChecker.checkAllKeys` and related spend-check error handling become monitoring-only and do not call rotation actions.

**Metadata:**

```yaml
depends_on: []
parallel: false
conflicts_with: []
files:
  - goproxy/internal/openhands/spend_checker.go
```

**Verification:**

- `cd goproxy && rg "RotateKey\(|CheckAndRotateOnError\(" internal/openhands/spend_checker.go`
- `cd goproxy && go test ./internal/openhands -run TestSpendChecker -count=1`

### Update SpendChecker tests for non-rotation behavior [test]

Unit tests encode that threshold and API error conditions in SpendChecker do not perform key rotation and still preserve spend monitoring behavior.

**Metadata:**

```yaml
depends_on: ["Remove SpendChecker rotation side effects"]
parallel: false
conflicts_with: []
files:
  - goproxy/internal/openhands/spend_checker_test.go
```

**Verification:**

- `cd goproxy && go test ./internal/openhands -run "SpendChecker|Threshold|budget" -count=1`

### Align runtime messaging with monitoring-only SpendChecker [ops]

Startup/log wording no longer claims proactive key rotation from SpendChecker and matches the monitoring-only behavior.

**Metadata:**

```yaml
depends_on: ["Remove SpendChecker rotation side effects"]
parallel: true
conflicts_with: []
files:
  - goproxy/main.go
```

**Verification:**

- `cd goproxy && go test ./...`

---

## Notes

- This bead intentionally limits changes to SpendChecker-triggered behavior.
- If request-path rotation policy must also change, create a separate bead to avoid scope coupling.
