# TrollLLM - Architecture Documentation

## 1. System Overview

TrollLLM is a high-performance LLM API proxy service that provides unified access to multiple AI providers (Anthropic, OpenAI, OpenHands) with advanced features including rate limiting, token billing, key rotation, and proxy pooling.

### 1.1 Architecture Diagram

```
                                    ┌─────────────────────────────────────┐
                                    │           TrollLLM System           │
                                    └─────────────────────────────────────┘
                                                      │
        ┌─────────────────────────────────────────────┼─────────────────────────────────────────────┐
        │                                             │                                             │
        ▼                                             ▼                                             ▼
┌───────────────────┐                     ┌───────────────────┐                     ┌───────────────────┐
│     Frontend      │                     │      Backend      │                     │      GoProxy      │
│    (Next.js)      │────────────────────▶│    (Express.js)   │                     │       (Go)        │
│    Port: 3001     │                     │    Port: 3000     │                     │    Port: 8080     │
└───────────────────┘                     └───────────────────┘                     └───────────────────┘
        │                                          │                                         │
        │  User Dashboard                          │  REST API                               │  LLM Proxy
        │  - Login/Register                        │  - Auth (JWT)                           │  - /v1/chat/completions
        │  - API Key Management                    │  - User Management                      │  - /v1/messages
        │  - Usage Analytics                       │  - Admin Dashboard                      │  - /v1/models
        │  - Billing/Credits                       │  - Billing/Payments                     │
        │                                          │                                         │
        └──────────────────────────────────────────┼─────────────────────────────────────────┘
                                                   │
                                                   ▼
                                          ┌───────────────────┐
                                          │     MongoDB       │
                                          │   (Data Store)    │
                                          └───────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
           ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
           │    users      │              │   user_keys   │              │ request_logs  │
           │  (UserNew)    │              │               │              │               │
           └───────────────┘              └───────────────┘              └───────────────┘
```

### 1.2 Request Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│   GoProxy       │
│   (Port 8080)   │
└─────────────────┘
      │
      ├─── 1. Validate API Key (MongoDB user_keys / Friend Keys)
      │
      ├─── 2. Check Rate Limit (RPM per user tier)
      │
      ├─── 3. Select Upstream (Model-based routing)
      │         │
      │         ├── claude-sonnet-4-* ──▶ Main Target Server
      │         ├── claude-3-5-* ──────▶ OpenHands LLM Proxy
      │         └── other models ──────▶ Factory AI (with proxy)
      │
      ├─── 4. Transform Request (OpenAI ↔ Anthropic)
      │
      ├─── 5. Forward to Upstream
      │
      ├─── 6. Stream/Buffer Response
      │
      ├─── 7. Calculate Billing (tokens * price * multiplier)
      │
      ├─── 8. Deduct Credits from User
      │
      └─── 9. Log Request Details
             │
             ▼
      Response to Client
```

## 2. Component Architecture

### 2.1 Frontend (Next.js)

**Location:** `frontend/`

**Technology Stack:**
- Next.js 14 (App Router)
- React 18
- TailwindCSS
- TypeScript
- next-intl (i18n)

**Key Features:**
- Server-side rendering
- JWT authentication
- Responsive dashboard
- Multi-language support (en, vi, zh)

**Directory Structure:**
```
frontend/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── [locale]/        # i18n routing
│   │   │   ├── dashboard/   # User dashboard
│   │   │   ├── admin/       # Admin panel
│   │   │   └── pricing/     # Pricing page
│   │   └── api/             # API routes
│   ├── components/          # React components
│   ├── lib/                 # Utilities
│   └── messages/            # i18n translations
├── public/                  # Static assets
└── package.json
```

### 2.2 Backend (Express.js)

**Location:** `backend/`

**Technology Stack:**
- Express.js
- TypeScript
- MongoDB (Mongoose)
- JWT (jsonwebtoken)
- bcryptjs

**API Routes:**

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/login` | POST | - | User login |
| `/api/register` | POST | - | User registration |
| `/api/user/me` | GET | JWT | Get current user |
| `/api/user/api-key` | GET | JWT | Get API key |
| `/api/user/api-key/rotate` | POST | JWT | Rotate API key |
| `/api/user/friend-key` | GET/POST | JWT | Friend key management |
| `/api/user/billing` | GET | JWT | Billing info |
| `/api/payment/*` | * | Mixed | Payment endpoints |
| `/admin/*` | * | JWT+Admin | Admin endpoints |

**Data Models:**

