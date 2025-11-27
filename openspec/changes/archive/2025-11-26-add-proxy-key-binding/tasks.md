# Tasks: Add Proxy-Key Binding

## 1. Database Schema
- [ ] 1.1 Add `proxies` collection schema (MongoDB - Node.js)
- [ ] 1.2 Add `proxy_key_bindings` collection schema (MongoDB - Node.js)
- [ ] 1.3 Add `proxy_health_logs` collection schema (TTL 7 days)
- [ ] 1.4 Add Go structs for Proxy, ProxyKeyBinding, HealthLog
- [ ] 1.5 Create MongoDB indexes for efficient queries

## 2. Backend Admin API
- [ ] 2.1 Create proxy service (`backend/src/services/proxy.service.ts`)
- [ ] 2.2 Add `GET /admin/proxies` endpoint
- [ ] 2.3 Add `POST /admin/proxies` endpoint with validation
- [ ] 2.4 Add `PATCH /admin/proxies/:id` endpoint
- [ ] 2.5 Add `DELETE /admin/proxies/:id` endpoint
- [ ] 2.6 Add `POST /admin/proxies/:id/test` - test connectivity
- [ ] 2.7 Add `GET /admin/proxies/:id/keys` - list bindings
- [ ] 2.8 Add `POST /admin/proxies/:id/keys` - create binding (max 2)
- [ ] 2.9 Add `DELETE /admin/proxies/:id/keys/:keyId` - remove binding

## 3. Go Proxy Integration
- [ ] 3.1 Create `internal/proxy/model.go` - Proxy struct
- [ ] 3.2 Create `internal/proxy/pool.go` - ProxyPool with round-robin
- [ ] 3.3 Update HTTP client to support proxy configuration
- [ ] 3.4 Implement SOCKS5 proxy support (golang.org/x/net/proxy)
- [ ] 3.5 Implement HTTP proxy support
- [ ] 3.6 Update keypool to integrate with proxy selection
- [ ] 3.7 Implement failover when key exhausted on proxy

## 4. Health Check & Monitoring
- [ ] 4.1 Create `internal/proxy/healthcheck.go` - health check logic
- [ ] 4.2 Add health check scheduler (runs every 30s)
- [ ] 4.3 Log health check results to `proxy_health_logs`
- [ ] 4.4 Mark proxy unhealthy after 3 consecutive failures
- [ ] 4.5 Auto-recover proxy when health check passes

## 5. Status Dashboard
- [ ] 5.1 Create `backend/static/status.html` - status page
- [ ] 5.2 Add `GET /api/status` - public status endpoint
- [ ] 5.3 Show overall health (healthy/degraded/down)
- [ ] 5.4 Show each proxy status, latency, key count
- [ ] 5.5 Auto-refresh every 30 seconds
- [ ] 5.6 Show last check timestamp

## 6. Testing
- [ ] 6.1 Test proxy creation via admin API
- [ ] 6.2 Test key binding to proxy (max 2)
- [ ] 6.3 Test request routing through proxy
- [ ] 6.4 Test failover between keys on same proxy
- [ ] 6.5 Test failover between proxies
- [ ] 6.6 Test health check scheduler
- [ ] 6.7 Test status dashboard API

## 7. Documentation
- [ ] 7.1 Update API documentation
- [ ] 7.2 Add proxy setup guide
