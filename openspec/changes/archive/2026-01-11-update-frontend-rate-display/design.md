# Design: Frontend Rate Display Update

## Overview

This change updates the frontend to display the correct exchange rate of 1500 VND = $1 USD, matching the backend payment processing rate. This is a pure display update with no architectural changes.

## Current State

### Backend (Already Correct)
- `backend/src/models/payment.model.ts`: `VND_RATE_NEW = 1500`
- Payment service uses `VND_RATE_NEW` for all calculations
- Payment config API returns `vndRate: 1500`

### Frontend (Needs Update)
Three locations hardcode the old 2500 rate:
1. Checkout page: `const VND_RATE = 2500`
2. Dashboard modal: `const VND_RATE = 2500`
3. Translations: "2,500 VND = $1" and "2.500 VND = $1"

## Proposed Changes

### 1. Checkout Page (`frontend/src/app/checkout/page.tsx`)

**Current (line 12-14):**
```typescript
const MIN_AMOUNT = 16
const MAX_AMOUNT = 100
const VND_RATE = 2500
```

**New:**
```typescript
const MIN_AMOUNT = 20
const MAX_AMOUNT = 100
const VND_RATE = 1500
```

**Current (line 260):**
```typescript
{[16, 50, 100].map((amount) => (
```

**New:**
```typescript
{[30, 40, 50, 60, 80].map((amount) => (
```

**Impact:**
- Minimum purchase changes from $16 to $20
- Quick select buttons show $30, $40, $50, $60, $80 instead of $16, $50, $100
- All amounts produce VND values divisible by 1000 (no 500 fractions):
  - $30 = 45,000 VND ✓
  - $40 = 60,000 VND ✓
  - $50 = 75,000 VND ✓
  - $60 = 90,000 VND ✓
  - $80 = 120,000 VND ✓
- `vndAmount = customAmount * VND_RATE` will calculate correct amounts
- Slider range: $20 - $100

### 2. Translation Strings (`frontend/src/lib/i18n.ts`)

**Current (line 106 - English):**
```typescript
rate: '2,500 VND = $1',
```

**New:**
```typescript
rate: '1,500 VND = $1',
```

**Current (line 1474 - Vietnamese):**
```typescript
rate: '2.500 VND = $1',
```

**New:**
```typescript
rate: '1.500 VND = $1',
```

**Additional changes for minimum purchase:**
- Line 104 (English): `minPurchase: 'Minimum: $16'` → `minPurchase: 'Minimum: $20'`
- Line 1472 (Vietnamese): `minPurchase: 'Mua tối thiểu: $16'` → `minPurchase: 'Mua tối thiểu: $20'`

**Impact:**
- Pricing section displays correct rate banner
- Minimum purchase messaging updated
- Migration banner (if shown) displays correct rate info

### 3. Dashboard Payment Modal (`frontend/src/components/DashboardPaymentModal.tsx`)

**Current (line 15-17):**
```typescript
const MIN_AMOUNT = 16
const MAX_AMOUNT = 100
const VND_RATE = 2500
```

**New:**
```typescript
const MIN_AMOUNT = 20
const MAX_AMOUNT = 100
const VND_RATE = 1500
```

**Current (line 312):**
```typescript
{[16, 50, 100].map((amount) => (
```

**New:**
```typescript
{[30, 40, 50, 60, 80].map((amount) => (
```

**Impact:**
- Minimum purchase changes from $16 to $20
- Quick select buttons show $30, $40, $50, $60, $80 instead of $16, $50, $100
- All amounts produce VND values divisible by 1000 (no 500 fractions):
  - $30 = 45,000 VND ✓
  - $40 = 60,000 VND ✓
  - $50 = 75,000 VND ✓
  - $60 = 90,000 VND ✓
  - $80 = 120,000 VND ✓
- Amount display calculates correct VND (line 278)
- Summary section shows correct VND amount (line 369)
- Slider range: $20 - $100

## Alternative Approaches Considered

### Option 1: Fetch Rate from API
**Description:** Call payment config API to get current rate dynamically

**Pros:**
- Single source of truth
- Can change rate without frontend deploy

**Cons:**
- Adds API call overhead
- More complex error handling
- Rate changes are rare

**Decision:** Not chosen - rate changes are infrequent and require coordinated updates anyway

### Option 2: Shared Constant File
**Description:** Create a shared `constants.ts` with VND_RATE

**Pros:**
- DRY principle
- Single location to update

**Cons:**
- Over-engineering for 3 simple constants
- Creates unnecessary abstraction

**Decision:** Not chosen - simple inline constants are clearer in this context

### Option 3: Environment Variable
**Description:** Use NEXT_PUBLIC_VND_RATE environment variable

**Pros:**
- Could differ per environment

**Cons:**
- Unnecessarily complex
- No multi-environment need exists

**Decision:** Not chosen - no requirement for environment-specific rates

## Validation Strategy

### Manual Testing
1. Visit checkout page → verify VND amounts are 60% of previous (1500/2500)
2. Open dashboard modal → verify VND calculation is correct
3. Check pricing section → verify banner shows "1,500 VND = $1"
4. Test in both English and Vietnamese languages

### Calculation Verification
Example for $30, $40, $50, $60, $80 (all produce round VND values):
- $30: 30 × 1500 = 45,000 VND ✓ (divisible by 1000)
- $40: 40 × 1500 = 60,000 VND ✓ (divisible by 1000)
- $50: 50 × 1500 = 75,000 VND ✓ (divisible by 1000)
- $60: 60 × 1500 = 90,000 VND ✓ (divisible by 1000)
- $80: 80 × 1500 = 120,000 VND ✓ (divisible by 1000)
- All amounts: 40% cheaper than old rate

Minimum purchase:
- Old: $16 × 2500 = 40,000 VND
- New: $20 × 1500 = 30,000 VND ✓ (divisible by 1000)
- Still 25% cheaper despite higher minimum dollar amount

**Note**: Amounts like $25 ($37,500) or $35 ($52,500) are NOT used as they produce 500 fractions.

### Backend Consistency
Compare frontend display with backend API:
```bash
curl http://api.trollllm.xyz/api/payment/config
# Should return: { "vndRate": 1500, ... }
```

## Implementation Notes

1. All changes should be made atomically in a single commit
2. Update both checkout page and dashboard modal consistently
3. Update all translation strings for both English and Vietnamese
4. No database migrations required
5. No API changes required
6. No backend changes required
7. Changes are backward compatible (only display updates)

## Rollback Plan

If issues arise, simply revert the constant changes:
- Change MIN_AMOUNT back to 16 in both files
- Change VND_RATE back to 2500 in both files
- Change quick select arrays back to [16, 50, 100]
- Change translation strings back to "2,500 VND = $1" and "$16"

This is a zero-risk rollback since it's display-only.
