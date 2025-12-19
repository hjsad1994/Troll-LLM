# Tech-Spec: Khuyến mãi Bonus 15% Credits

**Created:** 2025-12-18
**Status:** Ready for Development

## Overview

### Problem Statement
Chạy chương trình khuyến mãi **Bonus 15% credits** trong **2 ngày**. User mua credits sẽ được tặng thêm 15% bonus.

### Solution
- Homepage & Dashboard Modal: Hiển thị bonus + countdown timer
- Khi hết hạn: Ẩn hoàn toàn, trở về UI bình thường

## Promotion Config

```typescript
const PROMO_CONFIG = {
  startDate: new Date('2025-12-18T22:00:00+07:00'),
  endDate: new Date('2025-12-20T22:00:00+07:00'),
  bonusPercent: 15,
}
```

**Timeline:**
- Bắt đầu: 18/12/2025 22:00:00 (UTC+7)
- Kết thúc: 20/12/2025 22:00:00 (UTC+7)

## Technical Decisions

| Decision | Choice |
|----------|--------|
| Promotion start | 2025-12-18T22:00:00+07:00 |
| Duration | 2 ngày (48 giờ) |
| Timezone | UTC+7 (Asia/Ho_Chi_Minh) |
| End behavior | Ẩn hoàn toàn bonus UI |
| Bonus calculation | UI only (amount × 1.15) |

## Files to Modify

1. `frontend/src/app/page.tsx` - Homepage pricing section
2. `frontend/src/components/DashboardPaymentModal.tsx` - Payment modal
3. `frontend/src/lib/i18n.ts` - Translations

## Implementation Plan

### Tasks

- [ ] **Task 1:** Tạo promo config & helpers
  - `isPromoActive()` - Check if promo is currently active
  - `getTimeRemaining()` - Return { days, hours, minutes, seconds }
  - `calculateBonusCredits(amount)` - Return amount × 1.15

- [ ] **Task 2:** Homepage pricing - Thêm conditional banner
  - Nếu `isPromoActive()`: Hiển thị banner bonus + countdown
  - Nếu không: Hiển thị pricing bình thường

- [ ] **Task 3:** Dashboard payment modal - Thêm bonus display
  - Nếu `isPromoActive()`: Hiển thị bonus banner + tính credits × 1.15
  - Nếu không: Hiển thị modal bình thường

- [ ] **Task 4:** Update i18n translations (EN/VI)

## Acceptance Criteria

- [ ] AC 1: Trước 22h 18/12 - Không hiển thị promo
- [ ] AC 2: 22h 18/12 → 22h 20/12 - Hiển thị bonus 15% + countdown
- [ ] AC 3: Sau 22h 20/12 - Ẩn hoàn toàn, UI bình thường
- [ ] AC 4: Homepage hiển thị banner "Bonus +15%" với countdown
- [ ] AC 5: Dashboard modal hiển thị credits thực nhận = amount × 1.15
- [ ] AC 6: Countdown đếm chính xác theo UTC+7
- [ ] AC 7: Translations đầy đủ EN/VI

## UI Examples

### Homepage (Promo Active)
```
┌────────────────────────────────────────┐
│ 🎁 BONUS +15% CREDITS!                 │
│ Kết thúc sau: 1 ngày 23:45:30          │
│                                        │
│ Mua $20 → Nhận $23 credits             │
└────────────────────────────────────────┘
```

### Dashboard Modal (Promo Active)
```
Amount:      $20
Bonus 15%:   +$3.00
─────────────────────
Credits:     $23.00
VND:         20,000 VND
Validity:    7 days

⏰ Bonus kết thúc sau: 1d 23h 45m
```

### Khi hết Promo
Hiển thị như hiện tại (không có bonus UI)
