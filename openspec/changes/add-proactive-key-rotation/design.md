## Context
OpenHands LLM Proxy has a $10 budget limit per API key. Currently, key rotation only happens reactively after a request fails with "ExceededBudget" error. This causes user-facing failures.

The goal is to track spending and proactively rotate keys before they hit the limit.

## Goals / Non-Goals

### Goals
- Track estimated spend per key based on actual token usage
- Proactively rotate to backup key when spend reaches 96% of budget ($9.60 of $10)
- Zero user-facing interruptions due to budget exhaustion
- Admin visibility into spend vs budget

### Non-Goals
- Real-time balance checking via OpenHands API (not available)
- Per-request billing (use estimation based on token pricing)
- Historical spend analytics

## Decisions

### Decision: Track spend locally using token-based cost estimation
**Rationale**: OpenHands doesn't expose a balance API. We calculate cost from token usage using known pricing from config.

**Pricing reference** (per 1M tokens, from `config-openhands-prod.json`):
| Model | Input | Output | Cache Write | Cache Hit |
|-------|-------|--------|-------------|-----------|
| claude-opus-4-5-20251101 | $5.0 | $25.0 | $6.25 | $0.5 |
| claude-sonnet-4-5-20250929 | $3.0 | $15.0 | $3.75 | $0.3 |
| claude-haiku-4-5-20251001 | $1.0 | $5.0 | $1.25 | $0.1 |
| gemini-3-pro-preview | $2.0 | $12.0 | - | $0.2 |
| qwen3-coder-480b | $0.5 | $2.0 | - | $0.05 |
| kimi-k2-0711-preview | $0.3 | $1.5 | - | $0.03 |
| glm-4.6 | $0.2 | $1.0 | - | $0.02 |
| gpt-5.1 | $1.5 | $12.0 | - | $0.15 |
| gpt-5.1-codex-max | $2.0 | $16.0 | - | $0.2 |
| kimi-k2-thinking | $0.5 | $2.5 | - | $0.05 |

### Decision: Hybrid calibration for existing keys
**Rationale**: Existing keys đã spend $3-$4 nhưng spendEstimate = 0 sẽ không trigger threshold.

**Approach**:
1. **Parse from error**: Khi nhận 400 ExceededBudget, extract actual spend từ message `Spend=X.XX`
2. **Admin manual set**: Endpoint để admin set initial spendEstimate cho key đang dùng
3. **Auto-calibrate**: Cập nhật spendEstimate từ error response để tracking chính xác cho lần sau

### Decision: Use 96% threshold for proactive rotation
**Rationale**: Leaves ~$0.40 buffer. A typical large request (100K input + 8K output with opus) costs ~$2.10, so 96% gives margin for most requests to complete.

### Decision: Check threshold at request start, not during key selection
**Rationale**: Simpler implementation. If threshold exceeded, rotate before sending request.

## Risks / Trade-offs

### Risk: Spend estimation may drift from actual
**Mitigation**: Estimation is conservative (slightly over-estimates). Reactive rotation remains as fallback.

### Risk: Rapid requests may exceed threshold before rotation completes
**Mitigation**: Use mutex to prevent concurrent rotation. First request to detect threshold wins, others wait.

## Open Questions
- Should we support different budget limits per key? (Current: fixed $10)
  - **Answer**: Yes, add configurable `budgetLimit` field with default $10
