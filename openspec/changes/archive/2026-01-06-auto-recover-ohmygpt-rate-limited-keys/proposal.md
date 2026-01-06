# Auto-Recover OhMyGPT Rate-Limited Keys

## Summary

Implement automatic recovery for OhMyGPT API keys that have been rate-limited, resetting their status back to `healthy` after a **2-minute cooldown period** instead of requiring manual intervention.

## Context

Currently, when an OhMyGPT API key receives a `429` (rate limit) response from the upstream provider:

1. The key is marked as `rate_limited` status with a 60-second `cooldownUntil` timestamp
2. The key becomes unavailable for the round-robin rotation
3. **The key is NEVER automatically reset to `healthy` status**
4. Admin must manually reset the key via the `/ohmygpt-keys` admin page

This creates operational issues:
- Keys remain in `rate_limited` state indefinitely after the cooldown expires
- Manual intervention is required to recover keys
- Reduces the effective key pool size over time
- Requires admin attention even though the rate limit is temporary

### Current Implementation (goproxy/internal/ohmygpt/ohmygpt.go)

**Line 275-277: MarkRateLimited**
```go
func (p *OhMyGPTProvider) MarkRateLimited(keyID string) {
    p.MarkStatus(keyID, OhMyGPTStatusRateLimited, 60*time.Second, "Rate limited by upstream")
    log.Printf("⚠️ [Troll-LLM] OhMyGPT Key %s rate limited (cooldown: 60s)", keyID)
}
```

**Line 56-67: IsAvailable()**
```go
func (k *OhMyGPTKey) IsAvailable() bool {
    if k.Status == OhMyGPTStatusExhausted {
        return false
    }
    if k.Status != OhMyGPTStatusHealthy {
        if k.CooldownUntil != nil && time.Now().After(*k.CooldownUntil) {
            return true // Cooldown expired
        }
        return false
    }
    return true
}
```

**Issue:** The `IsAvailable()` method checks if cooldown has expired, BUT it doesn't automatically update the `status` field back to `healthy`. The key remains with `status: "rate_limited"` in both memory and MongoDB indefinitely.

## Change Scope

Implement a **background goroutine** that periodically checks for rate-limited keys whose cooldown has expired and automatically resets them to `healthy` status.

### Core Requirements

1. **Change cooldown duration from 60s to 2 minutes (120s)** for rate-limited keys
2. **Add background recovery service** that runs every 30 seconds
3. **Auto-reset rate-limited keys to healthy** when `cooldownUntil < now`
4. **Update both in-memory and MongoDB** state
5. **Log recovery actions** for observability

### Modified Behavior

When a key is rate-limited:
- Mark status as `rate_limited`
- Set `cooldownUntil = now + 2 minutes` (changed from 60s)
- Key becomes unavailable for selection

After 2 minutes:
- Background service detects expired cooldown
- Automatically resets status to `healthy`
- Clears `cooldownUntil` and `lastError` fields
- Key becomes available again
- Logs: `✅ [Troll-LLM] OhMyGPT Auto-recovered key {id} from rate_limited`

## Design

### Architecture

**Component:** `OhMyGPTAutoRecovery` service in `goproxy/internal/ohmygpt/`

**Responsibilities:**
- Run as background goroutine started with `ConfigureOhMyGPT()`
- Execute every 30 seconds (configurable via constant)
- Query MongoDB for keys with `status: "rate_limited"` and `cooldownUntil < now`
- Batch update matching keys to `status: "healthy"` with cleared error fields
- Sync in-memory cache to reflect recovered keys
- Log each recovery action

### Configuration

Add constant in `goproxy/internal/ohmygpt/ohmygpt.go`:
```go
const (
    RateLimitCooldownDuration    = 2 * time.Minute  // Changed from 60s
    AutoRecoveryCheckInterval    = 30 * time.Second // Check every 30s
)
```

### Database Operations

**Query:**
```go
db.OhMyGPTKeysCollection().UpdateMany(ctx,
    bson.M{
        "status": "rate_limited",
        "cooldownUntil": bson.M{"$lt": time.Now()},
    },
    bson.M{
        "$set": bson.M{
            "status": "healthy",
            "lastError": "",
            "cooldownUntil": nil,
        },
    },
)
```

**In-Memory Sync:**
- After DB update, reload keys via `LoadKeys()` or directly update in-memory key objects
- Prefer direct update to avoid full reload overhead

### Edge Cases

1. **No rate-limited keys:** Service logs "No keys to recover" and sleeps
2. **Concurrent access:** Lock `p.mu` during in-memory updates
3. **Database errors:** Log error, retry next interval
4. **Keys in rotation:** Recovered keys automatically become available on next `SelectKey()`

## Validation

After implementation, verify:

1. **Rate limit marks key correctly:**
   - Send request → 429 response
   - Key status = `rate_limited`
   - `cooldownUntil` = now + 2 minutes
   - Log: `⚠️ [Troll-LLM] OhMyGPT Key {id} rate limited (cooldown: 2m0s)`

2. **Auto-recovery after 2 minutes:**
   - Wait 2+ minutes
   - Check logs: `✅ [Troll-LLM] OhMyGPT Auto-recovered key {id} from rate_limited`
   - Key status = `healthy`
   - `cooldownUntil` = null
   - Key available in rotation

3. **No manual reset required:**
   - Admin page shows key as healthy without manual intervention
   - Key pool count returns to original after cooldown

4. **Multiple keys recovered:**
   - Rate limit multiple keys
   - All recover automatically after 2 minutes

## Related Changes

- **Modifies:** `goproxy/internal/ohmygpt/ohmygpt.go`
- **No frontend changes:** Admin UI already displays status correctly
- **No API changes:** Existing endpoints work unchanged

## Risk Assessment

**Low Risk**

**Why safe:**
- No breaking changes to existing behavior
- Adds new background service (isolated)
- Uses same MongoDB operations as existing `MarkStatus()`
- Cooldown change (60s → 2m) reduces false-positive recovery attempts
- Idempotent operation (can recover same key multiple times safely)

**Potential issues:**
- **Race condition:** If key is marked rate-limited during recovery check
  - **Mitigation:** Use `$lt` query ensures only expired cooldowns are recovered
- **Memory sync lag:** Brief window where DB shows `healthy` but memory shows `rate_limited`
  - **Mitigation:** Lock during update, 30s check interval minimizes window

## Open Questions

**None** - requirements are clear:
- 2-minute cooldown for rate-limited keys
- Auto-recover to healthy after cooldown expires
- Background service with 30-second check interval

## Alternative Approaches Considered

### Alternative 1: Reset in SelectKey() when cooldown expires
**Pros:** Simpler, no background service
**Cons:** Only recovers keys when selected (may be never), lazy evaluation

### Alternative 2: Keep 60s cooldown
**Pros:** Faster recovery
**Cons:** May be too aggressive if upstream rate limits are longer, 2 minutes is safer

### Alternative 3: Manual reset only (current behavior)
**Pros:** Full admin control
**Cons:** Operational burden, reduces effective pool size

**Decision:** Alternative with background service provides best balance of automation and safety.
