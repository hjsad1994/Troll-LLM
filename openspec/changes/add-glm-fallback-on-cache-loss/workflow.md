# Workflow: GLM Fallback on Cache Loss

## Overview

Workflow tự động chuyển từ OhMyGPT sang GLM 4.7 khi cache không hoạt động và gây chi phí lớn.

---

## Simplified State Machine

```
                    ┌─────────────────────────────────────────┐
                    │           NORMAL STATE                  │
                    │           (Using OhMyGPT)               │
                    └─────────────────┬───────────────────────┘
                                      │
                                      │ User request
                                      ▼
                    ┌─────────────────────────────────────────┐
                    │         CHECK CACHE RESPONSE            │
                    │  - cache_read_input_tokens == 0 ?       │
                    │  - cache_creation_input_tokens == 0 ?   │
                    │  - estimated_loss > $1.50 ?             │
                    └─────────────────┬───────────────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                    ANY FALSE                 ALL TRUE
                    (Cache OK /             (Cache Miss +
                     Low Loss)               Loss > $1.50)
                         │                         │
                         ▼                         ▼
              ┌──────────────────┐     ┌───────────────────────────┐
              │ STAY ON          │     │ ACTIVATE FAILOVER         │
              │ OHMYGPT          │     │ - Set failover_until =    │
              │ Continue normal  │     │   now + 15 minutes        │
              └──────────────────┘     │ - Log warning             │
                       │               └───────────┬───────────────┘
                       │                           │
                       │                           ▼
                       │            ┌─────────────────────────────────────────┐
                       │            │         FAILOVER STATE                  │
                       │            │  (Forwarding ALL requests to GLM 4.7)   │
                       │            └─────────────────┬───────────────────────┘
                       │                              │
                       │                              │ For 15 minutes
                       │                              │
                       │                              │ After 15 min
                       │                              ▼
                       │            ┌─────────────────────────────────────────┐
                       │            │    AUTO RETURN TO NORMAL STATE          │
                       │            │    - Clear failover state              │
                       │            │    - Use OhMyGPT normally               │
                       └────────────┴─────────────────────────────────────────┘
                                                 │
                                                 │ Back to OhMyGPT
                                                 │ Use OhMyGPT normally
                                                 │
                                                 │ If cache miss + loss > $1.50 again
                                                 │ → Trigger new failover cycle
                                                 ▼
                                          (Back to top - NORMAL STATE)
```

---

## Key Simplification

**NO special retry logic!** Just:
1. 15 phút expire → Auto back to OhMyGPT
2. Use OhMyGPT normally
3. If trigger conditions met again → New failover cycle

---

## Detailed Steps

### Step 1: Normal Operation (OhMyGPT)

```
User Request → selectUpstreamConfig()
               ↓
            Check failover state → NOT in failover
               ↓
            Route to OhMyGPT
               ↓
            Receive response with usage data
               ↓
            CacheDetector.RecordEvent()
               ↓
            ┌────────────────┬────────────────┐
            │                │                │
        Cache OK      Cache Miss      Cache Miss
        Loss < $1.50   Loss < $1.50    Loss > $1.50
            │              │               │
            ▼              ▼               ▼
        Stay OhMyGPT   Stay OhMyGPT  ⚠️ ACTIVATE FAILOVER
```

### Step 2: Failover Activated

```
CacheDetector detects:
- cache_read_input_tokens == 0
- cache_creation_input_tokens == 0
- estimated_loss = $48.60 (>$1.50)

Action:
failoverManager.ActivateFailover(
    model: "claude-opus-4-5-20251101",
    duration: 15 minutes
)

Result:
- failover_until = 10:15:00
- Log: "⚠️ [Cache Failover] Loss $48.60 exceeds threshold,
        switching claude-opus-4-5-20251101 to GLM for 15 minutes"
```

### Step 3: Failover Mode (Next 15 minutes)

```
For ANY request during this period:

User Request → selectUpstreamConfig()
               ↓
            Check failover state → IN FAILOVER
               ↓
            current_time (10:05) < failover_until (10:15)?
               ↓
            YES → Route to GLM 4.7
               ↓
            - Model: claude-opus-4-5-20251101 → glm-4.7 (internal)
            - Preserve original model name in response
            - Return response to user

This continues until 10:15:00
```

### Step 4: Auto Return to Normal (After 15 min)

