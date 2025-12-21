# Tech-Spec: Xóa bỏ logic bonus credits và cập nhật giao diện

**Created:** 2025-12-21
**Status:** Completed

## Overview

### Problem Statement

Hiện tại hệ thống có logic tặng bonus 10% khi mua credits từ $100 trở lên (mua $100 nhận $110, mua $200 nhận $220). Logic này cần được xóa bỏ hoàn toàn khỏi cả frontend và backend, đồng thời cập nhật giao diện để không còn hiển thị thông tin về bonus.

### Solution

Xóa toàn bộ code liên quan đến tier bonus:
- Frontend: Xóa config, functions, và UI elements hiển thị bonus
- Backend: Xóa constants, functions tính bonus, và logic apply bonus khi thanh toán

### Scope

**In Scope:**
- Xóa `TIER_BONUS_CONFIG` và các functions liên quan trong `promo.ts`
- Cập nhật `DashboardPaymentModal.tsx` - xóa banner bonus và hiển thị "+bonus"
- Cập nhật `checkout/page.tsx` - xóa banner bonus và hiển thị "+bonus"
- Xóa `BONUS_THRESHOLD`, `BONUS_PERCENT`, `calculateTierBonus()`, `calculateTotalCredits()` trong `payment.model.ts`
- Cập nhật `payment.service.ts` - xóa logic apply bonus

**Out of Scope:**
- Promo code cũ (đã disabled, giữ nguyên để dùng sau)
- Referral system (đã disabled)
- Logic thanh toán core (QR, webhook, etc.)

## Context for Development

### Codebase Patterns

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript, MongoDB với Mongoose
- **Styling**: Gradient purple/pink theme (`from-indigo-500 via-purple-500 to-pink-500`)
- **i18n**: Hỗ trợ Vietnamese/English qua `useLanguage()` hook

### Files to Reference

| File | Line | Mô tả |
|------|------|-------|
| `frontend/src/lib/promo.ts` | 46-81 | TIER_BONUS_CONFIG và các functions |
| `frontend/src/components/DashboardPaymentModal.tsx` | 6, 193-203, 235-243, 279-284, 317-319 | Import và UI bonus |
| `frontend/src/app/checkout/page.tsx` | 9, 176-189, 218-226, 242-246, 310-313, 462-467 | Import và UI bonus |
| `backend/src/models/payment.model.ts` | 11-24 | Constants và functions bonus |
| `backend/src/services/payment.service.ts` | 13, 208-219, 230, 237 | Import và logic apply bonus |

### Technical Decisions

1. **Giữ nguyên promo code cũ**: Code promo 15% đã được comment out, giữ nguyên để có thể enable sau
2. **Simplify functions**: `calculateBonusCredits()` và `getBonusAmount()` sẽ trả về giá trị gốc (không bonus)
3. **Backend credits = input**: Khi thanh toán, `finalCredits = baseCredits` (không cộng thêm)

## Implementation Plan

### Tasks

- [ ] Task 1: **[Frontend]** Cập nhật `promo.ts` - xóa TIER_BONUS_CONFIG và simplify functions
- [ ] Task 2: **[Frontend]** Cập nhật `DashboardPaymentModal.tsx` - xóa banner và UI bonus
- [ ] Task 3: **[Frontend]** Cập nhật `checkout/page.tsx` - xóa banner và UI bonus
- [ ] Task 4: **[Backend]** Cập nhật `payment.model.ts` - xóa bonus constants và functions
- [ ] Task 5: **[Backend]** Cập nhật `payment.service.ts` - xóa logic apply bonus
- [ ] Task 6: **[Test]** Verify frontend hiển thị đúng (không có bonus)
- [ ] Task 7: **[Test]** Verify backend tính credits đúng (không có bonus)

### Chi tiết từng Task

#### Task 1: promo.ts
```typescript
// XÓA toàn bộ (line 46-81):
// - TIER_BONUS_CONFIG
// - getTierBonus()
// - calculateTotalWithTierBonus()
// - hasTierBonus()

// SỬA các functions còn lại:
export function calculateBonusCredits(amount: number): number {
  return amount; // Trả về giá trị gốc
}

export function getBonusAmount(amount: number): number {
  return 0; // Không có bonus
}
```

#### Task 2: DashboardPaymentModal.tsx
- Xóa import: `getTierBonus, hasTierBonus, TIER_BONUS_CONFIG`
- Xóa Tier Bonus Banner (line 193-203)
- Sửa Amount Display - chỉ hiển thị `${selectedAmount} credits` (không có điều kiện bonus)
- Xóa "+bonus" trong Quick Select Buttons
- Sửa Summary - chỉ hiển thị credits gốc

#### Task 3: checkout/page.tsx
- Xóa import: `getTierBonus, hasTierBonus, TIER_BONUS_CONFIG`
- Xóa Tier Bonus Banner (line 176-189)
- Sửa Amount Display - chỉ hiển thị credits gốc
- Xóa "+bonus" trong Quick Select Buttons
- Sửa Summary và Success page - không hiển thị bonus

#### Task 4: payment.model.ts
```typescript
// XÓA (line 11-24):
// - BONUS_THRESHOLD
// - BONUS_PERCENT
// - calculateTierBonus()
// - calculateTotalCredits()
```

#### Task 5: payment.service.ts
```typescript
// XÓA import: calculateTotalCredits, calculateTierBonus

// SỬA processWebhook (line 208-237):
// Thay vì:
//   const tierBonus = calculateTierBonus(baseCredits);
//   const finalCredits = calculateTotalCredits(baseCredits);
// Thành:
//   const finalCredits = baseCredits;

// Xóa logic bonusApplied và các log liên quan
```

### Acceptance Criteria

- [ ] AC 1: Trang /checkout không hiển thị banner "+10% BONUS"
- [ ] AC 2: Trang /checkout hiển thị "Nhận $X credits" (không có bonus text)
- [ ] AC 3: Quick select buttons ($20, $50, $100, $200) không hiển thị "+10" hoặc "+20"
- [ ] AC 4: Modal trên /dashboard có cùng behavior như /checkout
- [ ] AC 5: Khi thanh toán $100, user nhận đúng $100 credits (không phải $110)
- [ ] AC 6: Khi thanh toán $200, user nhận đúng $200 credits (không phải $220)
- [ ] AC 7: Discord webhook notification hiển thị credits đúng (không có bonus text)

## Additional Context

### Dependencies

- Không có dependency mới
- Không ảnh hưởng đến các payment đã xử lý trước đó

### Testing Strategy

1. **Manual Testing:**
   - Truy cập /checkout, verify không có banner bonus
   - Chọn các mức $20, $50, $100, $200 - verify hiển thị credits = amount
   - Mở modal trên /dashboard, verify tương tự

2. **Payment Flow Testing (nếu có sandbox):**
   - Tạo payment $100, verify webhook log hiển thị "$100" (không phải "$110")
   - Check database: creditsAfter = creditsBefore + 100

### Notes

- Code promo cũ (15% time-limited) được giữ nguyên dạng comment để có thể enable sau
- Legacy exports (`isPromoActive`, `getTimeRemaining`, etc.) vẫn giữ để backward compatible
- Nếu sau này muốn có bonus tier khác, có thể uncomment và sửa TIER_BONUS_CONFIG
