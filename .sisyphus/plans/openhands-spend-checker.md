# OpenHands Proactive Spend-Based Key Rotation

## Overview
Implement proactive API key rotation for OpenHands upstream. Rotate keys BEFORE hitting $10 limit (at $9.8) to prevent user streaming interruption.

## Configuration
| Parameter | Default | Env Variable |
|-----------|---------|--------------|
| Spend Threshold | $9.95 | `OPENHANDS_SPEND_THRESHOLD` |
| Active Key Window | 4 minutes | hardcoded |

### Tiered Check Intervals (based on current spend)
| Spend Range | Check Interval | Description |
|-------------|----------------|-------------|
| < $5 (LOW) | 5 minutes | Low spend, infrequent checks |
| $5 - $7 (MEDIUM) | 2 minutes | Moderate spend, moderate checks |
| >= $7 (HIGH) | 10 seconds | Approaching limit, frequent checks |

**Note:** The legacy `OPENHANDS_ACTIVE_CHECK_INTERVAL` and `OPENHANDS_IDLE_CHECK_INTERVAL` env vars are no longer used. The check interval is now dynamically determined by the key's current spend level.

## OpenHands API for Spend Check
```
GET https://llm-proxy.app.all-hands.dev/user/daily/activity
  ?start_date=2020-01-01&end_date=2030-12-31&page=1&page_size=1
Header: x-litellm-api-key: <api_key>
Response: { "metadata": { "total_spend": 7.50 } }
```

---

## Task 1: Fix Bug - Update lastUsedAt in main.go [CRITICAL]

### Problem
Two locations in `goproxy/main.go` update OpenHands key stats but do NOT update `lastUsedAt`:
- Line ~1569 (OpenAI format handler)
- Line ~1994 (Anthropic format handler)

### Files to Modify
- `goproxy/main.go`

### Changes (BOTH locations ~1569 and ~1994)

**BEFORE:**
```go
db.OpenHandsKeysCollection().UpdateByID(ctx, key.ID, bson.M{
    "$inc": bson.M{
        "tokensUsed":    input + output,
        "requestsCount": 1,
    },
})
```

**AFTER:**
```go
db.OpenHandsKeysCollection().UpdateByID(ctx, key.ID, bson.M{
    "$inc": bson.M{
        "tokensUsed":    input + output,
        "requestsCount": 1,
    },
    "$set": bson.M{
        "lastUsedAt": time.Now(),
    },
})
```

### Verification
```bash
grep -A5 'OpenHandsKeysCollection().UpdateByID' goproxy/main.go | grep lastUsedAt
# Should show 2 matches
```

---

## Task 2: Extend OpenHandsKey Struct

### Files to Modify
1. `goproxy/internal/openhands/openhands.go` (line 44-53 for struct, + new method `getClientWithProxyOnly`)
2. `backend/src/services/openhands.service.ts` (line 3-17)
3. `goproxy/internal/openhands/backup.go` (line 289-296)

### Go Struct (openhands.go)
Add after `CreatedAt` field:
```go
// NEW FIELDS for spend tracking
LastUsedAt     *time.Time `bson:"lastUsedAt,omitempty" json:"last_used_at,omitempty"`
TotalSpend     float64    `bson:"totalSpend" json:"total_spend"`
LastSpendCheck *time.Time `bson:"lastSpendCheck,omitempty" json:"last_spend_check,omitempty"`
```

### TypeScript Interface (openhands.service.ts)
Add after existing fields:
```typescript
// NEW: Spend tracking
lastUsedAt?: Date;
totalSpend?: number;
lastSpendCheck?: Date;
```

### In-Memory Key Creation (backup.go line 289-296)
Add fields when creating new key in memory after rotation:
```go
newKeys = append(newKeys, &OpenHandsKey{
    ID:            backupKey.ID,
    APIKey:        backupKey.APIKey,
    Status:        OpenHandsStatusHealthy,
    TokensUsed:    0,
    RequestsCount: 0,
    CreatedAt:     now,
    LastUsedAt:    nil,        // NEW
    TotalSpend:    0,          // NEW
    LastSpendCheck: nil,       // NEW
})
```

---

## Task 3: Create SpendChecker Service [CORE]

### New File
`goproxy/internal/openhands/spend_checker.go`

### Constants
```go
const (
    OpenHandsActivityURL       = "https://llm-proxy.app.all-hands.dev/user/daily/activity"
    DefaultSpendThreshold      = 9.8
    DefaultActiveCheckInterval = 10 * time.Second
    DefaultIdleCheckInterval   = 1 * time.Hour
    ActiveKeyWindow            = 4 * time.Minute
    SpendHistoryCollection     = "openhands_key_spend_history"
)
```

