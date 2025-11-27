# Design: Multi-Key Proxy Rotation + User API Key Management

## Context
F-Proxy cần:
1. Scale upstream với nhiều Factory API keys (rotation)
2. Quản lý User API keys với token quota
3. Admin dashboard để quản lý
4. User website để check usage

**Constraints:**
- Factory AI rate limit: ~60 requests/minute per key
- Mỗi Factory key có 40M token quota
- User keys có token quota tùy chỉnh (mặc định 30M)
- 2 tiers: Dev (30 RPM), Pro (120 RPM)
- Không cần user đăng ký tài khoản

## Goals / Non-Goals

**Goals:**
- Support 10+ Factory keys với round-robin rotation
- Health check để auto-disable Factory key hết quota
- Admin có thể tạo/thu hồi/cập nhật User API keys
- User có thể check usage qua web UI
- Block user khi hết token quota
- Simple SQLite database (không cần setup phức tạp)

**Non-Goals:**
- User registration/login system
- Payment integration
- Complex load balancing strategies
- Multi-region deployment

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              F-Proxy v2.0                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         Request Flow                             │    │
│  │                                                                  │    │
│  │  Client ──▶ [Validate User Key] ──▶ [Check Token Quota]         │    │
│  │                    │                       │                     │    │
│  │                    ▼                       ▼                     │    │
│  │             ┌─────────────┐         ┌─────────────┐             │    │
│  │             │   SQLite    │         │  Block if   │             │    │
│  │             │  (lookup)   │         │  exhausted  │             │    │
│  │             └─────────────┘         └─────────────┘             │    │
│  │                                            │                     │    │
│  │                                            ▼                     │    │
│  │                              [Check RPM by Tier]                 │    │
│  │                                            │                     │    │
│  │                                            ▼                     │    │
│  │                    ┌─────────────────────────────────────┐      │    │
│  │                    │      Factory Key Pool (10 keys)     │      │    │
│  │                    │  [K1✓] [K2✓] [K3⏸] [K4✓] ... [K10✓] │      │    │
│  │                    │         Round-Robin + Health         │      │    │
│  │                    └─────────────────────────────────────┘      │    │
│  │                                            │                     │    │
│  │                                            ▼                     │    │
│  │                              [Factory AI API]                    │    │
│  │                                            │                     │    │
│  │                                            ▼                     │    │
│  │                              [Update Usage in DB]                │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────┐    ┌─────────────────────────────────┐    │
│  │     Admin Endpoints     │    │        User Endpoints           │    │
│  │  (protected by secret)  │    │        (public)                 │    │
│  │                         │    │                                 │    │
│  │  GET  /admin/keys       │    │  GET /api/usage?key=xxx         │    │
│  │  POST /admin/keys       │    │  GET /usage (Web UI)            │    │
│  │  DELETE /admin/keys/:id │    │                                 │    │
│  │  PATCH /admin/keys/:id  │    │                                 │    │
│  └─────────────────────────┘    └─────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Decisions

### 1. Two-Tier System

**Decision:** Chỉ 2 tiers đơn giản, phân biệt bằng prefix của key

| Tier | Key Prefix | RPM Limit | Default Tokens | Use Case |
|------|------------|-----------|----------------|----------|
| Dev  | `sk-dev-`  | 30        | 30M            | Development, testing |
| Pro  | `sk-pro-`  | 120       | 30M            | Production apps |

**Token Quota:** Có thể tùy chỉnh: 10M, 20M, 30M, 40M, 50M...

### 2. Database Schema (MongoDB)

**Connection:** MongoDB Atlas (via `MONGODB_URI` environment variable)

```javascript
// Collection: user_keys
{
  _id: "sk-dev-abc123",           // API key as primary key
  name: "User A",                  // Tên user/app
  tier: "dev",                     // 'dev' hoặc 'pro'
  totalTokens: 30000000,           // 30M mặc định
  tokensUsed: 0,
  requestsCount: 0,
  isActive: true,
  createdAt: ISODate("2025-01-01T00:00:00Z"),
  lastUsedAt: ISODate("2025-01-20T10:30:00Z"),
  notes: "Premium customer"
}

// Collection: factory_keys
{
  _id: "factory-1",                // Factory key ID
  apiKey: "sk-factory-xxx",        // Actual API key (encrypted recommended)
  status: "healthy",               // healthy, rate_limited, exhausted
  tokensUsed: 0,
  requestsCount: 0,
  lastError: null,
  cooldownUntil: null,
  createdAt: ISODate("2025-01-01T00:00:00Z")
}

// Collection: request_logs (optional, for debugging)
{
  _id: ObjectId("..."),
  userKeyId: "sk-dev-abc123",
  factoryKeyId: "factory-1",
  tokensUsed: 1500,
  statusCode: 200,
  createdAt: ISODate("2025-01-20T10:30:00Z")
}
```

