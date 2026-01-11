# Rate Update: 1500 VND/$1 with Single Credits Field

## Summary

Đã loại bỏ field `creditsNew` và chỉ sử dụng field `credits` với rate mới **1500 VND = $1 USD**.

---

## ✅ Changes Applied

### 1. Backend Model (UserNew)
**File**: `backend/src/models/user-new.model.ts`

**Reverted**:
- ❌ Removed `creditsNew: number` field
- ❌ Removed `creditsNewUsed: number` field
- ✅ Keep `credits: number` field only
- ✅ Keep `creditsUsed: number` field only

**Result**: Back to single credit system with simple structure.

---

### 2. Backend Repository
**File**: `backend/src/repositories/user-new.repository.ts`

**Reverted**:
- ❌ Removed `addCreditsNew()` method
- ❌ Removed `deductCreditsNew()` method
- ❌ Removed `getCreditsNew()` method
- ✅ Keep `addCredits()` method (original)
- ✅ Keep `setCredits()` method (original)

**Result**: Using standard credit operations only.

---

### 3. Payment Service
**File**: `backend/src/services/payment.service.ts`

**Reverted**:
- ✅ Changed back to use `user.credits` (not `user.creditsNew`)
- ✅ Changed back to `$inc: { credits }` (not `creditsNew`)
- ✅ Log messages back to "credits" (not "creditsNew")

**Result**: All payments add to `credits` field.

---

### 4. Go Proxy Model
**File**: `goproxy/internal/userkey/model.go`

**Reverted**:
- ❌ Removed `CreditsNew` field
- ❌ Removed `CreditsNewUsed` field
- ❌ Removed `CreditsUsed` field (was added for dual system)
- ✅ Keep `Credits` field only
- ✅ Keep `RefCredits` field

**Result**: Go proxy back to simple credit structure.

---

### 5. Payment Constants (KEPT)
**File**: `backend/src/models/payment.model.ts`

**Kept**:
- ✅ `VND_RATE_NEW = 1500` (current rate)
- ✅ `VND_RATE = 2500` (legacy reference)

**Routes**: `backend/src/routes/payment.routes.ts`
- ✅ Payment config returns `vndRate: 1500`

**Service**: `backend/src/services/payment.service.ts`
- ✅ Checkout uses `VND_RATE_NEW` (1500)

**Result**: New rate 1500 VND/$1 is active, adds to `credits` field.

---

## 🎯 Current System Architecture

### Simple Single-Credit System

```typescript
// UserNew Model
{
  credits: number,        // All credits at 1500 VND/$1 rate
  creditsUsed: number,    // Total usage
  purchasedAt: Date,      // Last purchase
  expiresAt: Date         // Expiration (7 days)
}
```

### Payment Flow

```
User purchases $50 credits
  ↓
Amount calculated: 50 * 1500 = 75,000 VND
  ↓
Payment webhook received
  ↓
Credits added: user.credits += 50
  ↓
User can use credits via any endpoint
```

---

## 📊 Pricing Examples

| Credits (USD) | VND Amount | Previous (2500) |
|---------------|------------|-----------------|
| $16           | 24,000     | 40,000          |
| $50           | 75,000     | 125,000         |
| $100          | 150,000    | 250,000         |

---

## ✅ What's Working Now

1. ✅ New rate: **1500 VND = $1 USD**
2. ✅ All credits go to `credits` field
3. ✅ Payment QR codes show correct VND amounts
4. ✅ Simple, single credit system
5. ✅ No dual-port complexity
6. ✅ No migration needed

---

## 🚀 Deployment Ready

The backend is now **production-ready** with:

- ✅ Simplified single credit field
- ✅ New rate 1500 VND/$1
- ✅ Clean, maintainable code
- ✅ No complex dual-credit logic

### Deploy Command

```bash
cd backend
npm run build
pm2 restart trollllm-backend
```

### Verification

```bash
# Check payment config
curl http://api.trollllm.xyz/api/payment/config
# Expected: { "vndRate": 1500, ... }

# Test checkout for $50
# Expected amount: 75,000 VND
```

---

## 📝 Notes

1. **No Database Migration Required**: The `credits` field already exists
2. **Rate Applied Immediately**: New purchases use 1500 VND/$1
3. **Clean Architecture**: Removed all dual-credit complexity
4. **Go Proxy**: Will use single `credits` field (no changes needed)
5. **Frontend**: Will display single credit balance (simpler UI)

---

## 🔄 Rollback (if needed)

If you need to revert to 2500 VND/$1 rate:

```typescript
// backend/src/models/payment.model.ts
export const VND_RATE_NEW = 2500; // Change back to 2500
```

That's it! Much simpler than dual-credit system.
