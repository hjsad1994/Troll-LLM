# Proposal: Enhance Credits Expiration Datetime Display

## Summary

Cải thiện hiển thị thời gian hết hạn credits bằng cách thêm hiển thị đầy đủ ngày giờ (UTC+7) trong trường "Expires" cho cả `credits` (Premium) và `creditsNew` (Standard) trên dashboard.

## Problem Statement

Hiện tại trên dashboard tại http://localhost:8080/dashboard:
- Component "Credits Period" (Thời hạn credits) hiển thị countdown "X days / Y total days" trong badge
- Trường "Expires" (Hết hạn) chỉ hiển thị định dạng ngày ngắn `DD/MM/YYYY` (ví dụ: "15/01/2026")
- User không biết thời gian chính xác trong ngày khi credits sẽ hết hạn
- Thiếu thông tin timezone (UTC+7) để user hiểu rõ thời điểm hết hạn

## Proposed Solution

Tạo hàm mới `formatDateTimeUTC7()` để:
1. Hiển thị đầy đủ: `DD/MM/YYYY HH:mm:ss (UTC+7)`
2. Áp dụng cho trường "Expires" trong component "Credits Period":
   - Thời hạn creditsNew (Standard/OpenHands) - line 692
   - Thời hạn credits (Premium/OhMyGPT) - line 739
3. Giữ nguyên định dạng ngắn `DD/MM/YYYY` cho trường "Purchased"
4. Giữ nguyên countdown badge "X/Y days"

## Impact Analysis

### Files Affected
- `frontend/src/app/(dashboard)/dashboard/page.tsx` - Main change:
  - Add new formatter function `formatDateTimeFull()`
  - Update lines 692 and 739 to use new formatter for expiration dates

### Breaking Changes
- Không có breaking changes
- Chỉ là enhancement về UX, không ảnh hưởng đến logic hoặc API

### Dependencies
- Không có dependency thay đổi
- Chỉ cập nhật frontend presentation layer

## Alternatives Considered

1. **Hiển thị tooltip hover** - Thêm interaction không cần thiết, user phải hover mới thấy
2. **Thêm timezone selector** - Over-engineering cho case này, Vietnam user chủ yếu dùng UTC+7
3. **Tách thành hai dòng** - Làm UI dài hơn không cần thiết

## Success Criteria

- Trường "Expires" cho creditsNew hiển thị: `DD/MM/YYYY HH:mm:ss (UTC+7)`
- Trường "Expires" cho credits hiển thị: `DD/MM/YYYY HH:mm:ss (UTC+7)`
- Countdown badge vẫn hiển thị "X days / Y total days" hoặc "X/Y" như cũ
- Trường "Purchased" vẫn giữ định dạng ngắn `DD/MM/YYYY`
- Format phù hợp với cả desktop và mobile viewport
