# Change: Add Rate Limit Handler for API Proxy

## Why
API proxy hiện tại có RateLimiter và UserKey với GetRPMLimit() đã implement nhưng chưa được tích hợp vào request handlers. Cần enforce rate limit theo tier (Dev: 20 RPM, Pro: 60 RPM) để bảo vệ upstream API.

## What Changes
- Tích hợp RateLimiter vào `chatCompletionsHandler`
- Tích hợp RateLimiter vào `handleAnthropicMessagesEndpoint`
- Lookup UserKey từ database để xác định tier và rate limit
- Trả về HTTP 429 với Retry-After header khi vượt limit
- Thêm rate limit headers trong response (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

## Impact
- Affected specs: api-proxy
- Affected code: `goproxy/main.go`, `goproxy/internal/ratelimit/limiter.go`, `goproxy/internal/userkey/`
