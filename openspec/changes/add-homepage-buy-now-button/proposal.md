# Change: Add Floating Buy Now Button on Homepage

## Why
User cần scroll xuống trang mới thấy nút "Buy Now" trong phần Pricing. Việc thêm một floating button (nút nổi) luôn hiển thị khi scroll sẽ giúp user dễ dàng truy cập thanh toán bất cứ lúc nào, tăng conversion rate.

## What Changes
- Thêm floating "Buy Now / Mua ngay" button ở góc phải màn hình (fixed position)
- Button luôn hiển thị khi user scroll trang homepage
- Click vào button sẽ chuyển đến trang `/checkout`
- Support i18n cho cả tiếng Anh và tiếng Việt
- Animation nhẹ để thu hút sự chú ý

## Impact
- Affected specs: `user-dashboard` (homepage UI)
- Affected code:
  - `frontend/src/app/page.tsx` - Thêm floating button component
  - `frontend/src/lib/i18n.ts` - Translation strings (đã có `buyNow` key trong pricing)
