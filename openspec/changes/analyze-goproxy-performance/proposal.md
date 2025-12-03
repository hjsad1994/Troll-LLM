# Change: Analyze Goproxy Performance Bottlenecks and Optimization Opportunities

## Why
Goproxy la thanh phan core xu ly tat ca API requests. Can phan tich de xac dinh cac diem nghen (bottleneck) va co hoi toi uu hoa de tang throughput va giam latency.

## What Changes
Day la proposal **ANALYSIS ONLY** - khong can code, chi phan tich va danh gia.

### Tim thay cac Bottleneck/Gate:

#### 1. **Rate Limiter** (`internal/ratelimit/limiter.go`) - **HIGH IMPACT**
- **Gate**: Single mutex `sync.Mutex` cho TOAN BO map requests
- **Van de**: Moi request goi `Allow()` phai acquire lock, gay contention khi nhieu concurrent users
- **Van de 2**: Filter old requests O(n) moi lan goi - performance degradation khi traffic cao
- **Van de 3**: Khong co background cleanup -> memory leak potential

#### 2. **Proxy Pool** (`internal/proxy/pool.go`) - **MEDIUM IMPACT**
- **Gate**: `SelectProxyWithKeyByClient` acquire **write lock** ngay ca khi chi can doc
- **Van de**: `LoadFromDB()` hold lock trong thoi gian dai khi reload tu database
- **Van de 2**: Round-robin counter (`p.current`) can write lock cho moi request

#### 3. **Key Pool** (`internal/keypool/pool.go`) - **MEDIUM IMPACT**
- **Gate**: Single mutex cho pool, `GetKeyByID` va `GetAPIKey` acquire mutex moi lan
- **Van de**: Hot path goi nhieu lan trong 1 request

#### 4. **Database Operations** - **HIGH IMPACT**
- **Gate**: Synchronous database writes trong hot path:
  - `UpdateUsage()` - moi request
  - `LogRequestDetailed()` - moi request  
  - `DeductCreditsWithTokens()` - moi request
- **Van de**: 3 database operations blocking cho moi thanh cong request

#### 5. **Streaming Response Handler** (`main.go`) - **MEDIUM IMPACT**
- **Gate**: Memory allocation moi request:
  - `bufio.Scanner` voi buffer 1MB initial, 10MB max
  - Regex filtering cho moi streaming chunk
- **Van de**: GC pressure cao khi traffic lon

#### 6. **Response Transformers** (`transformers/response.go`) - **LOW-MEDIUM IMPACT**
- `FilterDroidIdentity()` apply 12+ regex patterns tren moi text chunk
- `FilterThinkingContent()` apply 20+ regex patterns (khi enabled)
- **Van de**: CPU intensive trong streaming hot path

### Cac co hoi Optimize:

#### 1. **Rate Limiter Optimization** - **Recommend**
```
Hien tai: Single map + mutex, O(n) filter
Toi uu:
- Sharded map (partition by key hash) -> giam lock contention 10-100x
- Sliding window counter thay vi luu tat ca timestamps -> O(1) thay O(n)
- Background cleanup goroutine (ticker 30s)
```

#### 2. **Database Write Batching** - **Highly Recommend**
```
Hien tai: 3 sync writes per request
Toi uu:
- Buffered channel cho request logs -> batch insert moi 100ms hoac 100 entries
- Async write voi acknowledgment channel
- Connection pool tuning: tang MaxPoolSize neu can
```

#### 3. **Lock-free Pool Selection** - **Recommend**
```
Hien tai: Write lock cho round-robin
Toi uu:
- atomic.AddInt32 cho round-robin counter
- RLock cho read operations
- Separate locks cho bindings vs proxies
```

#### 4. **Memory Pooling** - **Consider**
```
Hien tai: New allocation moi request
Toi uu:
- sync.Pool cho Scanner buffers
- Pre-allocated response buffers
- String builder reuse
```

#### 5. **Regex Optimization** - **Consider**
```
Hien tai: Apply tat ca patterns sequential
Toi uu:
- Combined regex patterns (alternation)
- Early termination khi match
- Cache filtered results cho repeated content
```

### Performance Impact Estimate:

| Optimization | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| Rate Limiter Sharding | Medium | High (10-100x less contention) | P0 |
| DB Write Batching | Medium | High (3x less blocking) | P0 |
| Lock-free Pool | Low | Medium (faster selection) | P1 |
| Memory Pooling | Medium | Medium (less GC) | P2 |
| Regex Optimization | Low | Low-Medium | P3 |

## Impact
- Affected code: `internal/ratelimit/`, `internal/proxy/`, `internal/keypool/`, `internal/usage/`, `main.go`, `transformers/`
- **Khong co breaking changes** - internal optimizations only
- Expected improvement: 2-5x throughput increase under high load

## Recommendations (Updated with Context7 Best Practices)

### P0: Rate Limiter - Su dung `github.com/mennanov/limiters`
**Thay the hoan toan rate limiter hien tai** voi library chuyen nghiep:

