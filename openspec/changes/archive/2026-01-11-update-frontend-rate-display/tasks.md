# Implementation Tasks

## Phase 1: Update Constants (Parallel)

### Task 1.1: Update Checkout Page Constants - [x] COMPLETED
- **File:** `frontend/src/app/checkout/page.tsx`
- **Changes:**
  - [x] Line 12: `const MIN_AMOUNT = 16` → `const MIN_AMOUNT = 20`
  - [x] Line 14: `const VND_RATE = 2500` → `const VND_RATE = 1500`
  - [x] Line 260: `{[16, 50, 100].map((amount) => (` → `{[30, 40, 50, 60, 80].map((amount) => (`
- **Validation:**
  - [x] Build succeeds: `npm run build`
  - [ ] Manual test: Visit http://localhost:8080/checkout
  - [ ] Verify quick select buttons show $30, $40, $50, $60, $80
  - [ ] Verify slider minimum is $20
  - [ ] Example: $30 should show 45,000 VND (not 37,500 or 75,000)
  - [ ] **CRITICAL**: Verify all VND amounts are divisible by 1000 (no 500 fractions)

### Task 1.2: Update Dashboard Payment Modal Constants - [x] COMPLETED
- **File:** `frontend/src/components/DashboardPaymentModal.tsx`
- **Changes:**
  - [x] Line 15: `const MIN_AMOUNT = 16` → `const MIN_AMOUNT = 20`
  - [x] Line 17: `const VND_RATE = 2500` → `const VND_RATE = 1500`
  - [x] Line 312: `{[16, 50, 100].map((amount) => (` → `{[30, 40, 50, 60, 80].map((amount) => (`
- **Validation:**
  - [x] Build succeeds: `npm run build`
  - [ ] Manual test: Open dashboard, click "Buy Credits"
  - [ ] Verify quick select buttons show $30, $40, $50, $60, $80
  - [ ] Verify slider minimum is $20
  - [ ] Example: $40 should display 60,000 VND
  - [ ] **CRITICAL**: Verify all VND amounts are divisible by 1000 (no 500 fractions)

### Task 1.3: Update Translation Strings - [x] COMPLETED
- **File:** `frontend/src/lib/i18n.ts`
- **Changes:**
  - [x] Line 104 (English): `minPurchase: 'Minimum: $16'` → `minPurchase: 'Minimum: $20'`
  - [x] Line 106 (English): `rate: '2,500 VND = $1'` → `rate: '1,500 VND = $1'`
  - [x] Line 1472 (Vietnamese): `minPurchase: 'Mua tối thiểu: $16'` → `minPurchase: 'Mua tối thiểu: $20'`
  - [x] Line 1474 (Vietnamese): `rate: '2.500 VND = $1'` → `rate: '1.500 VND = $1'`
- **Validation:**
  - [x] Build succeeds: `npm run build`
  - [ ] Manual test: Visit http://localhost:8080/#pricing
  - [ ] Verify banner shows "1,500 VND = $1" in English
  - [ ] Switch language to Vietnamese, verify "1.500 VND = $1"
  - [ ] Check minimum purchase displays "$20"

## Phase 2: Verification (Sequential)

### Task 2.1: Cross-Component Verification
- **Action:** Test all updated components together
- **Tests:**
  1. Pricing section displays "1,500 VND = $1" and "Minimum: $20"
  2. Checkout page shows quick select buttons: $30, $40, $50, $60, $80
  3. Checkout page slider range: $20 - $100
  4. Dashboard modal shows quick select buttons: $30, $40, $50, $60, $80
  5. Dashboard modal slider range: $20 - $100
  6. All VND calculations match: amount × 1500
  7. **CRITICAL**: All quick select VND amounts are divisible by 1000
- **Success Criteria:** Consistent behavior across all components with no 500 fractions

### Task 2.2: Language Consistency Check
- **Action:** Test in both English and Vietnamese
- **Tests:**
  1. Switch to English: Rate shows "1,500 VND = $1", minimum shows "$20"
  2. Switch to Vietnamese: Rate shows "1.500 VND = $1", minimum shows "$20"
  3. Quick select buttons work correctly in both languages
  4. Number formatting matches language conventions
- **Success Criteria:** Rate and minimum display correctly in both languages

### Task 2.3: Amount Calculation Verification
- **Action:** Verify VND calculations for quick select amounts
- **Tests:**
  1. $30 → 45,000 VND (divisible by 1000 ✓)
  2. $40 → 60,000 VND (divisible by 1000 ✓)
  3. $50 → 75,000 VND (divisible by 1000 ✓)
  4. $60 → 90,000 VND (divisible by 1000 ✓)
  5. $80 → 120,000 VND (divisible by 1000 ✓)
  6. $100 (max) → 150,000 VND (divisible by 1000 ✓)
  7. **VERIFY**: No amounts show 500 fractions (like 37,500 or 52,500)
- **Success Criteria:** All calculations correct at 1500 rate with round-thousand VND

## Phase 3: Deployment (Sequential)

### Task 3.1: Build and Deploy Frontend
- **Action:** Build production bundle and deploy
- **Commands:**
  ```bash
  cd frontend
  npm run build
  # Deploy using your deployment method
  ```
- **Validation:** Production site shows new rates

### Task 3.2: Post-Deployment Smoke Test
- **Action:** Test production deployment
- **Tests:**
  1. Visit production pricing page → verify rate and minimum
  2. Visit production checkout page → verify buttons $30, $40, $50, $60, $80
  3. Open dashboard payment modal → verify same buttons and calculations
  4. Test slider range $20-$100 in both locations
  5. Switch languages and verify translations
  6. **CRITICAL**: Verify all VND amounts divisible by 1000 (no 500 fractions)
- **Success Criteria:** All production pages display correct rate, minimum, and round-thousand VND amounts

## Dependencies

- **Phase 1 tasks:** Can be done in parallel (independent files)
- **Phase 2 tasks:** Depends on Phase 1 completion
- **Phase 3 tasks:** Depends on Phase 2 validation

## Estimated Effort

- **Phase 1:** 15 minutes (constant changes + quick select arrays)
- **Phase 2:** 20 minutes (comprehensive testing)
- **Phase 3:** 5 minutes (build + deploy)
- **Total:** ~40 minutes

## Rollback Plan

If issues discovered post-deployment:

1. Revert all constant changes:
   - MIN_AMOUNT: 20 → 16
   - VND_RATE: 1500 → 2500
   - Quick select: [30, 40, 50, 60, 80] → [16, 50, 100]
   - Translation strings: "$20" → "$16", "1,500" → "2,500"
2. Rebuild frontend: `npm run build`
3. Redeploy

Rollback time: ~10 minutes