```typescript
// UserNew Model
{
  username: string;
  password: string;       // bcrypt hashed
  role: 'user' | 'admin';
  credits: number;        // Current balance
  refCredits: number;     // Referral credits
  tokensUsed: number;     // Total tokens consumed
  creditsExpireAt: Date;
  discordId?: string;
  isActive: boolean;
}

// UserKey Model
{
  name: string;           // username reference
  key: string;            // API key (sk-troll-xxx)
  tier: 'dev' | 'pro';
  isActive: boolean;
  lastUsedAt: Date;
}

// FriendKey Model
{
  key: string;            // fk-xxx
  ownerUsername: string;
  name: string;
  isActive: boolean;
  modelLimits: Map<string, ModelLimit>;
  totalSpent: number;
}
```

### 2.3 GoProxy (Go)

**Location:** `goproxy/`

**Technology Stack:**
- Go 1.25
- net/http (HTTP/2 enabled)
- MongoDB Driver
- SSE streaming

**Core Components:**

```
goproxy/
├── main.go                  # HTTP server & request handlers
├── config/
│   └── config.go            # Model configuration & pricing
├── db/
│   └── mongodb.go           # Database connection
├── internal/
│   ├── keypool/             # Troll key rotation
│   ├── openhandspool/       # OpenHands key rotation
│   ├── openhands/           # OpenHands provider
│   ├── maintarget/          # Main target server handler
│   ├── proxy/               # HTTP proxy pool
│   ├── ratelimit/           # Rate limiter (sliding window)
│   ├── usage/               # Usage tracking & billing
│   └── userkey/             # API key validation
└── transformers/
    ├── openai.go            # OpenAI format transformers
    └── anthropic.go         # Anthropic format transformers
```

**Endpoint Handlers:**

| Endpoint | Handler | Description |
|----------|---------|-------------|
| `/v1/chat/completions` | `chatCompletionsHandler` | OpenAI-compatible chat |
| `/v1/messages` | `handleAnthropicMessagesEndpoint` | Anthropic-native API |
| `/v1/models` | `modelsHandler` | List available models |
| `/health` | `healthHandler` | Health check |
| `/keys/status` | `keysStatusHandler` | Key pool status |
| `/reload` | Manual reload | Reload key bindings |

## 3. Key Subsystems

### 3.1 Model-Based Routing

```go
// selectUpstreamConfig determines upstream based on model ID
func selectUpstreamConfig(modelID string, clientAPIKey string) (*UpstreamConfig, *proxy.Proxy, error) {
    upstream := config.GetModelUpstream(modelID)

    switch upstream {
    case "main":
        // Route to Main Target Server (claude-sonnet-4-*, claude-haiku-*)
        return &UpstreamConfig{
            EndpointURL: mainTargetServer + "/v1/messages",
            APIKey:      mainUpstreamKey,
            UseProxy:    false,
        }, nil, nil

    case "openhands", "troll":
        // Route to OpenHands LLM Proxy with key rotation
        return &UpstreamConfig{
            EndpointURL: "https://llm-proxy.app.all-hands.dev",
            APIKey:      "", // handled by pool
            UseProxy:    false,
        }, nil, nil
    }
    // Fallback to OpenHands
}
```

### 3.2 Rate Limiting

```go
// Sliding window rate limiter
type RateLimiter struct {
    windows map[string]*Window
    mutex   sync.RWMutex
}

// Tier-based limits
const (
    DefaultRPM = 300  // Dev tier
    ProRPM     = 1000 // Pro tier
)

// Check rate limit with refCredits support
func checkRateLimitWithUsername(w http.ResponseWriter, apiKey string, username string) bool {
    limit := ratelimit.DefaultRPM

    // Get tier-specific limit
    user, err := userkey.GetKeyByID(apiKey)
    if err == nil && user != nil {
        limit = user.GetRPMLimit()
    }

    // Pro RPM when using refCredits
    if creditResult.UseRefCredits {
        limit = 1000
    }

    return rateLimiter.Allow(apiKey, limit)
}
```

### 3.3 Token Billing

```go
// Calculate billing with cache token pricing
func CalculateBillingCostWithCache(modelID string, input, output, cacheWrite, cacheHit int64) float64 {
    inputPrice, outputPrice := GetModelPricing(modelID)
    cacheWritePrice, cacheHitPrice := GetModelCachePricing(modelID)
    multiplier := GetBillingMultiplier(modelID)

    cost := (float64(input) * inputPrice / 1_000_000) +
            (float64(output) * outputPrice / 1_000_000) +
            (float64(cacheWrite) * cacheWritePrice / 1_000_000) +
            (float64(cacheHit) * cacheHitPrice / 1_000_000)

    return cost * multiplier
}
```

### 3.4 Key Pool Management

