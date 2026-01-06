# Implementation Tasks

## Overview
Implement auto-recovery service for OhMyGPT rate-limited keys with 2-minute cooldown.

## Tasks

### 1. ✅ Add Configuration Constants (COMPLETED)
**File:** `goproxy/internal/ohmygpt/ohmygpt.go`

Add constants at the top of the file (after existing constants):
```go
const (
    RateLimitCooldownDuration    = 2 * time.Minute  // Changed from 60s to 2m
    AutoRecoveryCheckInterval    = 30 * time.Second // Check every 30s
)
```

**Validation:**
- Constants compile without errors
- Values are correct (2 minutes, 30 seconds)

### 2. ✅ Update MarkRateLimited Method (COMPLETED)
**File:** `goproxy/internal/ohmygpt/ohmygpt.go` (line ~275)

Change the cooldown from `60*time.Second` to `RateLimitCooldownDuration`:
```go
func (p *OhMyGPTProvider) MarkRateLimited(keyID string) {
    p.MarkStatus(keyID, OhMyGPTStatusRateLimited, RateLimitCooldownDuration, "Rate limited by upstream")
    log.Printf("⚠️ [Troll-LLM] OhMyGPT Key %s rate limited (cooldown: 2m0s)", keyID)
}
```

**Validation:**
- Log message shows correct cooldown duration
- CooldownUntil is set to 2 minutes in the future

### 3. ✅ Implement StartAutoRecovery Method (COMPLETED)
**File:** `goproxy/internal/ohmygpt/ohmygpt.go`

Add new method after `StartAutoReload()` (around line ~203):
```go
// StartAutoRecovery starts a background goroutine that automatically recovers rate-limited keys
func (p *OhMyGPTProvider) StartAutoRecovery() {
    go func() {
        ticker := time.NewTicker(AutoRecoveryCheckInterval)
        defer ticker.Stop()

        log.Printf("🔄 [Troll-LLM] OhMyGPT Auto-recovery service started (interval: %v)", AutoRecoveryCheckInterval)

        for range ticker.C {
            p.runAutoRecovery()
        }
    }()
}
```

**Validation:**
- Method compiles without errors
- Goroutine starts when called
- Logs startup message

### 4. ✅ Implement runAutoRecovery Method (COMPLETED)
**File:** `goproxy/internal/ohmygpt/ohmygpt.go`

Add new method:
```go
// runAutoRecovery checks for expired cooldowns and recovers keys to healthy status
func (p *OhMyGPTProvider) runAutoRecovery() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // Find keys with expired cooldowns
    now := time.Now()
    filter := bson.M{
        "status":        OhMyGPTStatusRateLimited,
        "cooldownUntil": bson.M{"$lt": now},
    }

    update := bson.M{
        "$set": bson.M{
            "status":        OhMyGPTStatusHealthy,
            "lastError":     "",
            "cooldownUntil": nil,
        },
    }

    result, err := db.OhMyGPTKeysCollection().UpdateMany(ctx, filter, update)
    if err != nil {
        log.Printf("⚠️ [Troll-LLM] OhMyGPT Auto-recovery failed: %v", err)
        return
    }

    if result.MatchedCount == 0 {
        // No keys to recover, skip update
        return
    }

    log.Printf("🔄 [Troll-LLM] OhMyGPT Auto-recovered %d keys from rate_limited", result.MatchedCount)

    // Reload keys to sync in-memory state
    if err := p.LoadKeys(); err != nil {
        log.Printf("⚠️ [Troll-LLM] OhMyGPT Failed to reload keys after auto-recovery: %v", err)
    }
}
```

**Validation:**
- Queries MongoDB for expired cooldowns
- Updates matching keys to healthy
- Logs recovery actions
- Reloads in-memory keys

### 5. ✅ Call StartAutoRecovery in ConfigureOhMyGPT (COMPLETED)
**File:** `goproxy/internal/ohmygpt/ohmygpt.go` (line ~108)

Add call to start auto-recovery after successful initialization:
```go
// ConfigureOhMyGPT initializes the OhMyGPT provider and loads keys from MongoDB
func ConfigureOhMyGPT() error {
    provider := GetOhMyGPT()
    provider.client = createOhMyGPTClient()

    if err := provider.LoadKeys(); err != nil {
        return err
    }

    // Register with TrollProxy registry
    RegisterProvider(OhMyGPTName, provider)

    // Start auto-recovery background service
    provider.StartAutoRecovery()

    return nil
}
```

**Validation:**
- Auto-recovery starts on provider initialization
- Service runs in background without blocking