```
At 10:15:01:

User Request → selectUpstreamConfig()
               ↓
            Check failover state → IN FAILOVER
               ↓
            current_time (10:15:01) < failover_until (10:15:00)?
               ↓
            NO → Auto clear failover state
               ↓
            failoverManager.ClearFailover("claude-opus-4-5-20251101")
               ↓
            Log: "✅ [Failover] claude-opus-4-5-20251101 cooldown expired,
                  returning to OhMyGPT"
               ↓
            Route to OhMyGPT (NORMAL OPERATION)
```

### Step 5: Back to Normal - Monitor Again

```
Now using OhMyGPT normally again:

User Request → selectUpstreamConfig()
               ↓
            Check failover state → NOT in failover
               ↓
            Route to OhMyGPT
               ↓
            CacheDetector.RecordEvent() - Monitor again!
               ↓
            ┌────────────────┬────────────────┐
            │                │                │
        Cache OK      Cache Miss      Cache Miss
        Loss < $1.50   Loss < $1.50    Loss > $1.50
            │              │               │
            ▼              ▼               ▼
        Stay OhMyGPT   Stay OhMyGPT  ⚠️ ACTIVATE FAILOVER
                                             (NEW CYCLE)
```

---

## Timeline Example

```
Time          Event                          Provider      State
─────────────────────────────────────────────────────────────────
10:00:00     User request #1               OhMyGPT       Normal
10:00:01     Response: cache_read=0        -            -
10:00:01     Loss: $48.60 > $1.50          -            -
10:00:02     ⚠️ FAILOVER ACTIVATED          -            → Failover
10:00:02     failover_until = 10:15:00      -            -

─────────────────────────────────────────────────────────────────
10:01:00     User request #2               GLM 4.7      Failover
10:02:30     User request #3               GLM 4.7      Failover
10:05:00     User request #4               GLM 4.7      Failover
10:10:00     User request #5               GLM 4.7      Failover
10:14:59     User request #6               GLM 4.7      Failover

─────────────────────────────────────────────────────────────────
10:15:01     User request #7               OhMyGPT       → Normal
10:15:01     ✅ 15min expired, auto back   -            -
10:15:02     Request to OhMyGPT            OhMyGPT       Normal
10:15:03     Response: cache_read=7500     -            -
10:15:03     Loss: $0.50 (cache hit!)      -            -
10:15:04     Stay on OhMyGPT               OhMyGPT       Normal ✅
```

---

## Alternative: Cache Still Bad After 15 Min

```
Time          Event                          Provider      State
─────────────────────────────────────────────────────────────────
10:15:01     User request #7               OhMyGPT       → Normal
10:15:02     Request to OhMyGPT            OhMyGPT       Normal
10:15:03     Response: cache_read=0        -            -
10:15:03     Loss: $42.00 > $1.50          -            -
10:15:04     ⚠️ FAILOVER REACTIVATED        -            → Failover
10:15:04     failover_until = 10:30:00      -            -

─────────────────────────────────────────────────────────────────
10:16:00     User request #8               GLM 4.7      Failover
10:20:00     User request #9               GLM 4.7      Failover
...
```

---

## Key Points

| Aspect | Behavior |
|--------|----------|
| **Failover trigger** | Cache miss + Loss > $1.50 |
| **Failover duration** | 15 minutes (fixed) |
| **After 15 min** | Auto back to OhMyGPT (no special retry) |
| **Back to normal** | Use OhMyGPT normally, monitor each response |
| **Re-trigger** | If cache miss + loss > $1.50 again → New cycle |
| **Per-model** | Each model has independent failover state |

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `CACHE_FAILOVER_ENABLED` | `false` | Master switch |
| `CACHE_FAILOVER_LOSS_THRESHOLD` | `1.50` | Loss threshold (USD) |
| `CACHE_FAILOVER_COOLDOWN_MINUTES` | `15` | Failover duration |
| `GLM_API_KEY` | - | GLM authentication |
| `GLM_ENDPOINT` | `https://api.z.ai/api/paas/v4/chat/completions` | GLM API URL |

---

## Per-Model Isolation Example

```
claude-opus-4-5-20251101  → [Cache Miss $48] → FAILOVER → GLM
claude-sonnet-4-5-20250929 → [Cache OK]     → NORMAL  → OhMyGPT ✅
claude-haiku-4-5-20251001  → [Cache Miss $2] → NORMAL  → OhMyGPT ✅
                                                           (loss <$1.50)

After 15 min:
claude-opus-4-5-20251101  → [Auto back]    → NORMAL  → OhMyGPT
claude-sonnet-4-5-20250929 → [Still OK]    → NORMAL  → OhMyGPT ✅
claude-haiku-4-5-20251001  → [Still OK]    → NORMAL  → OhMyGPT ✅
```
