# Tech-Spec: Credits Bonus Tiers & Max 200

**Created:** 2025-12-21
**Status:** Ready for Development

## Overview

### Problem Statement
Hiện tại max credits là 100, cần tăng lên 200. Đồng thời thêm bonus tier: mua 100 credits được +10, mua 200 credits được +20.

### Solution
- Tăng MAX_CREDITS từ 100 → 200
- Thêm logic bonus tier (100→+10, 200→+20)
- Disable promo 15% hiện tại (giữ code để dùng sau)
- Cập nhật UI slider và quick select buttons

### Scope
**In Scope:**
- Frontend: DashboardPaymentModal, checkout page, promo.ts
- Backend: payment.model.ts, payment.service.ts

**Out of Scope:**
- Payment gateway changes
- Database schema changes

## Context for Development

### Codebase Patterns
- Constants defined in `payment.model.ts` (backend) và component level (frontend)
- Promo logic trong `promo.ts` (frontend) và `payment.service.ts` (backend)
- VND_RATE = 1000 (1 USD = 1000 VND)

### Files to Modify
1. `backend/src/models/payment.model.ts` - MAX_CREDITS constant
2. `backend/src/services/payment.service.ts` - Bonus tier logic
3. `frontend/src/components/DashboardPaymentModal.tsx` - MAX_AMOUNT, slider, UI
4. `frontend/src/app/checkout/page.tsx` - MAX_AMOUNT, slider, UI
5. `frontend/src/lib/promo.ts` - Disable promo, add bonus tier functions

### Technical Decisions
- Bonus tier: Fixed amounts (100→+10, 200→+20), NOT percentage
- Promo 15%: **GIỮ NGUYÊN CODE**, chỉ comment out để dùng sau khi cần
  - Frontend: Comment promo banner, promo display logic
  - Backend: Comment `calculateCreditsWithBonus()` call, giữ function
- Backend validates and calculates final credits (source of truth)

## Implementation Plan

### Tasks

- [ ] Task 1: Update backend constants - MAX_CREDITS = 200
- [ ] Task 2: Backend payment.service.ts:
  - [ ] 2a: Thêm bonus tier logic (100→+10, 200→+20)
  - [ ] 2b: Comment out promo logic (giữ code để dùng sau)
- [ ] Task 3: Update frontend promo.ts:
  - [ ] 3a: Comment out promo functions (giữ code)
  - [ ] 3b: Thêm bonus tier functions mới
- [ ] Task 4: Update DashboardPaymentModal:
  - [ ] 4a: MAX_AMOUNT = 200, quick buttons [20, 50, 100, 200]
  - [ ] 4b: Thêm Bonus Tier Banner (hiển thị bonus info)
  - [ ] 4c: Quick buttons 100/200 có bonus badge (+10/+20)
  - [ ] 4d: Amount display hiện bonus khi chọn 100/200
  - [ ] 4e: Summary section hiện tổng credits với bonus
- [ ] Task 5: Update checkout page (tương tự Task 4)
- [ ] Task 6: Test end-to-end flow

### Acceptance Criteria

- [ ] AC 1: User can select up to 200 credits in modal and checkout
- [ ] AC 2: Mua 100 credits → nhận 110 credits (hiển thị bonus +10)
- [ ] AC 3: Mua 200 credits → nhận 220 credits (hiển thị bonus +20)
- [ ] AC 4: Mua các mức khác (20-99, 101-199) → không có bonus
- [ ] AC 5: Promo 15% không còn hiển thị/áp dụng

## Additional Context

### Bonus Tier Logic
```typescript
function calculateTierBonus(credits: number): number {
  if (credits === 200) return 20;
  if (credits === 100) return 10;
  return 0;
}

function calculateTotalCredits(credits: number): number {
  return credits + calculateTierBonus(credits);
}
```

### UI Changes

#### 1. Slider & Quick Buttons
- Slider: min=20, max=200
- Quick buttons: [20, 50, 100, 200] (thay 75 bằng 200)

#### 2. Bonus Tier Banner (hiển thị phía trên slider)
Thêm banner thông báo bonus tiers để user biết trước khi chọn:

```
┌─────────────────────────────────────────────────┐
│  🎁 BONUS CREDITS!                              │
│  • Mua $100 → Nhận $110 (+$10 bonus)           │
│  • Mua $200 → Nhận $220 (+$20 bonus)           │
└─────────────────────────────────────────────────┘
```

#### 3. Quick Buttons với Bonus Badge
Buttons 100 và 200 hiển thị bonus tag:

```
[ $20 ]  [ $50 ]  [ $100 +10 ]  [ $200 +20 ]
```

#### 4. Amount Display (khi chọn 100 hoặc 200)
Khi user chọn 100 hoặc 200, hiển thị rõ bonus:

```
100,000 VND
→ Nhận $110 credits (+$10 bonus!)
```

#### 5. Summary Section
Cập nhật phần tóm tắt trước khi thanh toán:

```
Bạn nhận:     $110 credits (bao gồm +$10 bonus)
Thanh toán:   100,000 VND
Hiệu lực:     7 ngày
```

### Testing Strategy
1. Unit test bonus calculation
2. Manual test UI flow với các mức 20, 50, 100, 150, 200
3. Verify backend returns correct credits amount
