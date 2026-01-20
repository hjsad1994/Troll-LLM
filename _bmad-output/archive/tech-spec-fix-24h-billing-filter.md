# Tech-Spec: Fix 24h Billing Filter

**Created:** 2025-12-19
**Status:** Completed

## Overview

### Problem Statement

Trang admin billing (`/admin/billing`) có filter "24 Hours" đang tính sai. Hiện tại filter này lấy dữ liệu từ `now - 24h` thay vì từ **00:00:00 của ngày hôm nay** theo múi giờ Việt Nam (UTC+7).

**Ví dụ lỗi:**
- Thời điểm hiện tại: 14:30 ngày 19/12/2025
- **Hiện tại**: Lọc từ 14:30 ngày 18/12/2025
- **Mong muốn**: Lọc từ 00:00:00 ngày 19/12/2025 (UTC+7)

### Solution

Sửa logic filter `24h` trong `admin.routes.ts` để tính từ 00:00:00 của ngày hiện tại theo múi giờ UTC+7 thay vì trừ 24 giờ từ thời điểm hiện tại.

### Scope

**In scope:**
- Sửa filter `24h` cho endpoint `/admin/payments` (billing page)
- Sửa filter `24h` cho endpoint `/admin/model-stats` (để nhất quán)

**Out of scope:**
- Các filter khác (1h, 2h, 3h, 7d, 30d) - giữ nguyên logic hiện tại
- Frontend - không cần thay đổi

## Context for Development

### Codebase Patterns

- Backend sử dụng TypeScript + Express
- Timezone Việt Nam đã được sử dụng trong `payment.service.ts` với format `+07:00`
- Pattern `setHours(0, 0, 0, 0)` đã được dùng cho custom date filter

### Files to Reference

- `backend/src/routes/admin.routes.ts` - File cần sửa

### Technical Decisions

- Sử dụng offset UTC+7 (7 * 60 * 60 * 1000 ms) để tính 00:00:00 ngày hôm nay theo múi giờ VN
- Không dùng library bên ngoài (như moment-timezone) để giữ codebase nhẹ

## Implementation Plan

### Tasks

- [x] Task 1: Sửa filter `24h` trong `/admin/model-stats` (dòng ~292-294)
- [x] Task 2: Sửa filter `24h` trong `/admin/payments` (dòng ~347-349)

### Code Changes

**Thay thế logic cũ:**
```typescript
case '24h':
  since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  break;
```

**Bằng logic mới:**
```typescript
case '24h': {
  // Get start of today in UTC+7 (Vietnam timezone)
  const utc7Offset = 7 * 60 * 60 * 1000;
  const nowUtc7 = new Date(now.getTime() + utc7Offset);
  const startOfDayUtc7 = new Date(Date.UTC(
    nowUtc7.getUTCFullYear(),
    nowUtc7.getUTCMonth(),
    nowUtc7.getUTCDate(),
    0, 0, 0, 0
  ));
  since = new Date(startOfDayUtc7.getTime() - utc7Offset);
  break;
}
```

### Acceptance Criteria

- [x] AC 1: Khi admin chọn filter "24 Hours" lúc 14:30 ngày 19/12, kết quả hiển thị tất cả payments từ 00:00:00 ngày 19/12 (UTC+7) đến hiện tại
- [x] AC 2: Stats (Total Revenue, Successful, Failed) cũng tính từ 00:00 ngày hôm nay
- [x] AC 3: Các filter khác (1h, 2h, 3h, 7d, 30d) vẫn hoạt động bình thường

## Additional Context

### Dependencies

Không có dependency mới

### Testing Strategy

1. Test thủ công trên `/admin/billing`:
   - Chọn filter "24 Hours" vào các thời điểm khác nhau trong ngày
   - Verify kết quả chỉ hiển thị payments từ 00:00 ngày hôm nay
2. So sánh với filter "Custom" chọn ngày hôm nay - kết quả phải giống nhau

### Notes

- Server có thể chạy ở timezone khác nhau nên cần tính toán explicit UTC+7
- Rename filter label từ "24 Hours" thành "Today" ở frontend có thể xem xét sau (không bắt buộc)
