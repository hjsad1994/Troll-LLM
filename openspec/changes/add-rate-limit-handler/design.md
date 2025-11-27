## Context
goproxy cần enforce rate limit theo user tier để bảo vệ Factory API upstream. RateLimiter đã được implement nhưng chưa tích hợp.

## Goals / Non-Goals
- Goals:
  - Enforce rate limit 20 RPM cho Dev tier
  - Enforce rate limit 60 RPM cho Pro tier
  - Trả về 429 với thông tin retry khi vượt limit
- Non-Goals:
  - Không implement distributed rate limiting (dùng in-memory)
  - Không thay đổi logic authentication hiện tại

## Decisions

### 1. Rate Limit Key
- **Decision**: Sử dụng client API key (PROXY_API_KEY) làm rate limit key
- **Alternatives**: User ID, IP address
- **Rationale**: API key đã có sẵn trong request, dễ track

### 2. UserKey Lookup
- **Decision**: Lookup UserKey từ MongoDB collection `user_keys` bằng API key
- **Flow**: API Key → UserKey → Tier → RPM Limit

### 3. Rate Limit Headers
- **Decision**: Thêm headers theo chuẩn:
  - `X-RateLimit-Limit`: RPM limit của user
  - `X-RateLimit-Remaining`: Số requests còn lại
  - `X-RateLimit-Reset`: Thời gian reset (Unix timestamp)
  - `Retry-After`: Seconds to wait (chỉ khi 429)

### 4. Default Behavior
- **Decision**: Nếu không tìm thấy UserKey, dùng default limit (20 RPM)
- **Rationale**: Fail-safe, không block legitimate requests

## Code Changes

```go
// main.go - Add imports
import (
    "goproxy/internal/ratelimit"
    "goproxy/internal/userkey"
)

// Global rate limiter
var rateLimiter *ratelimit.RateLimiter

// In main()
rateLimiter = ratelimit.NewRateLimiter()

// Helper function
func checkRateLimit(w http.ResponseWriter, apiKey string) bool {
    // Lookup user tier
    user := userkey.FindByAPIKey(apiKey)
    limit := 20 // default
    if user != nil {
        limit = user.GetRPMLimit()
    }
    
    // Check rate limit
    if !rateLimiter.Allow(apiKey, limit) {
        retryAfter := rateLimiter.RetryAfter(apiKey, limit)
        w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
        w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
        w.Header().Set("X-RateLimit-Remaining", "0")
        http.Error(w, `{"error": {"message": "Rate limit exceeded", "type": "rate_limit_error"}}`, 429)
        return false
    }
    
    // Add rate limit headers
    w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
    w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(rateLimiter.Remaining(apiKey, limit)))
    return true
}
```

## Risks / Trade-offs
- **In-memory rate limiting**: Resets on server restart → Acceptable for single-instance
- **DB lookup per request**: Add latency → Cache UserKey nếu cần optimize

## Migration Plan
1. Deploy code changes
2. Monitor 429 responses
3. Adjust limits nếu cần

## Open Questions
- Có cần cache UserKey để giảm DB queries không?
