# Design: Cache Fallback Detection with Email Alert

## Overview

Phát hiện khi **nhiều request OhMyGPT không return cache tokens** → Gửi email thông báo qua Resend API.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              GoProxy                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐      ┌──────────────────────────────────────────┐ │
│  │ OhMyGPT Response│ ───> │ Cache Detection Logic                    │ │
│  │ Handler         │      │ - Check model supports cache?            │ │
│  └─────────────────┘      │ - Check input > 1024 tokens?             │ │
│                           │ - Check cache tokens = 0?                │ │
│                           └──────────────┬───────────────────────────┘ │
│                                          │                              │
│                                          ▼                              │
│                           ┌──────────────────────────────────────────┐ │
│                           │ Event Buffer (Sliding Window)             │ │
│                           │ - Store events with timestamps            │ │
│                           │ - Keep events from last N minutes         │ │
│                           │ - Count events in window                  │ │
│                           └──────────────┬───────────────────────────┘ │
│                                          │                              │
│                                          ▼ Count >= threshold?          │
│                           ┌──────────────────────────────────────────┐ │
│                           │ Rate Limiter                              │ │
│                           │ - Last alert timestamp                    │ │
│                           │ - Min interval: 5 minutes                  │ │
│                           └──────────────┬───────────────────────────┘ │
│                                          │                              │
│                                          ▼ Should alert?                │
│                           ┌──────────────────────────────────────────┐ │
│                           │ Send Email via Resend API                 │ │
│                           │ POST https://api.resend.com/emails        │ │
│                           │ To: trantai306@gmail.com                   │ │
│                           │ Subject: ⚠️ Multiple OhMyGPT No Cache     │ │
│                           │ Body: Event count, models, total loss     │ │
│                           └──────────────────────────────────────────┘ │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Data Structures

```go
// Cache fallback event
type CacheFallbackEvent struct {
    Timestamp     time.Time  `json:"timestamp"`
    Model         string     `json:"model"`          // claude-opus-4.5
    InputTokens   int64      `json:"input_tokens"`
    CacheRead     int64      `json:"cache_read"`     // = 0
    CacheWrite    int64      `json:"cache_write"`    // = 0
    EstimatedLoss float64    `json:"estimated_loss"` // USD
}

// Event buffer with sliding window
type EventBuffer struct {
    events       []CacheFallbackEvent
    windowSize   time.Duration // 1 minute
    mu           sync.RWMutex
}

// Rate limiter state
type AlertRateLimiter struct {
    lastAlertTime time.Time
    minInterval   time.Duration // 5 minutes
    mu            sync.Mutex
}

// Main detector
type CacheDetector struct {
    buffer         *EventBuffer
    rateLimiter    *AlertRateLimiter
    resendClient   *resend.Client
    thresholdCount int  // 5 events
    windowSize     time.Duration // 1 minute
    enabled        bool
}
```

## Detection Logic

```go
func (d *CacheDetector) RecordEvent(model string, inputTokens, cacheRead, cacheWrite int64) {
    // 1. Check if model supports cache
    if !d.modelSupportsCache(model) {
        return // Not a cache-enabled model
    }

    // 2. Check if request is large enough to expect cache
    if inputTokens < 1024 {
        return // Too small, cache not expected
    }

    // 3. Check if cache tokens are zero
    if cacheRead > 0 || cacheWrite > 0 {
        return // Cache is working
    }

    // 4. Calculate estimated loss
    loss := d.calculateLoss(model, inputTokens)

    // 5. Create and store event
    event := CacheFallbackEvent{
        Timestamp:     time.Now(),
        Model:         model,
        InputTokens:   inputTokens,
        CacheRead:     cacheRead,
        CacheWrite:    cacheWrite,
        EstimatedLoss: loss,
    }

    d.buffer.AddEvent(event)

    // 6. Check if we should alert
    eventsInWindow := d.buffer.GetEventsInWindow()
    if len(eventsInWindow) >= d.thresholdCount {
        d.maybeSendAlert(eventsInWindow)
    }
}

func (d *CacheDetector) modelSupportsCache(model string) bool {
    cacheModels := []string{
        "claude-opus-4.5",
        "claude-sonnet-4.5",
        "claude-haiku-4.5",
    }
    for _, m := range cacheModels {
        if strings.Contains(model, m) {
            return true
        }
    }
    return false
}

func (d *CacheDetector) calculateLoss(model string, inputTokens int64) float64 {
    // Cache hit price: $0.5/MTok (Opus), regular price: $15/MTok
    // Loss = (regular - cache) * tokens
    cachePrice := 0.5  // USD per MTok
    regularPrice := 15.0 // USD per MTok

    return (regularPrice - cachePrice) * (float64(inputTokens) / 1_000_000)
}
```

