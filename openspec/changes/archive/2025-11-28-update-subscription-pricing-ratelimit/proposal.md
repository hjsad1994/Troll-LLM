# Change: Update Subscription Plans, Model Pricing, and Rate Limits

## Why
Cần cập nhật hệ thống để:
1. Chặn người dùng Free Tier khỏi việc sử dụng API proxy (trả về lỗi "Free Tier")
2. Thiết lập hệ thống tính giá token theo model cụ thể để tính toán chi phí chính xác
3. Cho phép Admin quản lý giá model thông qua dashboard
4. Cập nhật cấu hình gói dịch vụ với mức giá cố định ($225 Dev, $600 Pro)
5. Tăng giới hạn RPM cho gói Pro lên 1000

## What Changes

### 1. Access Control - Block Free Tier
- **BREAKING**: Free Tier users sẽ không thể sử dụng API proxy
- GoProxy sẽ trả về HTTP 403 với error type "free_tier_restricted"
- Frontend sẽ hiển thị thông báo upgrade plan

### 2. Model Pricing Configuration
- Thêm bảng giá model mới (đơn vị: $/MTok - triệu tokens):
  | Model | Input | Output |
  |-------|-------|--------|
  | Claude Sonnet 4.5 | $3/MTok | $15/MTok |
  | Claude Haiku 4.5 | $1/MTok | $5/MTok |
  | Claude Opus 4.5 | $5/MTok | $25/MTok |
- Tạo MongoDB collection `model_pricing` để lưu cấu hình giá
- Tạo Admin UI để quản lý giá model

### 3. Subscription Plan Updates
- Cập nhật giá trị token cho các gói:
  - Dev: $225 tương đương với totalTokens dựa trên pricing
  - Pro: $600 tương đương với totalTokens dựa trên pricing
- Thay đổi logic tính tokens dựa trên chi phí thực tế

### 4. Rate Limit Update
- **MODIFIED**: Tăng RPM limit cho gói Pro từ 600 lên 1000

## Impact

### Affected Specs
- `specs/api-proxy/spec.md` - Rate limiting, access control
- `specs/user-dashboard/spec.md` - Plan configuration

### Affected Code
- `backend/src/models/user.model.ts` - PLAN_LIMITS configuration
- `backend/src/models/` - Thêm model-pricing.model.ts
- `backend/src/routes/admin.routes.ts` - Thêm pricing management endpoints
- `backend/src/services/` - Thêm pricing.service.ts
- `goproxy/internal/userkey/model.go` - GetRPMLimit(), Free tier check
- `goproxy/main.go` - Free tier blocking logic
- `frontend/src/app/(dashboard)/admin/` - Thêm pricing management page

### Database Changes
- Thêm collection `model_pricing` với schema:
  ```json
  {
    "modelId": "claude-sonnet-4-5",
    "displayName": "Claude Sonnet 4.5",
    "inputPricePerMTok": 3.0,
    "outputPricePerMTok": 15.0,
    "isActive": true,
    "updatedAt": "2024-01-01T00:00:00Z"
  }
  ```

### Breaking Changes
- **Free Tier users sẽ bị chặn ngay lập tức** - cần thông báo trước cho users
