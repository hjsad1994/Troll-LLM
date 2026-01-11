# Proposal: Add Separate Expiration Fields for creditsNew

## Change ID
`add-creditsnew-expiration-fields`

## Why
Hiện tại hệ thống có:
- `credits` (OhMyGPT - port 8005) với `purchasedAt` và `expiresAt`
- `creditsNew` (OpenHands - port 8004) đang dùng chung `purchasedAt` và `expiresAt`

Khi user thanh toán, credits được cộng vào `creditsNew` nhưng thời hạn (`purchasedAt`, `expiresAt`) đang được set cho cả hai loại credits. Điều này gây ra vấn đề:
1. Credits cũ và mới có thời hạn khác nhau nhưng bị trộn lẫn
2. Không thể track thời hạn riêng cho từng loại credits
3. Khi reset expiration, có thể ảnh hưởng sai loại credits

## What Changes
Thêm 2 field mới cho creditsNew:
- `purchasedAtNew: Date | null` - Thời điểm mua creditsNew lần cuối
- `expiresAtNew: Date | null` - Thời hạn hết hạn của creditsNew

### Backend Changes
1. **User Model (`user-new.model.ts`)**: Thêm `purchasedAtNew` và `expiresAtNew` vào interface và schema
2. **Payment Service (`payment.service.ts`)**: Cập nhật method `addCredits()` để set `purchasedAtNew` và `expiresAtNew`
3. **Expiration Scheduler (`expiration-scheduler.service.ts`)**: Thêm `scheduleExpirationNew()`, `resetAndLogNew()`, cập nhật `init()` và `cleanupExpiredZeroCredits()`
4. **User Service (`user.service.ts`)**: Cập nhật `UserProfile` và `BillingInfo` interfaces, `getProfile()` và `getBillingInfo()`

### Frontend Changes
5. **Dashboard**: Hiển thị thời hạn riêng cho creditsNew với i18n support (EN/VI)
6. **API Types**: Cập nhật `UserProfile` và `BillingInfo` interfaces

## Status
`complete`
