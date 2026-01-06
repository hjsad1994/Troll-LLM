# Implementation Tasks

## Overview

This is a **single-file, low-risk UI update** to change the displayed minimum pricing from 20.000 VND to 40.000 VND on the landing page pricing section.

---

## Task 1: Update Pricing Display on Landing Page

**File:** `frontend/src/app/page.tsx`

**Location:** Line ~450 in the pricing section

**Change:**
```tsx
// BEFORE:
<span className="text-5xl sm:text-6xl font-bold text-[var(--theme-text)]">20.000</span>
<span className="text-[var(--theme-text-muted)] ml-2">VND {t.pricing.min}</span>

// AFTER:
<span className="text-5xl sm:text-6xl font-bold text-[var(--theme-text)]">40.000</span>
<span className="text-[var(--theme-text-muted)] ml-2">VND {t.pricing.min}</span>
```

**Validation:**
- [x] Build completes successfully: `npm run build` (frontend)
- [x] Text displays correctly on pricing page at `/#pricing`
- [x] Format shows `40.000VND tối thiểu` (in Vietnamese)
- [x] Dark mode styling is preserved

---

## Task 2: Verify Checkout Alignment

**Action:** Manual testing to ensure consistency

**Steps:**
1. Visit `https://trollllm.xyz/#pricing`
2. Confirm the pricing card shows `40.000VND tối thiểu`
3. Click "Mua ngay" (Buy Now)
4. Verify the checkout page minimum slider starts at 40.000 VND ($16)
5. Verify attempting to purchase $16 (40.000 VND) works correctly

**Expected Results:**
- Landing page shows 40.000 VND minimum
- Checkout minimum matches (already correct at $16)
- No validation errors
- QR code generates correctly for 40.000 VND

---

## Task 3: (Optional) Review Related Copy

**Files to Review:** `frontend/src/lib/i18n.ts`

**Current State:**
- `minPurchase: 'Mua tối thiểu: $16'` ✅ Already correct
- `min: 'tối thiểu'` ✅ Already correct

**Decision Needed:** None - current copy is accurate

---

## Dependencies

**None** - This is an independent change with no dependencies on other ongoing work.

---

## Rollback Plan

If issues arise, revert the single line change in `frontend/src/app/page.tsx`:
```bash
git checkout frontend/src/app/page.tsx
```

---

## Deployment Notes

- **Frontend only:** No backend deployment required
- **Build required:** Run `npm run build` after changes
- **Cache:** May need to clear browser cache to see updated text immediately
- **Testing priority:** Verify on both mobile and desktop views
