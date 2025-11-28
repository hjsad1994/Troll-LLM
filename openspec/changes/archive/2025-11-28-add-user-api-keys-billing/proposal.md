# Change: Add User API Keys Management and Billing Dashboard

## Why
Users cần quản lý API key của họ khi đăng nhập vào dashboard - có thể xem và rotate API key khi bị leak. Đồng thời, users cần xem thông tin billing: tổng token còn lại, tokens đã dùng trong tháng, và plan hiện tại.

## What Changes
- **ADDED**: User API Key section trong Dashboard
  - Hiển thị API key (masked format)
  - Copy API key to clipboard
  - Rotate API key (tạo key mới, invalidate key cũ)
  - Format mới: `sk-trollllm-{64-char-hex}` (ví dụ: `sk-trollllm-4e969789b289aaaf1ec1c5ad3bd80f90dbb565691b0abae95a7e34b1d4f9b7d5`)
- **ADDED**: Billing section trong Dashboard
  - Hiển thị total tokens remaining
  - Hiển thị tokens used this month
  - Hiển thị current plan của user
- **MODIFIED**: User model - thêm plan field và monthly usage tracking
- **ADDED**: Backend APIs cho user key management và billing

## Impact
- Affected specs: `api-proxy` (modify), `user-dashboard` (new)
- Affected code:
  - `backend/src/routes/` - new user routes
  - `backend/src/models/` - update User model
  - `frontend/src/app/(dashboard)/` - update dashboard UI
  - `goproxy/` - update key format generation
