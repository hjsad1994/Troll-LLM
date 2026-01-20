# Tasks: Cache Fallback Detection Implementation

## Phase 1: Create Cache Detector Package

### Task 1.1: Create package structure
- [x] Create `goproxy/internal/cache/` directory
- [x] Create `detector.go` file
- [x] Define `CacheFallbackEvent` struct
- [x] Define `EventBuffer` struct
- [x] Define `AlertRateLimiter` struct
- [x] Define `CacheDetector` struct

**Validation:** Files compile without errors

**Dependencies:** None

### Task 1.2: Implement model cache detection
- [x] Implement `modelSupportsCache()` method
- [x] Add check for: claude-opus-4.5, claude-sonnet-4.5, claude-haiku-4.5
- [ ] Add unit tests

**Validation:** Unit tests pass for all models

**Dependencies:** Task 1.1

### Task 1.3: Implement event buffer (sliding window)
- [x] Implement `EventBuffer.AddEvent()` method
- [x] Implement `EventBuffer.GetEventsInWindow()` method
- [x] Implement `EventBuffer.Clear()` method
- [x] Add sliding window logic (remove old events outside time window)
- [x] Use RWMutex for thread safety
- [ ] Add unit tests

**Validation:** Unit tests pass for sliding window behavior

**Dependencies:** Task 1.1

### Task 1.4: Implement detection logic
- [x] Implement `RecordEvent()` method:
  - Check model supports cache
  - Check input tokens > 1024
  - Check cache tokens = 0
  - Calculate estimated loss
  - Add event to buffer
  - Check if threshold reached
- [x] Implement `calculateLoss()` method
- [ ] Add unit tests for all scenarios

**Validation:** Unit tests pass for all scenarios

**Dependencies:** Task 1.2, Task 1.3

### Task 1.5: Implement rate limiter
- [x] Implement `AlertRateLimiter.ShouldSend()` method
- [x] Implement `AlertRateLimiter.RecordSent()` method
- [x] Use mutex for thread safety
- [ ] Add unit tests

**Validation:** Unit tests pass, thread-safe

**Dependencies:** Task 1.1

## Phase 2: Integrate Resend API

### Task 2.1: Add Resend dependency
- [x] Add `github.com/resend/resend-go` to `go.mod`
- [x] Run `go mod tidy`
- [x] Test import works

**Validation:** Package imports successfully

**Dependencies:** None

### Task 2.2: Implement email sending with aggregation
- [x] Implement `maybeSendAlert()` method
- [x] Aggregate statistics from events (total loss, model counts)
- [x] Implement `sendAlert()` method with Resend API
- [x] Configure Resend client with API key from env
- [x] Create email HTML template with all required fields
- [x] Add error handling (log but don't crash, don't clear buffer on failure)
- [x] Update rate limiter and clear buffer only on success

**Validation:** Can construct email request with aggregated data

**Dependencies:** Task 1.4, Task 1.5, Task 2.1

### Task 2.3: Test email sending
- [ ] Create test that sends real email to trantai306@gmail.com
- [ ] Verify email is received
- [ ] Check email content includes aggregated statistics

**Validation:** Email received with correct content

**Dependencies:** Task 2.2

## Phase 3: Integrate with OhMyGPT Handler

### Task 3.1: Add detector initialization
- [x] Create singleton `GetCacheDetector()` function
- [x] Load config from environment variables
- [x] Initialize detector with buffer, rate limiter, Resend client
- [x] Initialize detector on startup if enabled

**Validation:** Detector initializes correctly

**Dependencies:** Task 1.4

### Task 3.2: Hook into stream response handler
- [x] Modify `goproxy/main.go` OhMyGPT handlers
- [x] After parsing usage, call `detector.RecordEvent()`
- [x] Add log when detection happens
- [x] Add log when threshold reached
- [x] Add log when rate limited

**Validation:** Detection logs appear

**Dependencies:** Task 3.1

### Task 3.3: Hook into non-stream response handler
- [x] Modify both OpenAI and Messages handlers
- [x] Ensure consistent behavior

**Validation:** Detection works for both streaming and non-streaming

**Dependencies:** Task 3.2

## Phase 4: Configuration