```go
// HIEN TAI: Single mutex, O(n) filter
type RateLimiter struct {
    mu       sync.Mutex
    requests map[string][]time.Time  // Memory leak, O(n) per call
}

// TOI UU: Su dung Sliding Window (smooth burst) hoac Token Bucket
import "github.com/mennanov/limiters"

// In-memory (single instance) - FAST
limiter := limiters.NewSlidingWindow(
    100,                                    // capacity per minute
    time.Minute,                            // window
    limiters.NewSlidingWindowInMemory(),    // O(1) operations
    limiters.NewSystemClock(),
    0.01,
)

// Hoac Token Bucket cho burst handling
limiter := limiters.NewTokenBucket(
    300,                                     // capacity (RPM)
    time.Minute/300,                         // refill rate
    limiters.NewLockNoop(),                  // no lock for single instance
    limiters.NewTokenBucketInMemory(),
    limiters.NewSystemClock(),
    limiters.NewStdLogger(),
)
```

**Loi ich:**
- O(1) operations thay vi O(n)
- Khong can cleanup goroutine
- Memory efficient
- Production-tested algorithms

### P0: Pool Selection - Su dung `xsync` + atomic
**Thay the sync.Mutex bang xsync.Map va atomic:**

```go
// HIEN TAI: Write lock cho round-robin
func (p *ProxyPool) SelectProxyWithKeyByClient(clientAPIKey string) {
    p.mu.Lock()  // BLOCKING cho tat ca requests
    defer p.mu.Unlock()
    // ...
}

// TOI UU: Lock-free round-robin + xsync.Map
import (
    "sync/atomic"
    "github.com/puzpuzpuz/xsync/v4"
)

type ProxyPool struct {
    proxies     *xsync.Map[string, *Proxy]      // Lock-free concurrent map
    bindings    *xsync.Map[string, []*Binding]  // Lock-free
    current     atomic.Int32                     // Lock-free counter
    clientCache *xsync.Map[string, *http.Client] // Lock-free cache
}

func (p *ProxyPool) SelectProxy() (*Proxy, error) {
    // Atomic increment - NO LOCK
    idx := p.current.Add(1) % int32(p.GetProxyCount())
    // ...
}
```

**Loi ich tu xsync:**
- Lock-free operations (10-100x less contention)
- Built-in concurrent map optimized cho high-throughput
- RBMutex cho read-heavy workloads

### P1: Database Write Batching
**Async write voi buffered channel:**

```go
// HIEN TAI: 3 sync DB writes per request
func handleRequest() {
    usage.UpdateUsage(...)          // BLOCKING
    usage.LogRequestDetailed(...)   // BLOCKING  
    usage.DeductCreditsWithTokens() // BLOCKING
}

// TOI UU: Buffered channel + batch insert
type UsageTracker struct {
    logChan chan RequestLog
}

func NewUsageTracker() *UsageTracker {
    t := &UsageTracker{
        logChan: make(chan RequestLog, 1000), // Buffer 1000 entries
    }
    go t.batchWriter()
    return t
}

func (t *UsageTracker) batchWriter() {
    ticker := time.NewTicker(100 * time.Millisecond)
    batch := make([]RequestLog, 0, 100)
    
    for {
        select {
        case log := <-t.logChan:
            batch = append(batch, log)
            if len(batch) >= 100 {
                t.flushBatch(batch)
                batch = batch[:0]
            }
        case <-ticker.C:
            if len(batch) > 0 {
                t.flushBatch(batch)
                batch = batch[:0]
            }
        }
    }
}

func (t *UsageTracker) flushBatch(logs []RequestLog) {
    // InsertMany instead of InsertOne
    db.RequestLogsCollection().InsertMany(ctx, logs)
}
```

### P2: Memory Pooling voi sync.Pool
**Reuse buffers cho streaming:**

```go
// HIEN TAI: New allocation moi request
scanner := bufio.NewScanner(resp.Body)
scanner.Buffer(make([]byte, 1024*1024), 10*1024*1024)

// TOI UU: sync.Pool cho buffer reuse
var scannerPool = sync.Pool{
    New: func() interface{} {
        buf := make([]byte, 1024*1024)
        return buf
    },
}

func handleStream() {
    buf := scannerPool.Get().([]byte)
    defer scannerPool.Put(buf)
    
    scanner := bufio.NewScanner(resp.Body)
    scanner.Buffer(buf, 10*1024*1024)
    // ...
}
```

### P2: High-Performance Cache voi Ristretto
**Thay the map cache bang Ristretto:**

```go
// HIEN TAI: Simple map with mutex
clientCache map[string]*http.Client

// TOI UU: Ristretto high-performance cache
import "github.com/dgraph-io/ristretto/v2"

cache, _ := ristretto.NewCache(&ristretto.Config[string, *http.Client]{
    NumCounters: 1e4,      // 10K keys
    MaxCost:     1 << 20,  // 1MB max
    BufferItems: 64,
})

// Automatic eviction, thread-safe, admission policy
cache.Set(proxyID, client, 1)
client, found := cache.Get(proxyID)
```

## Summary: Cai thien tot nhat

| Priority | Action | Library/Pattern | Expected Impact |
|----------|--------|-----------------|-----------------|
| **P0** | Replace rate limiter | `github.com/mennanov/limiters` | 10-100x faster, O(1) |
| **P0** | Lock-free pools | `github.com/puzpuzpuz/xsync/v4` + atomic | 10x less contention |
| **P1** | Batch DB writes | Buffered channel + InsertMany | 3x less blocking |
| **P2** | Memory pooling | `sync.Pool` | 50% less GC pressure |
| **P2** | Cache upgrade | `github.com/dgraph-io/ristretto` | Better eviction |

## Go Modules to Add

```bash
go get github.com/mennanov/limiters
go get github.com/puzpuzpuz/xsync/v4
go get github.com/dgraph-io/ristretto/v2
```
