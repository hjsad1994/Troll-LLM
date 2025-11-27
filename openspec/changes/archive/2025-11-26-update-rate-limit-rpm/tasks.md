# Tasks: Update Rate Limiting to 5 RPM

## 1. Go Proxy Changes
- [x] 1.1 Update `goproxy/internal/ratelimit/limiter.go` - Change default RPM to 5
- [x] 1.2 Remove tier-based RPM logic (30/120 RPM)
- [x] 1.3 Update rate limit middleware in `main.go`
- [ ] 1.4 Test rate limiting with 5 RPM

## 2. Backend Changes
- [x] 2.1 Update `backend/src/services/userkey.service.ts` - Remove tier-based RPM
- [x] 2.2 Update usage API to return fixed 5 RPM limit
- [x] 2.3 Update admin UI to show 5 RPM for all keys

## 3. Testing
- [ ] 3.1 Test rate limit enforcement (6th request in 1 minute should fail)
- [ ] 3.2 Verify 429 response with correct headers
- [ ] 3.3 Test sliding window reset after 1 minute
