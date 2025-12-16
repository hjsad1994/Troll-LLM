# Change: Add Discord ID Input to User Dashboard

## Why
Cho phép user nhập và cập nhật Discord ID trực tiếp từ dashboard thay vì chỉ có thể nhập khi thanh toán. Điều này giúp user liên kết Discord account với TrollLLM account dễ dàng hơn.

## What Changes
- Thêm section "Discord Integration" bên dưới AI Provider trong API Key card
- User có thể nhập Discord ID (17-19 digits)
- Save button để cập nhật discordId vào database
- Hiển thị discordId hiện tại (nếu có) và cho phép update
- Thêm API endpoint `PATCH /api/user/discord-id` để cập nhật

## Impact
- Affected specs: user-dashboard
- Affected code:
  - `frontend/src/app/(dashboard)/dashboard/page.tsx` - Add Discord ID input UI
  - `frontend/src/lib/api.ts` - Add API function
  - `backend/src/routes/user.routes.ts` - Add PATCH endpoint
  - `backend/src/services/user.service.ts` - Add updateDiscordId method
  - `backend/src/repositories/user-new.repository.ts` - Add updateDiscordId method
