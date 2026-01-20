# Change: Fix payment creditsNew expiration scheduler bug

## Why

**BUG NGHIÊM TRỌNG**: Khi user payment mua `creditsNew`, code đang gọi **sai function** để schedule expiration:
- Gọi: `scheduleExpiration()` (dành cho `credits` cũ - OhMyGPT)
- Phải gọi: `scheduleExpirationNew()` (dành cho `creditsNew` - OpenHands)

Điều này gây ra:
1. `creditsNew` không được schedule reset đúng sau 7 ngày
2. Khi backend restart, `init()` sẽ schedule đúng với `scheduleExpirationNew()`, nhưng giữa các restart thì không có timer
3. User có thể bị reset credits sai cách hoặc không được reset đúng hạn

## What Changes

- **BUG FIX**: Sửa `payment.service.ts:335` để gọi đúng `scheduleExpirationNew()` thay vì `scheduleExpiration()`

## Impact

- Affected specs: `creditsnew-expiration`
- Affected code: `backend/src/services/payment.service.ts:335`

## Root Cause

**File**: `backend/src/services/payment.service.ts:335`

```typescript
// WRONG - using old credits scheduler for creditsNew
expirationSchedulerService.scheduleExpiration(userId, expiresAtNew);  // ❌

// CORRECT - use creditsNew scheduler
expirationSchedulerService.scheduleExpirationNew(userId, expiresAtNew);  // ✅
```

## Scheduler Functions Comparison:

| Function | Dùng cho | Khi timeout gọi | Reset field |
|----------|----------|-----------------|-------------|
| `scheduleExpiration()` | `credits` (OhMyGPT) | `resetAndLog()` | `credits`, `expiresAt`, `purchasedAt` |
| `scheduleExpirationNew()` | `creditsNew` (OpenHands) | `resetAndLogNew()` | `creditsNew`, `expiresAtNew`, `purchasedAtNew` |

## Verification

- Khi backend restart, `ExpirationSchedulerService.init()` query tất cả users có `creditsNew > 0` và `expiresAtNew` set, rồi schedule đúng với `scheduleExpirationNew()`
- Vấn đề xảy ra **giữa các restart**: timer payment mới bị đăng ký sai