```go
// OpenHands key rotation with health checking
type KeyPool struct {
    keys    []*Key
    current int
    mutex   sync.RWMutex
}

// Select healthy key with round-robin
func (p *KeyPool) SelectKey() (*Key, error) {
    p.mutex.Lock()
    defer p.mutex.Unlock()

    for i := 0; i < len(p.keys); i++ {
        idx := (p.current + i) % len(p.keys)
        if p.keys[idx].IsHealthy() {
            p.current = idx + 1
            return p.keys[idx], nil
        }
    }
    return nil, ErrNoHealthyKeys
}

// Auto-rotate on error (budget exceeded, auth error)
func (p *KeyPool) CheckAndRotateOnError(keyID string, statusCode int, errorBody string) {
    if isBudgetExceeded || isAuthError {
        p.MarkUnhealthy(keyID)
        p.ActivateBackupKey()
    }
}
```

### 3.5 Friend Key System

```go
// Friend Key validation with model limits
type FriendKeyResult struct {
    Key    *FriendKey
    Owner  *UserNew
}

func ValidateFriendKey(apiKey string) (*FriendKeyResult, error) {
    // 1. Find friend key
    friendKey := FindFriendKey(apiKey)

    // 2. Check key is active
    if !friendKey.IsActive {
        return nil, ErrFriendKeyInactive
    }

    // 3. Get owner and check credits
    owner := GetUser(friendKey.OwnerUsername)
    if owner.Credits <= 0 && owner.RefCredits <= 0 {
        return nil, ErrFriendKeyOwnerNoCredits
    }

    return &FriendKeyResult{Key: friendKey, Owner: owner}, nil
}

// Check model-specific limits
func CheckFriendKeyModelLimit(keyID, modelID string) error {
    limit := friendKey.ModelLimits[modelID]

    if !limit.Enabled {
        return ErrFriendKeyModelDisabled
    }

    if limit.SpentToday >= limit.DailyLimit {
        return ErrFriendKeyModelLimitExceeded
    }

    return nil
}
```

## 4. Data Flow

### 4.1 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│ GoProxy  │────▶│ MongoDB  │────▶│  Valid   │
│          │     │          │     │user_keys │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │ Authorization: │                │                │
     │ Bearer sk-xxx  │                │                │
     │───────────────▶│                │                │
     │                │ Find key       │                │
     │                │───────────────▶│                │
     │                │                │ Return user    │
     │                │◀───────────────│                │
     │                │                │                │
     │                │ Check credits  │                │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │ ✓ Validated    │                │
     │◀───────────────│                │                │
```

### 4.2 Streaming Response Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │◀────│ GoProxy  │◀────│ Upstream │
│          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘
     ▲                │                │
     │                │                │
     │    SSE Events  │                │
     │                │                │
     │ event: message_start            │
     │ data: {...}    │◀───────────────│
     │◀───────────────│                │
     │                │                │
     │ event: content_block_delta      │
     │ data: {...}    │◀───────────────│
     │◀───────────────│                │
     │                │ (filter Droid) │
     │                │                │
     │ event: message_delta (usage)    │
     │ data: {...}    │◀───────────────│
     │◀───────────────│                │
     │                │                │
     │                │ Update billing │
     │                │───────────────▶│
     │                │                │
     │ data: [DONE]   │                │
     │◀───────────────│                │
```

## 5. Security Considerations

### 5.1 API Key Security
- Keys are prefixed: `sk-troll-*` (user keys), `fk-*` (friend keys)
- Keys stored with bcrypt hash for passwords
- Keys can be rotated without account recreation
- Friend keys have spending limits

### 5.2 Proxy Security
- All Factory AI requests go through proxy pool (hide server IP)
- No fallback to direct connection on proxy failure
- Error messages sanitized to hide upstream details

### 5.3 Content Filtering
- Blocked content patterns compiled at startup
- "Claude Code", "Droid", etc. replaced with generic terms
- Thinking blocks filtered to hide system prompts

## 6. Configuration

### 6.1 Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/trollllm

# GoProxy
PORT=8080
DEBUG=false
CONFIG_PATH=config.json

# Upstream routing
MAIN_TARGET_SERVER=https://api.example.com
MAIN_UPSTREAM_KEY=sk-xxx

# Optional
PROXY_API_KEY=xxx          # Fixed API key (bypass DB validation)
TROLL_API_KEY=xxx          # Fallback Factory AI key
BINDING_RELOAD_INTERVAL=30s
```

### 6.2 Model Configuration (config.json)

```json
{
  "port": 8080,
  "models": [
    {
      "id": "claude-sonnet-4-20250514",
      "type": "anthropic",
      "upstream": "main",
      "pricing": {
        "input": 3.0,
        "output": 15.0,
        "cacheWrite": 3.75,
        "cacheHit": 0.30
      },
      "billingMultiplier": 1.05
    }
  ]
}
```

## 7. Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy (Docker)
```bash
docker-compose up -d
```

### Manual Deploy
```bash
# Frontend
cd frontend && npm run build && npm start

# Backend
cd backend && npm run build && npm start

# GoProxy
cd goproxy && go build && ./goproxy
```

---

*Generated by BMad Method Document Project Workflow*
*Date: 2025-12-17*
