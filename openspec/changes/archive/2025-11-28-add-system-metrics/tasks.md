## 1. Database Schema Update
- [x] 1.1 Add `latencyMs` field to `request_logs` schema
- [x] 1.2 Add `isSuccess` field to `request_logs` schema (true if statusCode 2xx)

## 2. GoProxy Logging
- [x] 2.1 Measure request latency (time from request start to response complete)
- [x] 2.2 Log `latencyMs` to request_logs collection
- [x] 2.3 Log `isSuccess` based on response status code
- [x] 2.4 Log FAILED requests (4xx, 5xx) with tokens=0 for accurate success rate

## 3. Backend API
- [x] 3.1 Create `GET /admin/metrics` endpoint
- [x] 3.2 Implement aggregation pipeline for:
  - Total requests count
  - Total tokens sum
  - Average latency
  - Success rate (% of isSuccess=true)
- [x] 3.3 Add time period filter (optional: 1h, 24h, 7d, all)

## 4. Frontend Dashboard
- [x] 4.1 Add new metrics cards to Dashboard page:
  - Total Requests card with icon 📊
  - Total Tokens card with icon 🎫
  - Avg Latency card with icon ⚡
  - Success Rate card with icon ✅
- [x] 4.2 Fetch metrics from `/admin/metrics` on page load
- [x] 4.3 Format numbers appropriately (K, M for large numbers, ms for latency, % for rate)
- [x] 4.4 Add auto-refresh every 30 seconds

## 5. Testing
- [ ] 5.1 Test metrics endpoint returns correct aggregations
- [ ] 5.2 Test Dashboard displays metrics correctly
- [ ] 5.3 Verify latency calculation accuracy
