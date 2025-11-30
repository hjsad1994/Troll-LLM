# Change: Add Plan Expiration Handling

## Why
Khi admin set user lên Dev Plan hoặc Pro Plan, hiện tại không có cơ chế để tự động reset plan về Free Tier sau 1 tháng. Cần thêm tính năng theo dõi thời điểm nâng cấp plan và tự động xử lý khi plan hết hạn.

## What Changes
- Thêm field `planStartDate` vào User model để theo dõi thời điểm nâng cấp plan
- Thêm field `planExpiresAt` để xác định ngày hết hạn plan (1 tháng sau khi upgrade)
- Thêm middleware/cron job kiểm tra plan expiration
- Khi plan hết hạn:
  - Reset `plan` về `'free'`
  - Reset `credits` về `0`
  - Reset `totalTokens` về `0`
  - Gửi notification cho user (optional)

## Impact
- Affected specs: `user-dashboard`
- Affected code:
  - `backend/src/models/user.model.ts` - Thêm fields mới
  - `backend/src/services/user.service.ts` - Logic kiểm tra expiration
  - `backend/src/routes/admin.ts` - Update logic khi set plan
  - `goproxy/internal/userkey/model.go` - Sync fields nếu cần
