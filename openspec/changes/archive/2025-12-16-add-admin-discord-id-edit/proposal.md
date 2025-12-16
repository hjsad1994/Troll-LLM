# Change: Add Admin Discord ID Edit for Users

## Why
Cho phép admin chỉnh sửa discordID của user từ trang Users management (`/users`). Hiện tại admin chỉ có thể chỉnh sửa credits của user, nhưng không thể update discordID. Tính năng này giúp admin hỗ trợ user khi họ cần thay đổi Discord account liên kết.

## What Changes
- Thêm API endpoint `PATCH /admin/users/:username/discord-id` để admin update discordId của user
- Thêm nút Edit Discord ID trong mỗi row của bảng users trên trang `/users`
- Thêm modal để nhập Discord ID mới (17-19 digits)
- Hiển thị discordId hiện tại của user trong bảng users
- Thêm API function `updateUserDiscordId` trong frontend

## Impact
- Affected specs: admin-dashboard
- Affected code:
  - `backend/src/routes/admin.routes.ts` - Add PATCH endpoint for discord-id
  - `frontend/src/app/(dashboard)/users/page.tsx` - Add Discord ID column and edit button/modal
  - `frontend/src/lib/api.ts` - Add `updateUserDiscordId` function
  - `frontend/src/lib/i18n.ts` - Add translation strings for Discord ID edit
