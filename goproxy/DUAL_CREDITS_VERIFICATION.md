# Unified Credits System (usersNew)

## ✅ Database Schema (usersNew collection)

### Fields:
- `creditsNew` (Number) - Main balance for both OpenHands (8004) and OhMyGPT (8005)
- `creditsNewUsed` (Number) - USD cost tracked for both upstreams
- `tokensUserNew` (Number) - Token count tracked for analytics
- `credits` (Number) - **DEPRECATED** - Legacy balance (no longer used)
- `creditsUsed` (Number) - **DEPRECATED** - Legacy tracking (no longer used)
- `refCredits` (Number) - Referral credits (still active for legacy users)

## ✅ Payment Service (Backend)

**File**: `backend/src/services/payment.service.ts`
**Line 282**: `$inc: { creditsNew: credits }`

When user pays → Credits go to `creditsNew` field ✅

## ✅ GoProxy Billing Functions

### DeductCreditsOpenHands() - internal/usage/tracker.go:366
**Used by**: OpenHands upstream (port 8004)
**Deducts from**:
- `"creditsNew": -cost`
- `"creditsNewUsed": cost`
- `"tokensUserNew": tokensUsed`
**Collection**: UsersNewCollection ✅

### DeductCreditsOhMyGPT() - internal/usage/tracker.go:444
**Used by**: OhMyGPT upstream (port 8005)
**Deducts from**:
- `"creditsNew": -cost`
- `"creditsNewUsed": cost`
- `"tokensUserNew": tokensUsed`
**Collection**: UsersNewCollection ✅

**Note**: Both functions now use the same `creditsNew` field for unified billing.

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
| **Deduct from** | creditsNew | creditsNew |
| **Track usage in** | creditsNewUsed / tokensUserNew | creditsNewUsed / tokensUserNew |
| **Collection** | usersNew | usersNew |
| **Function** | DeductCreditsOpenHands | DeductCreditsOhMyGPT |

**Both upstreams now use the same unified `creditsNew` field!**

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
usersNew.creditsNewUsed += cost
usersNew.tokensUserNew += tokens
```

### OhMyGPT Request (port 8005):
```
handleOhMyGPTOpenAIRequest / handleOhMyGPTMessagesRequest
    ↓
DeductCreditsOhMyGPT(username, cost, tokens, ...)
    ↓
usersNew.creditsNew -= cost
usersNew.creditsNewUsed += cost
usersNew.tokensUserNew += tokens
```

**Both upstreams now use the same creditsNew field!**

## ✅ All Checks Passed!