### Task 4.1: Add environment variables
- [x] Add to `.env` file:
  - `CACHE_FALLBACK_DETECTION=true`
  - `RESEND_API_KEY=re_Qa5RkL7o_7PMxFKDpqrXwyBdQ7TjCyBtW`
  - `CACHE_FALLBACK_ALERT_EMAIL=trantai306@gmail.com`
  - `CACHE_FALLBACK_THRESHOLD_COUNT=5`
  - `CACHE_FALLBACK_TIME_WINDOW_MIN=1`
  - `CACHE_FALLBACK_ALERT_INTERVAL_MIN=5`
- [ ] Add to production environment config

**Validation:** Environment variables load correctly

**Dependencies:** None

### Task 4.2: Add config loading
- [x] Implement `LoadConfig()` function (via InitCacheDetector)
- [x] Parse all environment variables
- [x] Set sensible defaults (threshold=5, window=1min)
- [x] Handle missing config gracefully

**Validation:** Config loads with defaults if env vars missing

**Dependencies:** Task 4.1

## Phase 5: Testing

### Task 5.1: Unit tests
- [ ] Test `modelSupportsCache()` with all models
- [ ] Test `RecordEvent()` with all scenarios
- [ ] Test `EventBuffer` sliding window behavior
- [ ] Test event expiration outside time window
- [ ] Test rate limiter behavior
- [ ] Test `calculateLoss()` accuracy
- [ ] Test threshold triggering
- [ ] Achieve >80% coverage

**Validation:** All unit tests pass

**Dependencies:** Task 1.5

### Task 5.2: Integration test
- [ ] Test end-to-end: multiple events → threshold → email
- [ ] Test sliding window cleanup
- [ ] Test buffer clearing after alert
- [ ] Test rate limiting works
- [ ] Test error handling (API failure)
- [ ] Test with real OhMyGPT requests

**Validation:** Integration test passes

**Dependencies:** Task 3.3

### Task 5.3: Manual testing
- [ ] Trigger 5+ cache fallbacks in dev environment
- [ ] Verify email received at trantai306@gmail.com only after 5 events
- [ ] Check email content shows aggregated statistics
- [ ] Verify rate limiting works
- [ ] Verify logging

**Validation:** Manual test successful

**Dependencies:** Task 5.2

### Task 5.4: Test threshold behavior
- [ ] Test with < threshold events (no email)
- [ ] Test with = threshold events (email sent)
- [ ] Test with > threshold events (email sent, buffer cleared)
- [ ] Test events outside window expire

**Validation:** Threshold behavior works correctly

**Dependencies:** Task 5.2

## Phase 6: Documentation

### Task 6.1: Update README
- [ ] Document cache fallback detection feature
- [ ] Document threshold-based alerting
- [ ] Document configuration options
- [ ] Add example email content

**Validation:** README is clear

**Dependencies:** Task 4.2

### Task 6.2: Update deployment docs
- [ ] Document required environment variables
- [ ] Add deployment checklist item
- [ ] Document how to adjust threshold

**Validation:** Deployment docs updated

**Dependencies:** Task 4.2

## Phase 7: Deployment

### Task 7.1: Deploy to staging
- [ ] Deploy GoProxy with new feature
- [ ] Configure environment variables
- [ ] Test with staging traffic
- [ ] Verify emails are sent only when threshold reached

**Validation:** Staging works correctly

**Dependencies:** All previous tasks

### Task 7.2: Deploy to production
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Verify emails work with correct threshold
- [ ] Be ready to rollback

**Validation:** Production deployment successful

**Dependencies:** Task 7.1

### Task 7.3: Post-deployment monitoring
- [ ] Monitor for 24 hours
- [ ] Check email alerts are appropriate
- [ ] Adjust threshold if needed (too many/few alerts)
- [ ] Adjust time window if needed

**Validation:** System runs smoothly

**Dependencies:** Task 7.2

## Summary

**Total Tasks:** 24 tasks

**Critical Path:**
1. Task 1.1 → 1.2 → 1.3 → 1.4 → 1.5 (Core detector with buffer)
2. Task 2.1 → 2.2 (Email integration)
3. Task 3.1 → 3.2 → 3.3 (Integration)
4. Task 4.1 → 4.2 (Configuration)
5. Task 5.1 → 5.2 → 5.4 (Testing)
6. Task 7.1 → 7.2 (Deployment)

**Quick MVP:** Tasks 1.1-1.5, 2.1-2.2, 3.1-3.3, 4.1-4.2 = 15 tasks for working feature
