# Dual Credits System Verification

## ✅ Database Schema (usersNew collection)

### Fields:
- `credits` (Number) - OhMyGPT balance (port 8005)
- `creditsUsed` (Number) - OhMyGPT tokens used
- `creditsNew` (Number) - OpenHands balance (port 8004)
- `tokensUserNew` (Number) - OpenHands tokens used

## ✅ Payment Service (Backend)

**File**: `backend/src/services/payment.service.ts`
**Line 282**: `$inc: { creditsNew: credits }`

When user pays → Credits go to `creditsNew` field ✅

## ✅ GoProxy Billing Functions

### DeductCreditsOpenHands() - internal/usage/tracker.go:366
**Used by**: OpenHands upstream (port 8004)
**Deducts from**:
- Line 399: `"creditsNew": -cost` ✅
- Line 400: `"tokensUserNew": tokensUsed` ✅
**Collection**: UsersNewCollection ✅

### DeductCreditsOhMyGPT() - internal/usage/tracker.go:437
**Used by**: OhMyGPT upstream (port 8005)
**Calls**: deductCreditsAtomic()
**Deducts from**:
- Line 297: `"creditsUsed": cost` ✅
- Line 310: `"credits": -creditsDeduct` ✅
**Collection**: UsersNewCollection (FIXED) ✅

## ✅ Handler Routing (main.go)

### OpenHands Handlers:
1. **handleOpenHandsOpenAIRequest** (line 1447)
   - Line 1695: `usage.DeductCreditsOpenHands(...)` ✅

### OhMyGPT Handlers:
1. **handleOhMyGPTOpenAIRequest** (line 1795)
   - Line 1852: `usage.DeductCreditsOhMyGPT(...)` ✅

2. **handleOhMyGPTMessagesRequest** (line 1884)
   - Line 1952: `usage.DeductCreditsOhMyGPT(...)` ✅

## ✅ Verification Summary

| Action | OpenHands (8004) | OhMyGPT (8005) |
|--------|------------------|----------------|
| **Deduct from** | creditsNew | credits |
| **Track usage in** | tokensUserNew | creditsUsed |
| **Collection** | usersNew | usersNew |
| **Function** | DeductCreditsOpenHands | DeductCreditsOhMyGPT |

## ✅ Payment Flow

```
User Payment
    ↓
payment.service.ts → addCredits()
    ↓
$inc: { creditsNew: credits }
    ↓
usersNew.creditsNew += amount
```

## ✅ Usage Flow

### OpenHands Request (port 8004):
```
handleOpenHandsOpenAIRequest
    ↓
DeductCreditsOpenHands(username, cost, tokens, ...)
    ↓
usersNew.creditsNew -= cost
usersNew.tokensUserNew += tokens
```

### OhMyGPT Request (port 8005):
```
handleOhMyGPTOpenAIRequest / handleOhMyGPTMessagesRequest
    ↓
DeductCreditsOhMyGPT(username, cost, tokens, ...)
    ↓
deductCreditsAtomic(...)
    ↓
usersNew.credits -= cost
usersNew.creditsUsed += cost
```

## ✅ All Checks Passed!
