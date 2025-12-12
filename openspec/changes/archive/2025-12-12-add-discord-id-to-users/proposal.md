# Proposal: Add Discord ID to Users

## Change ID
`add-discord-id-to-users`

## Summary
Lưu `discordId` vào collection `usersNew` khi người dùng thanh toán thành công, cho phép theo dõi liên kết Discord-User lâu dài và gửi webhook với thông tin chính xác.

## Current Behavior
1. Người dùng nhập `discordId` khi tạo checkout
2. `discordId` được lưu trong collection `payments` (theo từng giao dịch)
3. Khi thanh toán thành công:
   - `usersNew` được cập nhật credits, expiresAt
   - **KHÔNG** lưu `discordId` vào `usersNew`
4. Discord webhook gửi `discordId` từ payment record

## Proposed Changes
1. **Thêm field `discordId` vào schema `usersNew`** (`user-new.model.ts`)
2. **Cập nhật `discordId` trong hàm `addCredits()`** (`payment.service.ts`)
   - Khi thanh toán thành công, lưu `discordId` từ payment vào user
   - Chỉ cập nhật nếu `discordId` được cung cấp (không xóa ID cũ nếu payment mới không có)
3. **Webhook payload sử dụng `discordId` từ user** (nếu payment không có)

## Impact Analysis
- **Database**: Thêm 1 field mới vào collection `usersNew` (migration không cần thiết - Mongoose tự xử lý)
- **Backend**: Sửa 2 files (`user-new.model.ts`, `payment.service.ts`)
- **Frontend**: Không thay đổi
- **Breaking Changes**: Không

## Acceptance Criteria
- [x] `discordId` được lưu vào `usersNew` khi thanh toán thành công
- [x] `discordId` có thể được cập nhật qua các lần thanh toán sau
- [x] Discord webhook tiếp tục hoạt động như trước
