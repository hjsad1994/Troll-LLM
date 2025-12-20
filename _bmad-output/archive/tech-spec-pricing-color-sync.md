# Tech-Spec: Đồng bộ màu sắc phần Bonus trên trang Pricing

**Ngày tạo:** 2025-12-20
**Hoàn thành:** 2025-12-20
**Trạng thái:** ✅ Đã hoàn thành

## Tổng quan

### Vấn đề
Phần Promo/Bonus banner trên trang pricing (`/#pricing`) đang sử dụng màu **emerald/green** trong khi brand identity của TrollLLM (logo, button "Mua ngay") sử dụng gradient **indigo → purple → pink**. Điều này tạo sự không nhất quán về mặt thị giác.

### Giải pháp
Thay đổi màu sắc của phần Bonus banner từ emerald/green sang purple gradient để đồng bộ với brand identity.

### Phạm vi
**Trong scope:**
- Promo banner background gradient
- Bonus title text color
- Description text color
- Get bonus text color
- Checkmark icons color

**Ngoài scope:**
- Checkout page (emerald dùng cho success state - hợp lý)
- Dashboard Payment Modal (cùng lý do)
- Các file khác dùng emerald cho semantic purposes

## Context cho Development

### Codebase Patterns
Brand gradient pattern đang được sử dụng nhất quán:
```css
bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
```

Các vị trí đang dùng pattern này:
- Logo icon: `from-indigo-500 to-purple-600`
- Logo text: `from-indigo-400 to-purple-400`
- "Mua ngay" button: `from-indigo-500 via-purple-500 to-pink-500`
- Discord banner: `from-indigo-500 to-purple-500`

### File cần chỉnh sửa
```
frontend/src/app/page.tsx
```

### Quyết định kỹ thuật
- Dùng `purple-*` colors thay vì full gradient cho text (dễ đọc hơn)
- Background dùng gradient với opacity thấp (`/10`) để subtle
- Border dùng `purple-500/20` để match

## Kế hoạch thực hiện

### Tasks

- [x] Task 1: Đổi Promo Banner background gradient (line 425)
  - Từ: `from-emerald-500/10 via-green-500/10 to-teal-500/10`
  - Thành: `from-indigo-500/10 via-purple-500/10 to-pink-500/10`

- [x] Task 2: Đổi Banner border (line 425)
  - Từ: `border-emerald-500/20`
  - Thành: `border-purple-500/20`

- [x] Task 3: Đổi Bonus title text color (line 427)
  - Từ: `text-emerald-600 dark:text-emerald-400`
  - Thành: `text-purple-600 dark:text-purple-400`

- [x] Task 4: Đổi Description text color (line 431)
  - Từ: `text-emerald-700 dark:text-emerald-300`
  - Thành: `text-purple-700 dark:text-purple-300`

- [x] Task 5: Đổi Get bonus text color (line 454)
  - Từ: `text-emerald-600 dark:text-emerald-400`
  - Thành: `text-purple-600 dark:text-purple-400`

- [x] Task 6: Đổi Checkmark icons color (line 470)
  - Từ: `text-emerald-500`
  - Thành: `text-purple-500`

### Acceptance Criteria

- [x] AC 1: Promo banner có màu gradient purple matching với logo
- [x] AC 2: Tất cả text trong bonus section có màu purple thay vì emerald
- [x] AC 3: Checkmark icons có màu purple
- [x] AC 4: Hoạt động đúng ở cả light mode và dark mode
- [x] AC 5: Không ảnh hưởng đến các trang/component khác

## Context bổ sung

### Dependencies
Không có dependencies mới - chỉ thay đổi Tailwind classes có sẵn.

### Testing Strategy
1. Kiểm tra visual trên `http://localhost:8080/#pricing`
2. Toggle light/dark mode để verify cả 2 themes
3. So sánh với "Mua ngay" button để ensure matching

### Notes
- Line numbers có thể thay đổi nếu file được edit - sử dụng search để tìm đúng vị trí
- Tất cả changes nằm trong block `{isPromoActive() && (...)}` từ line 424-436
