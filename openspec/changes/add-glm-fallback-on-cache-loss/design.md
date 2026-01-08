# Design: GLM Fallback on Cache Loss

## Context

OhMyGPT provider is experiencing cache fallback events that cause significant cost overruns. When cache is not utilized for large requests (>6000 input tokens), the cost differential between cached and non-cached responses can exceed $1.50 per request. To mitigate this, we need an automatic failover mechanism that switches to a more cost-effective provider (GLM 4.7) during periods of poor cache performance.

**Stakeholders**:
- System administrators monitoring cache performance
- Users affected by provider switches
- Finance team tracking cost optimization

**Constraints**:
- Must not break existing OhMyGPT functionality
- Must preserve streaming response capability
- Must allow automatic recovery when OhMyGPT cache improves
- GLM API key must be securely stored

## Goals / Non-Goals

**Goals**:
1. Automatic failover to GLM 4.7 when cache loss exceeds $1.50 threshold
2. Time-based cycling (15 minutes on GLM, then retry OhMyGPT)
3. Per-model failover state tracking
4. Transparent logging of failover events
5. Support for streaming responses via GLM

**Non-Goals**:
1. Manual failover control (deferred to future admin UI)
2. Per-user failover state (global per-model only)
3. Cache warming or pre-fetching
4. Cost comparison between providers (assumes GLM is cheaper)

## Decisions

### Decision 1: Failover State Storage

**What**: Store failover state in-memory using a singleton `FailoverStateManager` with atomic operations.

**Why**:
- Fast access during request routing
- No database latency impact
- Simple state synchronization with existing detector singleton pattern
- State resets on service restart (acceptable for failover)

**Alternatives considered**:
- Redis: External dependency, more complex
- MongoDB: Slower, overkill for temporary state
- File-based: Not thread-safe, slower

### Decision 2: Cache Loss Calculation

**What**: Calculate loss using existing formula from `detector.go`:

```
loss = (input_tokens * input_price/1M - input_tokens * cache_hit_price/1M)
     + (output_tokens * output_price/1M - output_tokens * cache_hit_price/1M)
```

**Why**:
- Reuses existing calculation logic
- Already proven accurate in cache detection
- Consistent with email alert calculations

### Decision 3: Trigger Conditions

**What**: Require ALL conditions to trigger failover:
1. `cache_read_input_tokens == 0` AND `cache_creation_input_tokens == 0`
2. `estimated_loss > $1.50`

**Why**:
- Cache check confirms actual cache miss (from existing detection)
- Loss threshold ensures failover only for significant cost impact
- Simpler logic with fewer conditions to maintain

**Alternatives considered**:
- Single condition (loss only): Could trigger on edge cases
- Including token threshold: Removed as loss amount already accounts for token count

### Decision 4: Cooldown and Retry Strategy

**What**: Fixed 15-minute cooldown cycle with:
1. On threshold exceed: Set `failover_until = now + 15min`, log event
2. On each request: Check if `now < failover_until`
3. After cooldown: Reset to OhMyGPT, monitor next request
4. If threshold exceeded again: Repeat cycle

**Why**:
- Simple, predictable behavior
- Gives OhMyGPT time to recover cache state
- Not too aggressive (prevents rapid switching)
- Not too passive (limits cost exposure)

**Alternatives considered**:
- Exponential backoff: More complex, may not be needed
- Success count based: Requires tracking multiple requests
- Manual reset: Adds operational burden

### Decision 5: Per-Model vs Global Failover

**What**: Store failover state per model (e.g., separate state for Opus vs Sonnet).

**Why**:
- Different models may have different cache health
- One model's cache issues shouldn't affect others
- Aligns with existing per-model event tracking

### Decision 6: GLM Provider Implementation

**What**: Create new package `goproxy/internal/glm/` following the pattern of `openhands` provider.

**Key features**:
- Single API key (no rotation needed for backup use)
- Support for `/v1/chat/completions` endpoint (GLM 4.7)
- Streaming response support
- Model mapping: `claude-opus-4.5` → `glm-4.7`, `claude-sonnet-4.5` → `glm-4.7`

**Why**:
- Consistent with existing provider architecture
- Minimal code duplication
- Easy to test and maintain

### Decision 7: Integration Point

**What**: Modify `selectUpstreamConfig()` in `main.go` to check failover state BEFORE routing to OhMyGPT.

**Flow**:
```go
func selectUpstreamConfig(modelID string, clientAPIKey string) (*UpstreamConfig, *proxy.Proxy, error) {
    upstream := config.GetModelUpstream(modelID)

    // Check failover state BEFORE OhMyGPT routing
    if upstream == "ohmygpt" {
        if failoverManager.IsInFailover(modelID) {
            log.Printf("🔄 [Failover] %s -> GLM (active until %s)", modelID, failoverManager.GetUntil(modelID))
            return getGLMConfig(modelID)
        }
        return getOhMyGPTConfig(modelID)
    }

    // ... other upstreams
}
```

**Why**:
- Centralized routing logic
- Easy to understand and debug
- No changes needed to individual providers

### Decision 8: Model Name Preservation

**What**: When forwarding requests to GLM, the system SHALL preserve the original Claude model name in the response to maintain transparency and avoid confusing users.

**Implementation**:
- GLM provider receives request with original model (e.g., `claude-opus-4-5-20251101`)
- GLM provider maps to internal GLM model for API call (e.g., `glm-4.7`)
- GLM provider rewrites response `model` field back to original Claude model name
- Add `x-provider: glm` header for transparency (optional)