### Structs

```go
// SpendChecker monitors OpenHands key spend and triggers proactive rotation
type SpendChecker struct {
    provider            *OpenHandsProvider
    threshold           float64
    activeCheckInterval time.Duration
    idleCheckInterval   time.Duration
    stopChan            chan struct{}
    running             bool
    mu                  sync.Mutex
}

// SpendCheckResult represents the result of a spend check API call
type SpendCheckResult struct {
    KeyID      string
    APIKey     string
    Spend      float64
    Threshold  float64
    WasActive  bool
    CheckedAt  time.Time
    Error      error
}

// SpendHistoryEntry represents a spend check history record
type SpendHistoryEntry struct {
    KeyID          string     `bson:"keyId"`
    APIKeyMasked   string     `bson:"apiKeyMasked"`
    Spend          float64    `bson:"spend"`
    Threshold      float64    `bson:"threshold"`
    CheckedAt      time.Time  `bson:"checkedAt"`
    WasActive      bool       `bson:"wasActive"`
    RotatedAt      *time.Time `bson:"rotatedAt,omitempty"`
    RotationReason string     `bson:"rotationReason,omitempty"`
    NewKeyID       string     `bson:"newKeyId,omitempty"`
}
```

### Key Methods

1. **NewSpendChecker(provider, threshold, activeInterval, idleInterval)** - Constructor
2. **Start()** - Background goroutine with ticker every activeCheckInterval
3. **Stop()** - Graceful shutdown
4. **checkAllKeys()** - Main loop logic:
   - Get all healthy keys
   - For each key: determine if ACTIVE (lastUsedAt < 4min) or IDLE
   - Check shouldCheckKey based on intervals
   - Call checkKeySpend (use same proxy pool)
   - Log result with emoji: `💰 [OpenHands/SpendChecker] Key X ACTIVE: $Y.YY / $9.80 (Z%)`
   - Save to history collection
   - If spend >= threshold: call RotateKey() and log rotation
5. **isKeyActive(key, now)** - Returns true if lastUsedAt < ActiveKeyWindow
6. **shouldCheckKey(key, isActive, now)** - Smart interval logic
7. **checkKeySpend(key, isActive)** - Call OpenHands API via proxy pool
8. **updateKeySpendInfo(keyID, spend, checkedAt)** - Update MongoDB + memory
9. **saveSpendHistory(result, rotatedAt, reason, newKeyID)** - Insert to history
10. **GetStats()** - Return stats for endpoint

### IMPORTANT: Add New Method to openhands.go

**File**: `goproxy/internal/openhands/openhands.go`

