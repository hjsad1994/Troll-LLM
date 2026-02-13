# Spend Checker threshold + interval update

**Bead:** bd-3kr  
**Created:** 2026-02-13  
**Status:** Draft

## Bead Metadata

```yaml
depends_on: []
parallel: true
conflicts_with: []
blocks: []
estimated_hours: 1
```

---

## Problem Statement

### What problem are we solving?

Spend checker currently uses a default threshold of `9.95` and a fixed polling interval of `2s`, which does not match the desired operational rule of checking against `10.0` and reducing check frequency to every `10s`.

### Why now?

The current values create inconsistent behavior with expected budget boundaries and trigger checks more often than intended, adding unnecessary load and noise.

### Who is affected?

- **Primary users:** Operators maintaining OpenHands key rotation and spend monitoring in `goproxy`.
- **Secondary users:** Team members observing logs/alerts that depend on spend checker behavior.

---

## Scope

### In-Scope

- Change default spend threshold from `9.95` to `10.0` in spend checker.
- Change fixed spend check interval from `2s` to `10s`.
- Update unit tests to reflect the new defaults and interval behavior.
- Update related runtime log text that currently references `2s` interval.

### Out-of-Scope

- Changing env var behavior for `OPENHANDS_SPEND_THRESHOLD`.
- Redesigning spend check algorithm or introducing adaptive intervals.
- Modifying backend reporting script budget constants outside `goproxy` runtime behavior.

---

## Proposed Solution

### Overview

Update the spend checker constants to align with the requested operating values (`10.0` threshold, `10s` fixed interval), keep existing override and trigger logic intact, and synchronize tests/log messaging so behavior and observability remain consistent.

### User Flow (if user-facing)

1. Service starts and initializes spend checker with updated defaults.
2. Spend checker polls every `10s` using existing ticker flow.
3. Key rotation trigger still occurs when `spend >= threshold`, now defaulting to `10.0`.

---

## Requirements

### Functional Requirements

#### Default threshold and interval alignment

Default constants must reflect the requested operating rule.

**Scenarios:**

- **WHEN** spend checker is initialized without env override **THEN** threshold is `10.0` and base interval is `10s`.
- **WHEN** spend reaches exactly `10.0` **THEN** threshold comparison still treats it as at-or-above limit and triggers existing handling.

#### Test and logging consistency

Tests and startup logs must match runtime defaults.

**Scenarios:**

- **WHEN** default constants test runs **THEN** it asserts `10.0` and `10s`.
- **WHEN** service logs spend checker startup defaults **THEN** output text reflects `10s` interval.

### Non-Functional Requirements

- **Performance:** Reduce check frequency from 2-second cadence to 10-second cadence.
- **Security:** No auth/secret handling changes.
- **Accessibility:** Not applicable (non-UI backend logic).
- **Compatibility:** Preserve current env override (`OPENHANDS_SPEND_THRESHOLD`) and threshold compare semantics.

---

## Success Criteria

- [ ] Spend checker defaults are `10.0` threshold and `10s` interval.
  - Verify: `go test ./internal/openhands -run TestDefaultConstants -v`
- [ ] Threshold-trigger behavior remains inclusive (`>= threshold`) with updated default boundary.
  - Verify: `go test ./internal/openhands -run TestCheckAndRotateKeyThresholdReached -v`
- [ ] Interval-related tests pass with fixed `10s` cadence.
  - Verify: `go test ./internal/openhands -run "TestShouldCheckKeyFixedInterval|TestGetCheckIntervalForSpend" -v`
- [ ] Package-level regression check passes after edits.
  - Verify: `go test ./internal/openhands/...`

---

## Technical Context

### Existing Patterns

- Constants-based spend checker config in `goproxy/internal/openhands/spend_checker.go`.
- Runtime wiring in `goproxy/main.go` uses `openhands.DefaultSpendThreshold` and optional env override.
- Unit tests in `goproxy/internal/openhands/spend_checker_test.go` assert constant defaults, threshold behavior, and interval behavior.

### Key Files

- `goproxy/internal/openhands/spend_checker.go` - Default threshold/interval constants and check logic.
- `goproxy/main.go` - Startup wiring and interval/threshold logging.
- `goproxy/internal/openhands/spend_checker_test.go` - Assertions for constants and rotation interval behavior.

### Affected Files

Files this bead will modify (for conflict detection):

```yaml
files:
  - goproxy/internal/openhands/spend_checker.go # Update defaults 9.95->10.0 and 2s->10s
  - goproxy/main.go # Align startup log text for interval/defaults
  - goproxy/internal/openhands/spend_checker_test.go # Update constant and interval expectations
```

---

## Open Questions

None at PRD creation time.

---

## Tasks

### Update spend checker defaults [backend]

`goproxy` spend checker initializes with default threshold `10.0` and fixed check interval `10s` while preserving current compare and override mechanics.

**Metadata:**

```yaml
depends_on: []
parallel: false
conflicts_with: []
files:
  - goproxy/internal/openhands/spend_checker.go
```

**Verification:**

- `go test ./internal/openhands -run TestDefaultConstants -v`
- `go test ./internal/openhands -run TestCheckAndRotateKeyThresholdReached -v`

### Align runtime messaging [backend]

Startup logging in `goproxy/main.go` accurately reports the new spend checker default cadence and threshold context.

**Metadata:**

```yaml
depends_on: ["Update spend checker defaults"]
parallel: false
conflicts_with: []
files:
  - goproxy/main.go
```

**Verification:**

- `go test ./internal/openhands/...`

### Update spend checker tests [test]

Unit tests assert the updated default threshold and fixed interval without changing expected threshold-trigger semantics.

**Metadata:**

```yaml
depends_on: ["Update spend checker defaults"]
parallel: true
conflicts_with: []
files:
  - goproxy/internal/openhands/spend_checker_test.go
```

**Verification:**

- `go test ./internal/openhands -run "TestShouldCheckKeyFixedInterval|TestGetCheckIntervalForSpend|TestDefaultConstants" -v`
- `go test ./internal/openhands/...`

---

## Notes

This PRD only specifies required behavior and verification for `/ship`; it does not include implementation code.