**Why**:
- Users expect consistent model names regardless of internal routing
- Prevents confusion about which model they're using
- Maintains API contract with clients
- Transparency via optional header

**Alternatives considered**:
- Return actual GLM model name: Confusing, breaks API contract
- Add prefix/suffix: Non-standard, may break clients

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Request Flow                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ main.go:        │
                    │ selectUpstream  │
                    │ Config()        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Is upstream     │──── Yes ────► OpenHands/Main
                    │ "ohmygpt"?      │
                    └────────┬────────┘
                             │ No
                             ▼
                    ┌─────────────────┐
                    │ Check failover  │──── In failover ────► GLM Provider
                    │ state           │
                    └────────┬────────┘
                             │ Not in failover
                             ▼
                    ┌─────────────────┐
                    │ OhMyGPT         │
                    │ Provider        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ After response: │
                    │ Check cache     │
                    │ + loss          │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                              │
              ▼                              ▼
     Loss > $1.50?                     Normal
              │                         completion
              │ Yes
              ▼
    ┌─────────────────┐
    │ Trigger         │
    │ failover for    │
    │ 15 minutes      │
    └─────────────────┘
```

## State Machine

```
                    ┌──────────────────────────────────────────────┐
                    │                NORMAL STATE                  │
                    │  - Using OhMyGPT                             │
                    │  - Monitoring cache + loss                   │
                    │  - No active failover                        │
                    └────────────────────┬─────────────────────────┘
                                         │
                                         │ Cache miss
                                         │ AND loss > $1.50
                                         ▼
                    ┌──────────────────────────────────────────────┐
                    │              FAILOVER STATE                  │
                    │  - Using GLM 4.7                            │
                    │  - failover_until = now + 15min             │
                    │  - Logging all requests                     │
                    └────────────────────┬─────────────────────────┘
                                         │
                                         │ 15 minutes elapsed
                                         ▼
                    ┌──────────────────────────────────────────────┐
                    │          AUTO RETURN TO NORMAL               │
                    │  - Clear failover state                     │
                    │  - Resume OhMyGPT routing                   │
                    │  - Continue monitoring cache                │
                    │  - If trigger again → New failover cycle    │
                    └──────────────────────────────────────────────┘
```

## Environment Variables

```bash
# GLM Provider Configuration
GLM_API_KEY=c766e3323f504b5da5eaa9b2b971962d.g9e5mUzILgPPvTc7
GLM_ENDPOINT=https://api.z.ai/api/paas/v4/chat/completions

# Cache Fallback Configuration
CACHE_FAILOVER_ENABLED=true
CACHE_FAILOVER_LOSS_THRESHOLD=1.50  # USD
CACHE_FAILOVER_COOLDOWN_MINUTES=15
```

## GLM Model Mapping (Internal Only)

**IMPORTANT**: Users will ALWAYS see the original Claude model name in responses. This mapping is ONLY for internal API calls to GLM.

| Original Claude Model (what user sees) | Internal GLM Model (for API call only) |
|----------------------------------------|----------------------------------------|
| claude-opus-4-5-20251101              | glm-4.7                             |
| claude-opus-4.5                        | glm-4.7                             |
| claude-sonnet-4-5-20250929            | glm-4.7                              |
| claude-sonnet-4.5                      | glm-4.7                              |
| claude-haiku-4-5-20251001             | glm-4.7                            |
| claude-haiku-4.5                       | glm-4.7                            |
| gpt-4o                                 | glm-4.7                             |

**Response Model Name Rewriting**:
```javascript
// User request: model="claude-opus-4-5-20251101"
// Forward to GLM API: model="glm-4.7"
// GLM response: { model: "glm-4.7", ... }
// Rewritten for user: { model: "claude-opus-4-5-20251101", ... }
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| GLM response quality differs from Claude | Medium | Inform users via logs; consider add note in response |
| GLM API may have rate limits | Medium | Monitor GLM errors; implement retry if needed |
| Switching providers mid-stream may break UX | High | Only switch between requests, never mid-stream |
| Frequent switching may increase latency | Low | 15-min cooldown limits switches |
| State lost on service restart | Low | Acceptable; restarts are rare and cache may recover |

## Migration Plan

**Phase 1: Implementation** (no traffic impact)
1. Create GLM provider package
2. Add failover state manager
3. Write unit tests for state transitions
4. Add configuration options

**Phase 2: Integration** (feature flag controlled)
1. Modify `selectUpstreamConfig()` with feature flag check
2. Add logging but keep disabled by default
3. Test with staging traffic
4. Monitor logs for correctness

**Phase 3: Production Rollout**
1. Enable with high thresholds (e.g., $5.00 loss)
2. Monitor for 24 hours
3. Adjust to $1.50 threshold
4. Continue monitoring

**Rollback Plan**:
- Set `CACHE_FAILOVER_ENABLED=false` to disable immediately
- Remove failover check from `selectUpstreamConfig()`
- Service continues with OhMyGPT only

## Open Questions

1. **Should we notify users when provider switches?**
   - Option A: Add `x-provider: glm` header
   - Option B: Include note in response
   - Option C: Silent (proposed)

2. **Should we track GLM costs separately?**
   - For billing reconciliation
   - Proposed: Yes, add `provider` field to cost tracking

3. **What if GLM is also expensive?**
   - Need cost comparison before failover
   - Proposed: Skip for now; assume GLM is cheaper

4. **Should we have different thresholds per model?**
   - Opus might warrant different threshold than Haiku
   - Proposed: Start with global threshold, refine later
