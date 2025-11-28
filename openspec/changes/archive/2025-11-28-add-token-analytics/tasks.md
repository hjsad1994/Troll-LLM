## 1. Backend API
- [x] 1.1 Add `GET /admin/factory-keys/analytics` endpoint
- [x] 1.2 Query request_logs collection for token aggregation by time period
- [x] 1.3 Return tokens used for 1h, 24h, 7d periods

## 2. Database & Logging
- [x] 2.1 Ensure `request_logs` collection has proper indexes for time-based queries (TTL index exists)
- [x] 2.2 Add `factoryKeyId` to request logs in goproxy
- [x] 2.3 Create aggregation pipeline for token stats

## 3. Frontend UI
- [x] 3.1 Add analytics cards to factory-keys.html (1h, 24h, 7d stats)
- [x] 3.2 Fetch and display analytics data on page load
- [x] 3.3 Add auto-refresh for live updates
- [x] 3.4 Style analytics cards to match admin theme

## 4. Testing
- [ ] 4.1 Test analytics endpoint returns correct data
- [ ] 4.2 Verify time period calculations are accurate
- [ ] 4.3 Test UI displays data correctly