**Indexes:**
```javascript
// user_keys indexes
db.user_keys.createIndex({ isActive: 1 })
db.user_keys.createIndex({ tier: 1 })

// factory_keys indexes
db.factory_keys.createIndex({ status: 1 })

// request_logs indexes (TTL - auto delete after 30 days)
db.request_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })
```

### 3. Configuration Structure

```json
{
  "port": 8003,
  "database": {
    "type": "mongodb",
    "uri": "${MONGODB_URI}",
    "name": "fproxy"
  },
  "admin": {
    "secret_key": "admin-secret-xxx",
    "enabled": true
  },
  "tiers": {
    "dev": {
      "rpm": 30,
      "default_tokens": 30000000
    },
    "pro": {
      "rpm": 120,
      "default_tokens": 30000000
    }
  },
  "factory_keys": {
    "health_check": {
      "enabled": true,
      "rate_limit_cooldown": "60s",
      "exhausted_cooldown": "24h",
      "max_consecutive_errors": 3
    },
    "items": [
      {"id": "factory-1", "api_key": "sk-factory-xxx1"},
      {"id": "factory-2", "api_key": "sk-factory-xxx2"},
      {"id": "factory-3", "api_key": "sk-factory-xxx3"}
    ]
  },
  "endpoints": [...],
  "models": [...]
}
```

### 4. Admin API Design

#### GET /admin/keys - List all keys
```json
// Response
{
  "total": 25,
  "active": 23,
  "keys": [
    {
      "id": "sk-dev-abc123",
      "name": "User A",
      "tier": "dev",
      "total_tokens": 30000000,
      "tokens_used": 12500000,
      "tokens_remaining": 17500000,
      "usage_percent": 41.7,
      "requests_count": 1520,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "last_used_at": "2025-01-20T10:30:00Z"
    }
  ]
}
```

#### POST /admin/keys - Create new key
```json
// Request
{
  "name": "New User",
  "tier": "pro",
  "total_tokens": 50000000,  // Optional, default 30M
  "notes": "Premium customer"
}

// Response
{
  "id": "sk-pro-xyz789",
  "name": "New User",
  "tier": "pro",
  "total_tokens": 50000000,
  "created_at": "2025-01-20T12:00:00Z"
}
```

#### PATCH /admin/keys/:id - Update key
```json
// Request
{
  "total_tokens": 60000000,  // Tăng quota
  "notes": "Upgraded to 60M"
}

// Response
{
  "id": "sk-pro-xyz789",
  "total_tokens": 60000000,
  "tokens_remaining": 47500000,
  "updated_at": "2025-01-20T12:30:00Z"
}
```

#### DELETE /admin/keys/:id - Revoke key
```json
// Response
{
  "id": "sk-pro-xyz789",
  "revoked": true,
  "revoked_at": "2025-01-20T13:00:00Z"
}
```

### 5. User API Design

#### GET /api/usage?key=xxx
```json
// Response (success)
{
  "key": "sk-pro-***789",
  "tier": "pro",
  "rpm_limit": 120,
  "total_tokens": 50000000,
  "tokens_used": 12500000,
  "tokens_remaining": 37500000,
  "usage_percent": 25.0,
  "requests_count": 2341,
  "is_active": true,
  "last_used_at": "2025-01-20T11:45:00Z"
}

// Response (exhausted)
{
  "key": "sk-dev-***123",
  "tier": "dev",
  "total_tokens": 30000000,
  "tokens_used": 30000000,
  "tokens_remaining": 0,
  "usage_percent": 100.0,
  "is_active": true,
  "is_exhausted": true,
  "message": "Token quota exhausted. Please contact admin."
}

// Response (invalid)
{
  "error": "Invalid API key"
}
```

### 6. Token Quota Enforcement

```go
func checkUserQuota(userKey *UserKey) error {
    if !userKey.IsActive {
        return ErrKeyRevoked
    }
    
    if userKey.TokensUsed >= userKey.TotalTokens {
        return ErrQuotaExhausted
    }
    
    return nil
}

// Response khi hết quota
// HTTP 402 Payment Required
{
  "error": {
    "type": "quota_exhausted",
    "message": "Token quota exhausted. Used 30,000,000 / 30,000,000 tokens.",
    "tokens_used": 30000000,
    "total_tokens": 30000000
  }
}
```

### 7. Factory Key Health Check

