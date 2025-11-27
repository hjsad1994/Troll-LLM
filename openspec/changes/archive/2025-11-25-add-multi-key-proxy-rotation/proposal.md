# Change: Add Multi-Key Proxy Rotation + User API Key Management

## Why
Hiện tại hệ thống chỉ hỗ trợ 1 FACTORY_API_KEY duy nhất, dẫn đến:
- Giới hạn rate limit của 1 key
- Không có failover khi key bị block hoặc hết quota
- Không thể scale theo số lượng request
- Không thể quản lý nhiều users với quota riêng

Cần hỗ trợ:
1. Nhiều Factory API keys (10+) với rotation để tối ưu throughput
2. Hệ thống User API Keys với token quota (không cần đăng ký tài khoản)
3. Admin dashboard để quản lý keys
4. User website để check usage

## What Changes

### 1. Factory Key Pool (Upstream)
- **BREAKING**: Cấu trúc config.json thay đổi để hỗ trợ multiple Factory keys
- Round-robin rotation giữa các Factory keys
- Health check: auto-disable key khi hết quota hoặc bị rate limit
- Auto-recovery sau cooldown period

### 2. User API Key Management (NEW)
- Admin có thể tạo/thu hồi User API keys
- Mỗi key có token quota tùy chỉnh (10M, 20M, 30M... mặc định 30M)
- 2 tiers: Dev (30 RPM) và Pro (120 RPM)
- Block user khi hết token quota
- **MongoDB Atlas** để lưu keys và usage (cloud database)

### 3. Admin Endpoints (NEW)
- `GET /admin/keys` - Xem tất cả keys + usage
- `POST /admin/keys` - Tạo key mới (custom token limit)
- `DELETE /admin/keys/:key` - Thu hồi key
- `PATCH /admin/keys/:key` - Cập nhật token limit
- Protected bằng Admin Secret Key

### 4. User Endpoints (NEW)
- `GET /api/usage?key=xxx` - API xem usage (JSON)
- `GET /usage` - Web UI để check usage

## Impact
- Affected specs: `api-proxy` (new capability)
- Architecture: **Hybrid Go + Node.js**
- Affected code:

### goproxy/ (Go - Reverse Proxy, port 8003)
  - `config/config.go` - Thêm tiers, factory_keys config
  - `main.go` - Tích hợp key validation + usage tracking
  - New: `internal/keypool/` - Factory key pool + health check
  - New: `internal/userkey/` - User key validation (READ MongoDB)
  - New: `internal/ratelimit/` - RPM limiting by tier
  - New: `internal/usage/` - Usage tracking (WRITE MongoDB)
  - New: `db/mongodb.go` - MongoDB connection

### backend/ (Node.js TypeScript - Admin API, port 3000)
  - New: `src/routes/admin.ts` - Admin CRUD endpoints
  - New: `src/routes/usage.ts` - User usage API
  - New: `src/services/userkey.service.ts` - Key management
  - New: `src/db/mongodb.ts` - MongoDB connection (mongoose)
  - New: `src/middleware/admin-auth.ts` - Admin authentication
  - New: `static/usage.html` - Usage check web UI

### Database (MongoDB Atlas)
  - Collection: `user_keys` - User API keys + usage
  - Collection: `factory_keys` - Factory keys + health status
  - Collection: `request_logs` - Request logs (TTL 30 days)

## Success Metrics
- Throughput tăng tỷ lệ với số Factory keys
- User bị block ngay khi hết token quota
- Admin có thể quản lý keys trong < 1 phút
- User có thể check usage trong < 3 giây
