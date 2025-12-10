# Change: Remove Plan System - Credits-Only Authentication

## Why
Hệ thống Plan hiện tại (free/dev/pro/pro-troll) tạo ra sự phức tạp không cần thiết. Mục tiêu là đơn giản hóa: chỉ cần có credits > 0 là có thể sử dụng API. Loại bỏ khái niệm "plan" và chuyển sang mô hình credits-only từ bảng `usersNew`.

## What Changes
- **BREAKING**: Loại bỏ field `plan` khỏi user model và tất cả logic liên quan
- **BREAKING**: Loại bỏ plan-based RPM limits, thay bằng RPM mặc định cho tất cả users có credits
- Đơn giản hóa logic xác thực: credits > 0 hoặc refCredits > 0 = có quyền truy cập
- Loại bỏ các plan pricing tiers (Dev: $225, Pro: $500, Pro Troll: $1250)
- Giữ nguyên cơ chế referral credits (refCredits)
- Giữ nguyên cơ chế credit deduction per request

## Impact
- Affected specs: `api-proxy`, `user-dashboard`, `payment`
- Affected code:
  - `backend/src/models/user.model.ts`, `user-new.model.ts`
  - `backend/src/services/user.service.ts`, `payment.service.ts`
  - `goproxy/internal/userkey/validator.go`, `model.go`
  - `frontend/src/app/(dashboard)/dashboard/page.tsx`
  - `frontend/src/app/checkout/page.tsx`
- Database: Remove `plan`, `planStartDate`, `planExpiresAt` fields from users/usersNew collections