```go
type FactoryKeyStatus string

const (
    StatusHealthy     FactoryKeyStatus = "healthy"
    StatusRateLimited FactoryKeyStatus = "rate_limited"  // 429, cooldown 60s
    StatusExhausted   FactoryKeyStatus = "exhausted"     // Hết 40M, cooldown 24h
    StatusError       FactoryKeyStatus = "error"         // 5xx, cooldown 30s
)

func checkFactoryResponse(keyID string, resp *http.Response, body []byte) {
    switch resp.StatusCode {
    case 200:
        markHealthy(keyID)
        
    case 429:
        if isQuotaExhausted(body) {
            markExhausted(keyID, 24*time.Hour)
        } else {
            markRateLimited(keyID, 60*time.Second)
        }
        
    case 402:
        markExhausted(keyID, 24*time.Hour)
        
    case 500, 502, 503:
        markError(keyID, 30*time.Second)
    }
}
```

## Request Flow

```
1. Client gửi request với User API Key
   Authorization: Bearer sk-pro-xyz789

2. Validate User Key
   → Lookup trong SQLite
   → Check is_active = true
   → Check tokens_used < total_tokens
   
3. Check Rate Limit (RPM by tier)
   → Pro tier: 120 RPM
   → Dev tier: 30 RPM
   → Reject nếu vượt limit

4. Select Factory Key (Round-Robin)
   → Chỉ chọn keys có status = healthy
   → Round-robin trong pool healthy

5. Forward Request to Factory AI

6. Handle Response
   → Update Factory key health status
   → Extract tokens_used từ response

7. Update Usage
   → user_keys.tokens_used += tokens_used
   → user_keys.requests_count += 1
   → user_keys.last_used_at = now()

8. Return Response to Client
```

## Project Structure (Hybrid: Go + Node.js + MongoDB)

```
f-proxy/
├── goproxy/                      # Go Reverse Proxy (port 8003)
│   ├── main.go
│   ├── go.mod
│   ├── config/
│   │   └── config.go
│   ├── internal/
│   │   ├── keypool/              # Factory key rotation
│   │   │   ├── pool.go
│   │   │   └── health.go
│   │   ├── userkey/              # User key validation (READ MongoDB)
│   │   │   ├── model.go
│   │   │   └── validator.go
│   │   ├── ratelimit/            # RPM rate limiting
│   │   │   └── limiter.go
│   │   └── usage/                # Usage tracking (WRITE MongoDB)
│   │       └── tracker.go
│   ├── transformers/
│   │   ├── request.go
│   │   └── response.go
│   └── db/
│       └── mongodb.go            # MongoDB connection
│
├── backend/                      # Node.js Admin Service (port 3000)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts              # Express server entry
│   │   ├── routes/
│   │   │   ├── admin.ts          # Admin CRUD endpoints
│   │   │   └── usage.ts          # User usage API
│   │   ├── services/
│   │   │   ├── userkey.service.ts
│   │   │   └── factorykey.service.ts
│   │   ├── db/
│   │   │   ├── mongodb.ts        # MongoDB connection
│   │   │   └── models/
│   │   │       ├── userkey.model.ts
│   │   │       └── factorykey.model.ts
│   │   ├── middleware/
│   │   │   └── admin-auth.ts
│   │   └── types/
│   │       └── index.ts
│   └── static/
│       └── usage.html            # Usage check web UI
│
├── .env.example                  # Environment variables template
├── docker-compose.yml            # Run both services
├── Makefile                      # Build commands
└── README.md
```

**Environment Variables (.env):**
```bash
# MongoDB Atlas connection
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=...

# Admin authentication
ADMIN_SECRET_KEY=your-admin-secret-here

# Go Proxy config
PROXY_PORT=8003
FACTORY_API_KEY=sk-factory-xxx

# Node.js Backend config
BACKEND_PORT=3000
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| MongoDB Atlas latency | +10-50ms per query | Connection pooling, caching hot keys |
| Connection string exposure | Security breach | Use env vars, never commit to git |
| Admin key exposure | Unauthorized access | Strong secret, rate limit admin endpoints |
| Token count accuracy | Over/under counting | Extract từ API response, log for audit |
| Factory key exhaustion | Service disruption | Alert khi còn ít healthy keys |
| MongoDB Atlas downtime | Service unavailable | Retry logic, circuit breaker |

## Migration Plan

### Phase 1: Core (3-4 ngày)
1. Setup SQLite database + migrations
2. Implement User Key validation + quota check
3. Implement Factory Key pool + round-robin
4. Basic health checking

### Phase 2: Admin (2-3 ngày)
1. Admin authentication middleware
2. CRUD endpoints for user keys
3. Factory key status endpoint

### Phase 3: User (1-2 ngày)
1. Usage API endpoint
2. Usage web UI (static HTML)

### Phase 4: Polish (1-2 ngày)
1. Rate limiting by tier
2. Logging + metrics
3. Documentation

**Total: ~1.5-2 tuần**

## Open Questions
1. ~~Token quota có reset monthly không?~~ → Không, dùng hết thì hết
2. ~~Admin có thể reset usage không?~~ → Có, qua PATCH endpoint
3. Có cần email notification khi gần hết quota? → Phase 2 (optional)