Add this method to OpenHandsProvider (needed because `selectProxyAndKey()` also selects a key, 
but for spend checking we need to use THE SPECIFIC KEY we're checking, not select a new one):

```go
// getClientWithProxyOnly returns HTTP client with proxy configured, WITHOUT selecting a key
// Used by SpendChecker to check spend for a specific key while still using proxy pool
func (p *OpenHandsProvider) getClientWithProxyOnly() (*http.Client, string) {
    p.mu.Lock()
    useProxy := p.useProxy
    pool := p.proxyPool
    p.mu.Unlock()

    if !useProxy || pool == nil {
        return p.client, ""
    }

    selectedProxy, err := pool.SelectProxy()
    if err != nil {
        return p.client, ""
    }

    transport, err := selectedProxy.CreateHTTPTransport()
    if err != nil {
        return p.client, ""
    }

    client := &http.Client{Transport: transport, Timeout: 30 * time.Second}
    return client, selectedProxy.Name
}
```

### API Call Logic (checkKeySpend)
```go
// Build URL
u, _ := url.Parse(OpenHandsActivityURL)
q := u.Query()
q.Set("start_date", "2020-01-01")
q.Set("end_date", "2030-12-31")
q.Set("page", "1")
q.Set("page_size", "1")
u.RawQuery = q.Encode()

// Create request with header - USE THE SPECIFIC KEY WE'RE CHECKING
req.Header.Set("x-litellm-api-key", key.APIKey)

// Get proxy client WITHOUT selecting a new key
// IMPORTANT: Don't use selectProxyAndKey() - it would select a different key!
client, proxyName := sc.provider.getClientWithProxyOnly()

// Parse response
var response struct {
    Metadata struct {
        TotalSpend float64 `json:"total_spend"`
    } `json:"metadata"`
}
```

### Global Instance
```go
var spendChecker *SpendChecker
var spendCheckerOnce sync.Once

func GetSpendChecker() *SpendChecker
func StartSpendChecker(provider, threshold, activeInterval, idleInterval) *SpendChecker
```

---

## Task 4: Integrate SpendChecker in main.go

### File to Modify
`goproxy/main.go`

### Location
After ConfigureOpenHands() success block (~line 4126)

### Add After Existing OpenHands Setup
```go
// NEW: Start SpendChecker for proactive rotation
spendThreshold := openhands.DefaultSpendThreshold
if thresholdStr := getEnv("OPENHANDS_SPEND_THRESHOLD", ""); thresholdStr != "" {
    if parsed, err := strconv.ParseFloat(thresholdStr, 64); err == nil {
        spendThreshold = parsed
    }
}

activeCheckInterval := openhands.DefaultActiveCheckInterval
if intervalStr := getEnv("OPENHANDS_ACTIVE_CHECK_INTERVAL", ""); intervalStr != "" {
    if parsed, err := time.ParseDuration(intervalStr); err == nil {
        activeCheckInterval = parsed
    }
}

idleCheckInterval := openhands.DefaultIdleCheckInterval
if intervalStr := getEnv("OPENHANDS_IDLE_CHECK_INTERVAL", ""); intervalStr != "" {
    if parsed, err := time.ParseDuration(intervalStr); err == nil {
        idleCheckInterval = parsed
    }
}

openhands.StartSpendChecker(openhandsProvider, spendThreshold, activeCheckInterval, idleCheckInterval)
```

### New Endpoint: GET /openhands/spend-stats
Add near other /openhands/ endpoints:
```go
mux.HandleFunc("/openhands/spend-stats", func(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    checker := openhands.GetSpendChecker()
    if checker == nil {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"not_configured","message":"SpendChecker not running"}`))
        return
    }

    stats := checker.GetStats()
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(stats)
})
```

---

## Task 5: Backend API Endpoints

### File to Modify
`backend/src/routes/openhands.routes.ts`

### Endpoint 1: GET /admin/openhands/spend-summary
```typescript
router.get('/spend-summary', async (_req: Request, res: Response) => {
  try {
    const keys = await openhandsService.listKeys();
    
    const summary = {
      total_keys: keys.length,
      healthy_keys: keys.filter(k => k.status === 'healthy').length,
      threshold: 9.8,
      keys: keys.map(k => ({
        id: k._id,
        status: k.status,
        total_spend: (k as any).totalSpend || 0,
        last_spend_check: (k as any).lastSpendCheck,
        last_used_at: (k as any).lastUsedAt,
        spend_percentage: ((k as any).totalSpend || 0) / 9.8 * 100,
      })),
    };

    res.json(summary);
  } catch (error) {
    console.error('Error getting spend summary:', error);
    res.status(500).json({ error: 'Failed to get spend summary' });
  }
});
```

### Endpoint 2: GET /admin/openhands/spend-history
```typescript
router.get('/spend-history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const keyId = req.query.keyId as string;
    
    const filter: any = {};
    if (keyId) filter.keyId = keyId;

    const history = await mongoose.connection.db!
      .collection('openhands_key_spend_history')
      .find(filter)
      .sort({ checkedAt: -1 })
      .limit(limit)
      .toArray();

    res.json({
      total: history.length,
      history: history.map(h => ({
        key_id: h.keyId,
        api_key_masked: h.apiKeyMasked,
        spend: h.spend,
        threshold: h.threshold,
        checked_at: h.checkedAt,
        was_active: h.wasActive,
        rotated_at: h.rotatedAt,
        rotation_reason: h.rotationReason,
        new_key_id: h.newKeyId,
      })),
    });
  } catch (error) {
    console.error('Error getting spend history:', error);
    res.status(500).json({ error: 'Failed to get spend history' });
  }
});
```

### Import Required
Add at top if not present:
```typescript
import mongoose from 'mongoose';
```

---

## Task 6: Tests

### New File
`goproxy/internal/openhands/spend_checker_test.go`

### Test Cases

#### TestSpendThresholdLogic
```go
tests := []struct {
    name         string
    spend        float64
    threshold    float64
    shouldRotate bool
}{
    {"spend below threshold", 5.0, 9.8, false},
    {"spend at threshold", 9.8, 9.8, true},
    {"spend above threshold", 10.5, 9.8, true},
    {"spend just below threshold", 9.79, 9.8, false},
    {"zero spend", 0.0, 9.8, false},
}
```

#### TestKeyActiveDetection
```go
tests := []struct {
    name       string
    lastUsedAt *time.Time
    isActive   bool
}{
    {"nil lastUsedAt", nil, false},
    {"used 1 minute ago", timePtr(now.Add(-1 * time.Minute)), true},
    {"used 3 minutes ago", timePtr(now.Add(-3 * time.Minute)), true},
    {"used 4 minutes ago (boundary)", timePtr(now.Add(-4 * time.Minute)), false},
    {"used 5 minutes ago", timePtr(now.Add(-5 * time.Minute)), false},
}
```

#### TestShouldCheckKeyIntervals
```go
tests := []struct {
    name           string
    lastSpendCheck *time.Time
    isActive       bool
    shouldCheck    bool
}{
    {"never checked, active", nil, true, true},
    {"never checked, idle", nil, false, true},
    {"active, checked 5s ago", timePtr(now.Add(-5 * time.Second)), true, false},
    {"active, checked 10s ago", timePtr(now.Add(-10 * time.Second)), true, true},
    {"idle, checked 30m ago", timePtr(now.Add(-30 * time.Minute)), false, false},
    {"idle, checked 1h ago", timePtr(now.Add(-1 * time.Hour)), false, true},
}
```

#### TestSpendHistoryEntry
Validate struct fields are correctly set.

#### TestMaskAPIKey
```go
tests := []struct {
    apiKey   string
    expected string
}{
    {"sk-abcdefghijklmnop", "sk-abcde...mnop"},
    {"short", "short"},
}
```

#### TestDefaultConstants
Verify: DefaultSpendThreshold=9.8, DefaultActiveCheckInterval=10s, DefaultIdleCheckInterval=1h, ActiveKeyWindow=4m

---

## Implementation Order

| Order | Task | Priority | Est. Time |
|-------|------|----------|-----------|
| 1 | Task 1: Fix lastUsedAt bug | CRITICAL | 10 min |
| 2 | Task 2: Extend struct | HIGH | 15 min |
| 3 | Task 3: SpendChecker service | CORE | 60 min |
| 4 | Task 6: Tests | HIGH | 30 min |
| 5 | Task 4: Integrate main.go | HIGH | 20 min |
| 6 | Task 5: Backend APIs | MEDIUM | 20 min |

**Total Estimated Time: ~2.5 hours**

---

## MongoDB Collections

### openhands_keys (modified)
```javascript
{
  _id: "key-1",
  apiKey: "sk-...",
  status: "healthy",
  tokensUsed: 15000,
  requestsCount: 50,
  createdAt: ISODate(),
  // NEW FIELDS:
  lastUsedAt: ISODate(),      // Updated every request
  totalSpend: 7.50,           // From OpenHands API
  lastSpendCheck: ISODate()   // Last spend check time
}
```

### openhands_key_spend_history (NEW)
```javascript
{
  keyId: "key-1",
  apiKeyMasked: "sk-xxx...yyyy",
  spend: 9.85,
  threshold: 9.8,
  checkedAt: ISODate(),
  wasActive: true,
  rotatedAt: ISODate(),       // null if not rotated
  rotationReason: "proactive_threshold_9.85",
  newKeyId: "key-2"           // null if not rotated
}
```

---

## Environment Variables

| Variable | Default | Example |
|----------|---------|---------|
| `OPENHANDS_SPEND_THRESHOLD` | 9.8 | 9.5 |
| `OPENHANDS_ACTIVE_CHECK_INTERVAL` | 10s | 15s |
| `OPENHANDS_IDLE_CHECK_INTERVAL` | 1h | 30m |

---

## Verification Checklist

- [ ] `lastUsedAt` updated after each request (Task 1)
- [ ] Log: `💰 [OpenHands/SpendChecker] Started (threshold: $9.80, active: 10s, idle: 1h0m0s)`
- [ ] Log: `💰 [OpenHands/SpendChecker] Key X ACTIVE: $Y.YY / $9.80 (Z%)`
- [ ] When spend >= $9.8: `🔄 [OpenHands/SpendChecker] Proactive rotation...`
- [ ] `curl http://localhost:8003/openhands/spend-stats` returns JSON
- [ ] `go test ./internal/openhands/...` passes

---

## Risk Mitigation

1. **API Rate Limiting**: Idle interval 1h reduces API calls significantly
2. **Proxy Pool Failures**: 30s timeout, error logging, continue to next key
3. **Rotation During Streaming**: $9.8 threshold gives ~$0.20 buffer before $10 cutoff
4. **DB Connection Issues**: Non-blocking, log errors, don't halt main flow