## Event Buffer (Sliding Window)

```go
func (b *EventBuffer) AddEvent(event CacheFallbackEvent) {
    b.mu.Lock()
    defer b.mu.Unlock()

    b.events = append(b.events, event)

    // Remove events outside the time window
    cutoff := time.Now().Add(-b.windowSize)
    var validEvents []CacheFallbackEvent
    for _, e := range b.events {
        if e.Timestamp.After(cutoff) {
            validEvents = append(validEvents, e)
        }
    }
    b.events = validEvents
}

func (b *EventBuffer) GetEventsInWindow() []CacheFallbackEvent {
    b.mu.RLock()
    defer b.mu.RUnlock()

    // Return copy of events in window
    result := make([]CacheFallbackEvent, len(b.events))
    copy(result, b.events)
    return result
}

func (b *EventBuffer) Clear() {
    b.mu.Lock()
    defer b.mu.Unlock()
    b.events = []CacheFallbackEvent{}
}
```

## Alert Logic

```go
func (d *CacheDetector) maybeSendAlert(events []CacheFallbackEvent) {
    // 1. Check rate limiter
    if !d.rateLimiter.ShouldSend() {
        log.Printf("⏸️  Threshold reached but rate limited")
        return
    }

    // 2. Aggregate statistics
    totalLoss := 0.0
    modelCounts := make(map[string]int)
    for _, e := range events {
        totalLoss += e.EstimatedLoss
        modelCounts[e.Model]++
    }

    // 3. Send alert
    d.sendAlert(len(events), totalLoss, modelCounts)

    // 4. Clear buffer after successful alert
    d.buffer.Clear()
}
```

## Email Format (Resend API)

```go
func (d *CacheDetector) sendAlert(eventCount int, totalLoss float64, modelCounts map[string]int) {
    // Build model summary
    var modelSummary []string
    for model, count := range modelCounts {
        modelSummary = append(modelSummary, fmt.Sprintf("%s: %d requests", model, count))
    }

    req := resend.SendEmailRequest{
        From: "TrollLLM Alert <alerts@trollllm.xyz>",
        To:   []string{os.Getenv("CACHE_FALLBACK_ALERT_EMAIL")},
        Subject: fmt.Sprintf("⚠️ OhMyGPT Cache Fallback: %d requests detected", eventCount),
        HTMLBody: fmt.Sprintf(`
            <h2>⚠️ Multiple Cache Fallbacks Detected</h2>
            <p><strong>Time Window:</strong> Last %d minutes</p>
            <p><strong>Total Events:</strong> %d requests</p>
            <p><strong>Total Estimated Loss:</strong> $%.2f</p>

            <h3>Affected Models:</h3>
            <ul>
                %s
            </ul>

            <hr>
            <p><small>This is an automated alert from TrollLLM GoProxy</small></p>
        `,
            d.buffer.windowSize.Minutes(),
            eventCount,
            totalLoss,
            strings.Join(modelSummary, "\n                "),
        ),
    }

    err := d.resendClient.Email.Send(&req)
    if err != nil {
        log.Printf("❌ Failed to send cache fallback alert: %v", err)
    } else {
        log.Printf("✅ Cache fallback alert sent: %d events, $%.2f loss", eventCount, totalLoss)
        d.rateLimiter.RecordSent()
    }
}
```

## Rate Limiter

```go
type AlertRateLimiter struct {
    lastAlertTime time.Time
    minInterval   time.Duration
    mu            sync.Mutex
}

func (r *AlertRateLimiter) ShouldSend() bool {
    r.mu.Lock()
    defer r.mu.Unlock()

    now := time.Now()
    if now.Sub(r.lastAlertTime) < r.minInterval {
        return false // Too soon
    }
    return true
}

func (r *AlertRateLimiter) RecordSent() {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.lastAlertTime = time.Now()
}
```

## Integration Point

In `goproxy/internal/ohmygpt/ohmygpt.go`:

```go
// After parsing usage in HandleStreamResponse
if cacheCreation > 0 || cacheRead > 0 {
    log.Printf("📊 [Troll-LLM] OhMyGPT Usage: in=%d out=%d cache_create=%d cache_read=%d ⚡",
        totalInput, totalOutput, cacheCreation, cacheRead)
} else {
    log.Printf("📊 [Troll-LLM] OhMyGPT Usage: in=%d out=%d", totalInput, totalOutput)

    // Record potential cache fallback event
    detector := GetCacheDetector()
    if detector != nil && detector.enabled {
        detector.RecordEvent(modelID, totalInput, cacheRead, cacheCreation)
    }
}
```

