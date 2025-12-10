# Change: Fix Admin Credits Expiration

## Why
Hiện tại khi admin sử dụng `setCredits` hoặc `addCredits`, hệ thống không set ngày hết hạn (`expiresAt`). Điều này gây ra:
- Credits không hiển thị ngày hết hạn trên admin UI (`/users`)
- GoProxy không biết khi nào credits hết hạn
- Không nhất quán với flow payment (đã có 7 ngày expiry)

## What Changes
- Update `userRepository.setCredits()` để set `expiresAt = now + 7 days` và `purchasedAt = now`
- Update `userRepository.addCredits()` để extend `expiresAt` thêm 7 ngày (hoặc set mới nếu chưa có)
- Sync `expiresAt` vào `user_keys` collection cho GoProxy
- Đảm bảo API response trả về `expiresAt`

## Impact
- Affected code:
  - `backend/src/repositories/user.repository.ts` - `setCredits()`, `addCredits()`
  - `backend/src/routes/admin.routes.ts` - response format
- No breaking changes - chỉ thêm expiration logic
