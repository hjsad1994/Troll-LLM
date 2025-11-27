# Tasks: Multi-Key Proxy Rotation + User API Key Management

## Architecture: Hybrid Go + Node.js + MongoDB

```
f-proxy/
├── goproxy/      # Go - Reverse Proxy (port 8003)
├── backend/      # Node.js - Admin + Usage API (port 3000)
└── MongoDB Atlas # Cloud database (shared)
```

---

## Phase 1: Project Setup (1 ngày)

### 1.1 Directory Structure
- [ ] 1.1.1 Create `goproxy/` directory, move existing Go code
- [ ] 1.1.2 Update `goproxy/go.mod` với module path mới
- [ ] 1.1.3 Create `backend/` directory cho Node.js
- [ ] 1.1.4 Create `.env.example` với template environment variables
- [ ] 1.1.5 Update root `Makefile` với commands cho cả 2 services
- [ ] 1.1.6 Add `.env` to `.gitignore` (bảo mật connection string)

### 1.2 MongoDB Setup
- [ ] 1.2.1 Verify MongoDB Atlas connection
- [ ] 1.2.2 Create database `fproxy` với collections: user_keys, factory_keys
- [ ] 1.2.3 Create indexes cho user_keys (isActive, tier)
- [ ] 1.2.4 Create indexes cho factory_keys (status)
- [ ] 1.2.5 Create TTL index cho request_logs (auto-delete after 30 days)

---

## Phase 2: Node.js Backend (3-4 ngày)

### 2.1 Project Setup
- [ ] 2.1.1 Init `backend/package.json` với dependencies (express, mongoose, zod, nanoid)
- [ ] 2.1.2 Setup TypeScript (`tsconfig.json`)
- [ ] 2.1.3 Create `backend/src/index.ts` - Express server
- [ ] 2.1.4 Setup MongoDB connection với mongoose
- [ ] 2.1.5 Create Mongoose models (UserKey, FactoryKey)

### 2.2 Admin Authentication
- [ ] 2.2.1 Create `backend/src/middleware/admin-auth.ts`
- [ ] 2.2.2 Validate X-Admin-Key header
- [ ] 2.2.3 Rate limit failed auth attempts

### 2.3 Admin CRUD Endpoints
- [ ] 2.3.1 Create `backend/src/routes/admin.ts`
- [ ] 2.3.2 `POST /admin/keys` - Create key (name, tier, total_tokens)
- [ ] 2.3.3 `GET /admin/keys` - List all keys with usage stats
- [ ] 2.3.4 `GET /admin/keys/:id` - Get single key details
- [ ] 2.3.5 `PATCH /admin/keys/:id` - Update key (total_tokens, notes)
- [ ] 2.3.6 `DELETE /admin/keys/:id` - Revoke key (soft delete)

### 2.4 Factory Keys Admin
- [ ] 2.4.1 `GET /admin/factory-keys` - List factory keys + health
- [ ] 2.4.2 `POST /admin/factory-keys/:id/reset` - Reset health status

### 2.5 User Usage Endpoints
- [ ] 2.5.1 Create `backend/src/routes/usage.ts`
- [ ] 2.5.2 `GET /api/usage?key=xxx` - Return usage JSON
- [ ] 2.5.3 Handle invalid/revoked/exhausted key responses

### 2.6 Usage Web UI
- [ ] 2.6.1 Create `backend/static/usage.html`
- [ ] 2.6.2 Implement input field, progress bar, stats display
- [ ] 2.6.3 `GET /usage` - Serve static HTML page
- [ ] 2.6.4 Add responsive CSS styling

### 2.7 Services Layer
- [ ] 2.7.1 Create `backend/src/services/userkey.service.ts`
- [ ] 2.7.2 Implement key generation (sk-dev-xxx, sk-pro-xxx)
- [ ] 2.7.3 Create `backend/src/services/factorykey.service.ts`

---

## Phase 3: Go Proxy Updates (3-4 ngày)

### 3.1 MongoDB Integration
- [ ] 3.1.1 Add MongoDB driver to `goproxy/go.mod` (`go.mongodb.org/mongo-driver`)
- [ ] 3.1.2 Create `goproxy/db/mongodb.go` - Connection setup
- [ ] 3.1.3 Implement connection pooling và retry logic

### 3.2 User Key Validation
- [ ] 3.2.1 Create `goproxy/internal/userkey/model.go`
- [ ] 3.2.2 Create `goproxy/internal/userkey/validator.go`
- [ ] 3.2.3 Read user_keys từ MongoDB
- [ ] 3.2.4 Validate: exists, isActive, quota not exhausted

### 3.3 Rate Limiting
- [ ] 3.3.1 Create `goproxy/internal/ratelimit/limiter.go`
- [ ] 3.3.2 Implement sliding window RPM
- [ ] 3.3.3 Apply tier-based limits (Dev: 30, Pro: 120)
- [ ] 3.3.4 Return HTTP 429 with headers