## Configuration

```go
// Load from environment
type CacheDetectorConfig struct {
    Enabled              bool
    ResendAPIKey         string
    AlertEmail           string
    ThresholdCount       int  // 5 events
    TimeWindowMin        int  // 5 minutes
    AlertIntervalMin     int  // 5 minutes
}

func LoadConfig() *CacheDetectorConfig {
    return &CacheDetectorConfig{
        Enabled:              os.Getenv("CACHE_FALLBACK_DETECTION") == "true",
        ResendAPIKey:         os.Getenv("RESEND_API_KEY"),
        AlertEmail:           os.Getenv("CACHE_FALLBACK_ALERT_EMAIL"),
        ThresholdCount:       parseIntOrDefault(os.Getenv("CACHE_FALLBACK_THRESHOLD_COUNT"), 5),
        TimeWindowMin:        parseIntOrDefault(os.Getenv("CACHE_FALLBACK_TIME_WINDOW_MIN"), 1),
        AlertIntervalMin:     parseIntOrDefault(os.Getenv("CACHE_FALLBACK_ALERT_INTERVAL_MIN"), 5),
    }
}
```

## Dependencies

Add to `go.mod`:
```go
require github.com/resend/resend-go vlatest
```

## Error Handling

```go
// If Resend API fails, log but don't crash
// Don't clear buffer - will retry on next event
func (d *CacheDetector) sendAlert(...) {
    // ... prepare request ...

    err := d.resendClient.Email.Send(&req)
    if err != nil {
        // Log error but DON'T update rate limiter or clear buffer
        // This allows retry when threshold is reached again
        log.Printf("❌ Failed to send alert (will retry): %v", err)
        return
    }

    // Only update rate limiter and clear buffer on success
    d.rateLimiter.RecordSent()
    d.buffer.Clear()
}
```

## Example Scenarios

### Scenario 1: Normal operation (cache working)
```
Request 1: cache_read = 5000 ✓ (no event recorded)
Request 2: cache_read = 3000 ✓ (no event recorded)
Request 3: cache_read = 4000 ✓ (no event recorded)
→ No alert
```

### Scenario 2: Single failed request (not enough to alert)
```
Request 1: cache_read = 0 (event recorded, count = 1)
Request 2: cache_read = 5000 ✓ (no event)
Request 3: cache_read = 3000 ✓ (no event)
→ Count = 1, threshold = 5, no alert
```

### Scenario 3: Threshold reached (alert sent)
```
Time 00:00 - Request 1: cache_read = 0 (event 1)
Time 00:10 - Request 2: cache_read = 0 (event 2)
Time 00:20 - Request 3: cache_read = 0 (event 3)
Time 00:30 - Request 4: cache_read = 0 (event 4)
Time 00:40 - Request 5: cache_read = 0 (event 5) → THRESHOLD REACHED
→ Send email
→ Clear buffer
→ Reset rate limiter
```

### Scenario 4: Rate limited
```
(Previous alert sent at 10:00)
Time 10:02 - 5 more cache fallback events detected
→ Threshold reached but rate limited (only 2 min passed)
→ Wait for next event or time window
```

## Testing

```go
// Unit test
func TestCacheDetection(t *testing.T) {
    detector := NewCacheDetector()
    detector.thresholdCount = 3
    detector.windowSize = 1 * time.Minute

    // Case 1: Model doesn't support cache
    detector.RecordEvent("gpt-4", 5000, 0, 0)
    assert.Equal(t, 0, len(detector.buffer.GetEventsInWindow()))

    // Case 2: Request too small
    detector.RecordEvent("claude-opus-4.5", 500, 0, 0)
    assert.Equal(t, 0, len(detector.buffer.GetEventsInWindow()))

    // Case 3: Cache is working
    detector.RecordEvent("claude-opus-4.5", 5000, 1000, 0)
    assert.Equal(t, 0, len(detector.buffer.GetEventsInWindow()))

    // Case 4: Threshold reached
    detector.RecordEvent("claude-opus-4.5", 5000, 0, 0) // event 1
    detector.RecordEvent("claude-opus-4.5", 5000, 0, 0) // event 2
    detector.RecordEvent("claude-opus-4.5", 5000, 0, 0) // event 3 → alert!

    // Buffer should be cleared after alert
    assert.Equal(t, 0, len(detector.buffer.GetEventsInWindow()))
}
```