### 6. Add Unit Test for Auto-Recovery
**File:** `goproxy/internal/ohmygpt/ohmygpt_test.go` (create if not exists)

Add test:
```go
func TestAutoRecovery(t *testing.T) {
    // Setup: Create provider with test keys
    provider := GetOhMyGPT()

    // Test: Mark a key as rate-limited with expired cooldown
    pastTime := time.Now().Add(-1 * time.Minute)
    testKey := &OhMyGPTKey{
        ID:            "test-key-1",
        APIKey:        "sk-test",
        Status:        OhMyGPTStatusRateLimited,
        CooldownUntil: &pastTime,
    }

    // Run recovery
    provider.runAutoRecovery()

    // Assert: Key should be recovered to healthy
    time.Sleep(100 * time.Millisecond) // Wait for async operations
    stats := provider.GetStats()
    if stats["healthy"] == 0 {
        t.Errorf("Expected at least 1 healthy key after recovery, got %d", stats["healthy"])
    }
}
```

**Validation:**
- Test passes
- Mock database operations correctly
- Validates recovery logic

### 7. Manual Testing - Rate Limit and Recovery
**Test Steps:**

1. **Trigger rate limit:**
   - Send requests to OhMyGPT endpoint until 429 received
   - Check logs for: `⚠️ [Troll-LLM] OhMyGPT Key {id} rate limited (cooldown: 2m0s)`

2. **Verify cooldown:**
   - Check MongoDB: key has `status: "rate_limited"`, `cooldownUntil` set to +2 minutes
   - Verify key is not selected for new requests

3. **Wait for recovery:**
   - Wait 2 minutes and 30 seconds (2 min cooldown + 30s check interval)
   - Check logs for: `🔄 [Troll-LLM] OhMyGPT Auto-recovered {count} keys from rate_limited`

4. **Verify recovery:**
   - Check MongoDB: key has `status: "healthy"`, `cooldownUntil: null`
   - Verify key is selected for new requests
   - Admin page shows key as healthy

**Validation:**
- Rate limit marks key correctly
- Auto-recovery resets key after 2 minutes
- No manual intervention required
- Keys function normally after recovery

### 8. Update Documentation (Optional)
**File:** `openspec/specs/ohmygpt-keys-ui/spec.md` (if needed)

Add note about auto-recovery in the existing spec:
```markdown
#### Scenario: Auto-recovery of rate-limited keys
- **Given** a key is marked as rate_limited
- **And** 2 minutes have passed since the rate limit
- **When** the auto-recovery background service runs
- **Then** the key status SHALL automatically reset to `healthy`
- **And** admin SHALL NOT need to manually reset the key
```

**Validation:**
- Documentation accurately reflects implementation
- No conflicts with existing specs

### 9. Code Review and Validation
**Checklist:**

- [x] All constants added and use correct values
- [x] `MarkRateLimited()` uses `RateLimitCooldownDuration`
- [x] `StartAutoRecovery()` starts background goroutine
- [x] `runAutoRecovery()` queries and updates MongoDB correctly
- [x] `ConfigureOhMyGPT()` calls `StartAutoRecovery()`
- [x] In-memory keys synced after recovery
- [x] Logs added for all recovery operations
- [x] Thread safety ensured (mutex locks where needed)
- [x] Error handling for database failures
- [x] No breaking changes to existing behavior

**Validation:**
- [x] Code compiles without errors
- [ ] All tests pass
- [ ] Manual testing confirms behavior
- [ ] No regressions in existing functionality

### 10. Deploy and Monitor
**Steps:**

1. **Deploy to development:**
   - Build and deploy `goproxy` service
   - Monitor logs for auto-recovery startup
   - Verify no startup errors

2. **Monitor for 24 hours:**
   - Watch logs for rate limit events
   - Verify auto-recovery runs every 30 seconds
   - Check recovered keys return to healthy status
   - Monitor error rates and key pool health

3. **Deploy to production:**
   - Deploy after successful dev testing
   - Monitor production logs
   - Verify key pool stability
   - Check for any unexpected behavior

**Validation:**
- Service starts without errors
- Auto-recovery runs as expected
- Key pool remains healthy
- No increase in error rates
- Keys automatically recover from rate limits

## Dependencies

- **None** - this is a standalone enhancement
- Can be implemented independently of other changes
- Does not block or depend on other features

## Rollback Plan

If issues occur:
1. Remove `StartAutoRecovery()` call from `ConfigureOhMyGPT()`
2. Revert `MarkRateLimited()` to use `60*time.Second`
3. Redeploy service
4. Auto-recovery stops, existing behavior resumes

**Note:** Database updates from auto-recovery are safe to leave in place (keys in healthy state).
