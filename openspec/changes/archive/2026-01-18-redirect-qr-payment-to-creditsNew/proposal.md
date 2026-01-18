# Proposal: Redirect QR Payment to creditsNew

## Summary

Thay đổi luồng thanh toán QR để cộng credits vào field `creditsNew` (dùng cho OpenHands port 8004) thay vì field `credits` hiện tại (dùng cho OhMyGPT port 8005).

## Problem Statement

Hiện tại khi user thanh toán qua QR code (Sepay):
- Credits được cộng vào field `credits` trong UserNew model
- Field này được dùng cho hệ thống OhMyGPT (port 8005)
- User muốn dùng OpenHands (port 8004) không nhận được credits sau thanh toán

## Proposed Solution

Sửa đổi function `addCredits()` trong `PaymentService` để:
1. Cập nhật field `creditsNew` thay vì `credits`
2. Cập nhật `expiresAtNew` và `purchasedAtNew` thay vì `expiresAt` và `purchasedAt`
3. Giữ nguyên logic validation, promo bonus, Discord notification

## Impact Analysis

### Files Affected
- `backend/src/services/payment.service.ts` - Core change
- `backend/src/models/payment.model.ts` - Update interface comments (optional)

### Breaking Changes
- Users hiện đang dùng hệ thống OhMyGPT sẽ không còn nhận credits từ QR payment
- Cần thông báo cho users về thay đổi này

### Dependencies
- Không có dependency bên ngoài bị ảnh hưởng
- Discord webhook notification vẫn hoạt động bình thường

## Alternatives Considered

1. **Cho user chọn khi checkout** - Thêm complexity không cần thiết vào UX
2. **Cộng vào cả hai fields** - Dẫn đến double credits, không hợp lý về mặt business

## Success Criteria

- Sau khi thanh toán QR thành công, `creditsNew` tăng đúng số tiền
- `expiresAtNew` được set thành 7 ngày từ thời điểm thanh toán
- `purchasedAtNew` được cập nhật
- Payment record vẫn lưu đúng `creditsBefore` và `creditsAfter`