### 3.4 Factory Key Pool
- [ ] 3.4.1 Create `goproxy/internal/keypool/model.go`
- [ ] 3.4.2 Create `goproxy/internal/keypool/pool.go` - Round-robin
- [ ] 3.4.3 Create `goproxy/internal/keypool/health.go`
- [ ] 3.4.4 Load factory_keys từ config
- [ ] 3.4.5 Implement health status transitions

### 3.5 Usage Tracking
- [ ] 3.5.1 Create `goproxy/internal/usage/tracker.go`
- [ ] 3.5.2 Extract tokens from API response
- [ ] 3.5.3 Update user_keys.tokens_used sau mỗi request
- [ ] 3.5.4 Update user_keys.requests_count

### 3.6 Request Flow Integration
- [ ] 3.6.1 Update `main.go` - Init SQLite, keypool on startup
- [ ] 3.6.2 Modify `chatCompletionsHandler`:
  - Extract user key từ Authorization header
  - Validate user key (exists, active, quota)
  - Check RPM limit
  - Select factory key (round-robin healthy)
  - Track usage after response
- [ ] 3.6.3 Modify `handleAnthropicMessagesEndpoint` (same flow)
- [ ] 3.6.4 Return HTTP 402 when quota exhausted
- [ ] 3.6.5 Return HTTP 503 when no healthy factory keys

### 3.7 Streaming Support
- [ ] 3.7.1 Ensure same factory key for entire stream
- [ ] 3.7.2 Accumulate tokens từ streaming deltas
- [ ] 3.7.3 Update usage after stream completes

### 3.8 Configuration
- [ ] 3.8.1 Update `goproxy/config/config.go`
- [ ] 3.8.2 Add tiers config (rpm limits)
- [ ] 3.8.3 Add factory_keys config
- [ ] 3.8.4 Add database path config

---

## Phase 4: Integration & DevOps (1-2 ngày)

### 4.1 Docker Setup
- [ ] 4.1.1 Create `goproxy/Dockerfile`
- [ ] 4.1.2 Create `backend/Dockerfile`
- [ ] 4.1.3 Create root `docker-compose.yml`
- [ ] 4.1.4 Setup environment variables cho MongoDB connection

### 4.2 Makefile Commands
- [ ] 4.2.1 `make backend-dev` - Run Node.js in dev mode
- [ ] 4.2.2 `make proxy-dev` - Run Go proxy in dev mode
- [ ] 4.2.3 `make dev` - Run both services
- [ ] 4.2.4 `make build` - Build both services
- [ ] 4.2.5 `make docker-up` - Run with Docker Compose

### 4.3 Health Endpoint
- [ ] 4.3.1 Update Go `/health` với factory key stats
- [ ] 4.3.2 Add Node.js `/health` endpoint
- [ ] 4.3.3 Add user key stats to health response

---

## Phase 5: Testing & Documentation (1-2 ngày)

### 5.1 Backend Tests (Node.js)
- [ ] 5.1.1 Unit tests for userkey.service
- [ ] 5.1.2 Integration tests for admin endpoints
- [ ] 5.1.3 Integration tests for usage endpoint

### 5.2 Proxy Tests (Go)
- [ ] 5.2.1 Unit tests for userkey validator
- [ ] 5.2.2 Unit tests for keypool
- [ ] 5.2.3 Unit tests for ratelimit
- [ ] 5.2.4 Integration test: full request flow

### 5.3 E2E Tests
- [ ] 5.3.1 Test: Create key → Use API → Check usage
- [ ] 5.3.2 Test: Quota exhaustion blocking
- [ ] 5.3.3 Test: Rate limit enforcement

### 5.4 Documentation
- [ ] 5.4.1 Update root README.md
- [ ] 5.4.2 Create `backend/README.md` - Admin API docs
- [ ] 5.4.3 Create `goproxy/README.md` - Proxy docs
- [ ] 5.4.4 Add API examples

---

## Summary

| Phase | Service | Tasks | Est. Time |
|-------|---------|-------|-----------|
| 1. Setup | Both | 9 tasks | 1 ngày |
| 2. Backend | Node.js | 22 tasks | 3-4 ngày |
| 3. Proxy | Go | 24 tasks | 3-4 ngày |
| 4. DevOps | Both | 9 tasks | 1-2 ngày |
| 5. Testing | Both | 11 tasks | 1-2 ngày |
| **Total** | | **75 tasks** | **~1.5-2 tuần** |

## Parallel Development

```
Timeline:
─────────────────────────────────────────────────────►
Day 1     Day 2-5         Day 2-5         Day 6-7    Day 8-9
┌─────┐   ┌───────────┐   ┌───────────┐   ┌───────┐  ┌───────┐
│Setup│ → │ Backend   │   │ Go Proxy  │ → │DevOps │→ │Testing│
│     │   │ (Node.js) │   │ (Go)      │   │       │  │       │
└─────┘   └───────────┘   └───────────┘   └───────┘  └───────┘
              ↑               ↑
              └───────┬───────┘
                      │
              Can work in parallel!
```
