# Change: Add Dashboard Payment Section

## Why
Hiện tại user phải quay về homepage để truy cập trang /checkout mới có thể thanh toán. Việc này không tiện lợi khi user đang sử dụng dashboard và cần nạp thêm credits. Cần thêm khả năng thanh toán trực tiếp từ dashboard để cải thiện trải nghiệm người dùng.

## What Changes
- Thêm nút "Buy Credits" trong Billing Card trên trang dashboard chính (/dashboard)
- Tích hợp PaymentModal (component sẵn có) để hiển thị QR thanh toán ngay trong dashboard
- Thêm Payment History section để hiển thị lịch sử giao dịch gần đây
- Giữ nguyên trang /checkout hiện tại cho homepage

## Impact
- Affected specs: `user-dashboard`
- Affected code:
  - `frontend/src/app/(dashboard)/page.tsx` - Thêm Buy Credits button và Payment History
  - `frontend/src/components/PaymentModal.tsx` - Tái sử dụng component hiện có
  - `frontend/src/lib/api.ts` - Sử dụng các API endpoints sẵn có

## Out of Scope
- Thay đổi trang /checkout hiện tại
- Thay đổi backend payment logic
- Thay đổi homepage payment section
