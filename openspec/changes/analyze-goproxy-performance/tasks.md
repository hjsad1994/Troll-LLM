# Tasks: Goproxy Performance Analysis

## 1. Analysis (COMPLETED)
- [x] 1.1 Review main.go request handlers
- [x] 1.2 Review proxy pool implementation
- [x] 1.3 Review key pool implementation
- [x] 1.4 Review rate limiter implementation
- [x] 1.5 Review database operations
- [x] 1.6 Review response transformers
- [x] 1.7 Identify bottlenecks and gates
- [x] 1.8 Document optimization opportunities

## 2. Implementation (COMPLETED)
- [x] 2.1 Implement optimized rate limiter with `mennanov/limiters` (O(1) sliding window)
- [x] 2.2 Add background cleanup for rate limiter (auto cleanup every 5 minutes)
- [x] 2.3 Implement database write batching with buffered channels + InsertMany/BulkWrite
- [x] 2.4 Use atomic operations for pool counters (xsync.Map + atomic.Int32)
- [x] 2.5 Memory pooling for Scanner buffers (sync.Pool with small/medium/large buffers)
- [x] 2.6 Lock-free Proxy Pool with xsync.Map
- [x] 2.7 Lock-free Key Pool with xsync.Map

## 3. Files Created/Modified
### New Files:
- `internal/ratelimit/limiter_optimized.go` - O(1) rate limiter using mennanov/limiters
- `internal/proxy/pool_optimized.go` - Lock-free proxy pool using xsync.Map + atomic
- `internal/keypool/pool_optimized.go` - Lock-free key pool using xsync.Map + atomic
- `internal/usage/batcher.go` - Batched database writes with buffered channels
- `internal/bufpool/pool.go` - Memory pooling for streaming buffers

### Modified Files:
- `internal/ratelimit/limiter.go` - Added UseOptimizedLimiter flag, delegates to optimized
- `internal/proxy/pool.go` - Added UseOptimizedPool flag, GetOptimizedOrLegacyPool()
- `internal/keypool/pool.go` - Added UseOptimizedKeyPool flag, GetOptimizedOrLegacyKeyPool()
- `internal/usage/tracker.go` - Added UseBatchedWrites flag, uses batcher when enabled

## 4. Configuration Flags (all default to true)
```go
ratelimit.UseOptimizedLimiter = true  // O(1) sliding window
proxy.UseOptimizedPool = true         // Lock-free proxy selection
keypool.UseOptimizedKeyPool = true    // Lock-free key selection
usage.UseBatchedWrites = true         // Batched DB writes
```

## 5. Verification (PENDING - Manual Testing Required)
- [ ] 5.1 Load testing before/after
- [ ] 5.2 Memory profiling
- [ ] 5.3 CPU profiling under load
