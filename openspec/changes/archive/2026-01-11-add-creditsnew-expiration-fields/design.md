# Design: Separate Expiration Fields for creditsNew

## Architecture Overview

### Current State
```
UserNew {
  credits: number         // OhMyGPT (port 8005)
  creditsUsed: number     // OhMyGPT usage
  creditsNew: number      // OpenHands (port 8004)
  tokensUserNew: number   // OpenHands usage
  purchasedAt: Date       // Shared - problematic!
  expiresAt: Date         // Shared - problematic!
}
```

### Target State
```
UserNew {
  // OhMyGPT credits (port 8005)
  credits: number
  creditsUsed: number
  purchasedAt: Date | null      // For credits (OhMyGPT)
  expiresAt: Date | null        // For credits (OhMyGPT)

  // OpenHands credits (port 8004)
  creditsNew: number
  tokensUserNew: number
  purchasedAtNew: Date | null   // NEW - For creditsNew
  expiresAtNew: Date | null     // NEW - For creditsNew
}
```

## Data Flow

### Payment Flow (Current → New)

**Current:**
```
Payment received
  → addCredits()
    → user.creditsNew += amount
    → user.purchasedAt = now        ❌ Affects OhMyGPT timing
    → user.expiresAt = now + 7 days ❌ Affects OhMyGPT timing
    → scheduleExpiration(userId, expiresAt) ❌ Wrong credits reset
```

**New:**
```
Payment received
  → addCredits()
    → user.creditsNew += amount
    → user.purchasedAtNew = now        ✅ Only for creditsNew
    → user.expiresAtNew = now + 7 days ✅ Only for creditsNew
    → scheduleExpirationNew(userId, expiresAtNew) ✅ Correct reset
```

### Expiration Scheduler Flow

**Current:**
```
ExpirationScheduler.init()
  → Query users where credits > 0 AND expiresAt != null
  → Schedule reset for credits field
```

**New:**
```
ExpirationScheduler.init()
  → Query users where credits > 0 AND expiresAt != null
    → Schedule reset for credits (OhMyGPT)
  → Query users where creditsNew > 0 AND expiresAtNew != null
    → Schedule reset for creditsNew (OpenHands)
```

## API Response Changes

### UserProfile (GET /api/users/profile)
```typescript
interface UserProfile {
  // Existing fields...
  purchasedAt: Date | null;     // OhMyGPT
  expiresAt: Date | null;       // OhMyGPT
  // New fields
  purchasedAtNew: Date | null;  // OpenHands
  expiresAtNew: Date | null;    // OpenHands
}
```

### BillingInfo (GET /api/users/billing)
```typescript
interface BillingInfo {
  // Existing fields...
  purchasedAt: Date | null;
  expiresAt: Date | null;
  daysUntilExpiration: number | null;  // For credits
  isExpiringSoon: boolean;              // For credits
  // New fields
  purchasedAtNew: Date | null;
  expiresAtNew: Date | null;
  daysUntilExpirationNew: number | null;  // For creditsNew
  isExpiringSoonNew: boolean;              // For creditsNew
}
```

## Edge Cases

### 1. User has both credits and creditsNew
- Each type has independent expiration
- Scheduler handles both separately
- Dashboard shows both countdowns

### 2. User purchases when creditsNew > 0 (không hết hạn)
- `purchasedAtNew` = now
- `expiresAtNew` = now + 7 days (reset timer)
- Existing creditsNew continues to work

### 3. creditsNew expires while credits still valid
- Only creditsNew resets to 0
- credits remains unchanged
- `purchasedAtNew` and `expiresAtNew` set to null

### 4. Migration: Existing users with creditsNew > 0
- `purchasedAtNew` and `expiresAtNew` = null (no expiration)
- Admin can manually set expiration if needed
- Or wait for next purchase to set expiration

## Backward Compatibility

1. **No breaking changes** - existing `purchasedAt`/`expiresAt` remain for OhMyGPT credits
2. **New fields default to null** - no migration required
3. **API adds new fields** - frontend handles missing fields gracefully
4. **GoProxy unchanged** - only reads credits balances, not expiration
