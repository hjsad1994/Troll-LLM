# Change: Add User Dashboard Test Page with Detailed Request Analytics

## Why
User cần xem chi tiết usage metrics của từng request bao gồm: input tokens, output tokens, cache write tokens, cache hit tokens, và credits burned. Dashboard hiện tại (`/dashboard`) chỉ hiển thị tổng credits burned theo period, không có breakdown chi tiết tokens.

## What Changes
- Tạo page mới `/dashboard-test` cho user (blocked - deploy sau)
- Thêm backend endpoint mới để lấy detailed usage stats của user hiện tại
- Hiển thị breakdown: input tokens, output tokens, cache write, cache hit, credits burned
- Hỗ trợ filter theo period (1h, 24h, 7d, 30d)

## Impact
- Affected specs: `user-dashboard`
- Affected code:
  - `backend/src/routes/user.routes.ts` - Thêm endpoint mới
  - `backend/src/repositories/request-log.repository.ts` - Thêm method aggregate detailed stats
  - `frontend/src/app/(dashboard)/dashboard-test/page.tsx` - Tạo page mới
