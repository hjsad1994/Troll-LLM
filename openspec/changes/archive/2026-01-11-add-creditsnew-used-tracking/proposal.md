# Change: Add creditsNewUsed field for OpenHands USD cost tracking

## Why
Hiện tại field `tokensUserNew` đang track **số tokens** đã sử dụng cho OpenHands upstream, trong khi `creditsUsed` (OhMyGPT) track **USD cost**. Điều này tạo ra sự không nhất quán:
- `creditsUsed` = USD đã tiêu (cho OhMyGPT)
- `tokensUserNew` = số tokens đã dùng (cho OpenHands) - KHÔNG phải USD!

Cần thêm field `creditsNewUsed` để track USD cost cho OpenHands, đảm bảo nhất quán với cách `creditsUsed` hoạt động.

## What Changes
- **ADDED**: Field `creditsNewUsed: number` trong model `usersNew` để track USD cost cho OpenHands
- **MODIFIED**: `DeductCreditsOpenHands()` trong goproxy để cập nhật `creditsNewUsed` với cost (USD) thay vì chỉ tokens
- **MODIFIED**: Backend API trả về `creditsNewUsed` trong user profile
- **MODIFIED**: Frontend hiển thị `creditsNewUsed` trong dashboard và admin pages

## Impact
- Affected specs: `billing`
- Affected code:
  - `backend/src/models/user-new.model.ts`
  - `backend/src/services/user.service.ts`
  - `goproxy/internal/usage/tracker.go`
  - `goproxy/internal/userkey/model.go`
  - `frontend/src/lib/api.ts`
  - `frontend/src/app/(dashboard)/dashboard/page.tsx`
  - `frontend/src/app/(dashboard)/users-new/page.tsx`

## Notes
- Field `tokensUserNew` vẫn giữ lại để track số tokens (nếu cần analytics)
- `creditsNewUsed` sẽ tăng theo giá trị `cost` (USD) giống như `creditsUsed`
