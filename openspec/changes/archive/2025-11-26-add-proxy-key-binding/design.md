# Design: Proxy-Key Binding

## Context
Hệ thống cần hỗ trợ nhiều proxy servers, mỗi proxy được gán 1-2 Factory API keys. Điều này giúp:
- Tránh IP bị block khi gọi quá nhiều từ 1 IP
- Phân tải keys qua nhiều proxy
- Failover khi 1 key/proxy gặp vấn đề

## Goals
- Hỗ trợ HTTP và SOCKS5 proxy
- Mỗi proxy có thể gán 1-2 Factory keys
- Round-robin selection giữa các proxy
- Failover trong cùng proxy khi key bị rate limit

## Non-Goals
- Không hỗ trợ proxy authentication phức tạp (chỉ user:pass)
- Không tự động thêm proxy (admin manual)

## Database Schema

### Collection: `proxies`
```javascript
{
  _id: "proxy-1",              // unique identifier
  name: "US Proxy 1",          // display name
  type: "http" | "socks5",     // proxy type
  host: "proxy.example.com",   // hostname/IP
  port: 8080,                  // port number
  username: "user",            // optional auth
  password: "pass",            // optional auth
  status: "healthy" | "error", // health status
  lastCheckedAt: Date,
  createdAt: Date
}
```

### Collection: `proxy_key_bindings`
```javascript
{
  _id: ObjectId,
  proxyId: "proxy-1",          // reference to proxy
  factoryKeyId: "factory-1",   // reference to factory_keys
  priority: 1,                 // 1 = primary, 2 = secondary
  isActive: true,
  createdAt: Date
}
```

## Selection Algorithm

```
1. Get all healthy proxies
2. Round-robin select next proxy
3. Get active bindings for selected proxy (sorted by priority)
4. Try primary key first
5. If primary fails (rate limit/error), try secondary
6. If both fail, mark proxy as unhealthy, try next proxy
7. If all proxies exhausted, return error
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Go Proxy Server                       │
├─────────────────────────────────────────────────────────┤
│  Request → ProxyPool.Select() → Proxy + FactoryKey      │
│                    ↓                                     │
│            HTTP Client with Proxy                        │
│                    ↓                                     │
│            Factory AI API                                │
└─────────────────────────────────────────────────────────┘

ProxyPool:
  ├── Proxy 1 (HTTP)
  │     ├── Key A (primary)
  │     └── Key B (secondary)
  ├── Proxy 2 (SOCKS5)
  │     └── Key C (primary)
  └── Proxy 3 (HTTP)
        ├── Key D (primary)
        └── Key E (secondary)
```

## API Endpoints

### Admin Proxy Management
- `GET /admin/proxies` - List all proxies
- `POST /admin/proxies` - Create proxy
- `PATCH /admin/proxies/:id` - Update proxy
- `DELETE /admin/proxies/:id` - Delete proxy
- `POST /admin/proxies/:id/test` - Test proxy connectivity

### Admin Binding Management
- `GET /admin/proxies/:id/keys` - List keys bound to proxy
- `POST /admin/proxies/:id/keys` - Bind key to proxy
- `DELETE /admin/proxies/:id/keys/:keyId` - Unbind key

## Monitoring & Status Dashboard

### Health Check System
```
┌─────────────────────────────────────────────────────────┐
│              Health Check Scheduler (Go)                 │
│                    Every 30 seconds                      │
├─────────────────────────────────────────────────────────┤
│  For each proxy:                                         │
│    1. Test TCP connection to proxy                       │
│    2. Test HTTP request through proxy                    │
│    3. Record latency & status                            │
│    4. If fail 3 times consecutive → Mark unhealthy       │
└─────────────────────────────────────────────────────────┘
```

### Collection: `proxy_health_logs`
```javascript
{
  _id: ObjectId,
  proxyId: "proxy-1",
  status: "healthy" | "unhealthy" | "timeout" | "error",
  latencyMs: 150,
  errorMessage: "Connection refused",
  checkedAt: Date
}
// TTL: 7 days
```

### Status Dashboard (`/status`)
```
┌─────────────────────────────────────────┐
│         F-Proxy Status Dashboard         │
├─────────────────────────────────────────┤
│ Overall: 🟢 Healthy (4/5 proxies up)    │
├─────────────────────────────────────────┤
│ Proxy        Status   Latency   Keys    │
│ ─────────────────────────────────────── │
│ US-1         🟢 OK    120ms    2/2 ✓    │
│ US-2         🟢 OK    150ms    1/2 ✓    │
│ EU-1         🔴 DOWN  -        0/2 ✗    │
│ EU-2         🟢 OK    200ms    2/2 ✓    │
│ Asia-1       🟢 OK    80ms     1/1 ✓    │
├─────────────────────────────────────────┤
│ Last check: 10 seconds ago              │
│ Auto-refresh: 30s                       │
└─────────────────────────────────────────┘
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Proxy down | Health check + auto failover |
| All keys on proxy exhausted | Rotate to next proxy |
| Slow proxy | Timeout + mark unhealthy |

## Migration Plan
1. Add new collections (no breaking changes)
2. Update keypool to support proxy selection
3. Add admin endpoints
4. Add health check scheduler
5. Deploy status dashboard
6. Test with 1 proxy first
7. Gradually add more proxies
