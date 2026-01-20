# Design: Dual-Rate Credit System with creditsNew

## Overview

This design introduces a parallel credit system where users maintain two separate credit balances:

1. **Legacy Credits** (`credits` field): Purchased at 2500 VND/$1, consumed via `chat.trollllm.xyz` (port 8005/ohmygpt)
2. **New Credits** (`creditsNew` field): Purchased at 1500 VND/$1, consumed via `chat2.trollllm.xyz` (port 8004/Openhands)

This architecture allows gradual transition to the new rate without disrupting existing users' credit balances or requiring forced migrations.

## Architecture Decisions

### Decision 1: Two Separate Credit Fields

**Choice**: Add `creditsNew` field alongside existing `credits` field in UserNew model

**Rationale**:
- Preserves existing user balances at their purchased rate
- No need for complex credit value conversions
- Clear separation of concerns for different rate structures
- Simpler rollback if issues arise

**Alternatives Considered**:
- **Single field with rate history** - Rejected: Complex tracking of which credits were purchased at which rate
- **Conversion of all credits to new rate** - Rejected: Would require adjusting existing balances, potential user dissatisfaction

**Trade-offs**:
- ✅ **Pro**: Simple, clear separation
- ✅ **Pro**: No data migration required
- ❌ **Con**: Increased model complexity
- ❌ **Con**: Dual tracking in analytics

### Decision 2: Endpoint-Based Credit Pool Selection

**Choice**: Use different endpoints to determine which credit pool to deduct from
- Port 8005 (ohmygpt) → `credits`
- Port 8004 (Openhands) → `creditsNew`

**Rationale**:
- Clear routing logic without request-level parameters
- Allows infrastructure-level separation
- Users can consciously choose which credit pool to use by selecting the endpoint
- Simplifies proxy logic (no need to parse request bodies)

**Alternatives Considered**:
- **Header-based selection** - Rejected: Requires client-side configuration, error-prone
- **Request parameter** - Rejected: Breaks API compatibility, requires changes to all clients
- **Auto-depletion (use one then other)** - Rejected: User explicitly wants separate endpoints

**Trade-offs**:
- ✅ **Pro**: Simple routing logic
- ✅ **Pro**: Clear user control
- ✅ **Pro**: Infrastructure-level separation
- ❌ **Con**: Requires documenting two endpoints
- ❌ **Con**: May confuse users initially

### Decision 3: All New Revenue Goes to creditsNew

**Choice**: Direct purchases, promo bonuses, and referral bonuses all add to `creditsNew`

**Rationale**:
- Simplifies payment logic
- Encourages adoption of new rate system
- Makes `credits` field effectively read-only (legacy)
- Cleaner analytics (new revenue clearly tracked)

**Alternatives Considered**:
- **Bonuses to old field** - Rejected: Creates split revenue tracking
- **User-selectable destination** - Rejected: Unnecessary complexity

**Trade-offs**:
- ✅ **Pro**: Clean separation of legacy vs new
- ✅ **Pro**: Simplified payment service
- ✅ **Pro**: Better analytics
- ❌ **Con**: Users with only legacy credits won't get bonuses there

### Decision 4: No Automatic Credit Conversion

**Choice**: Do not provide automatic conversion between `credits` and `creditsNew`

**Rationale**:
- Rate difference (2500 vs 1600) creates 1.5625x conversion factor - confusing for users
- Prevents gaming the system or exploiting rate differences
- Keeps the two pools truly separate
- Simpler implementation

**Alternatives Considered**:
- **Manual admin conversion** - Considered for future if user demand exists
- **One-way conversion (old → new)** - Rejected: Complex pricing implications

**Trade-offs**:
- ✅ **Pro**: No gaming potential
- ✅ **Pro**: Clear separation
- ❌ **Con**: Users cannot consolidate credits

## Data Model Changes

### UserNew Schema (MongoDB)

```typescript
export interface IUserNew {
  _id: string;
  // ... existing fields ...

  // Legacy credit system (2500 VND/$1 rate)
  credits: number;           // Legacy credits remaining (USD)
  creditsUsed: number;       // Legacy credits used (lifetime, USD)

  // New credit system (1600 VND/$1 rate)
  creditsNew: number;        // New credits remaining (USD) - NEW FIELD
  creditsNewUsed: number;    // New credits used (lifetime, USD) - NEW FIELD

  totalInputTokens: number;  // Input tokens used (for analytics)
  totalOutputTokens: number; // Output tokens used (for analytics)
  purchasedAt?: Date | null; // When credits were last purchased
  expiresAt?: Date | null;   // When credits expire (7 days from purchase)
  // ... rest of fields ...
}
```

**Schema Changes**:
- Add `creditsNew: { type: Number, default: 0 }`
- Add `creditsNewUsed: { type: Number, default: 0 }`
- No changes to existing fields
- No migration required (defaults to 0)

### Payment Model Constants

```typescript
// Existing rate (legacy)
export const VND_RATE = 2500; // For reference/legacy

// New rate (current)
export const VND_RATE_NEW = 1500; // 1500 VND = $1 (selling price)

// Use VND_RATE_NEW for all new payments
```

## Service Layer Changes

### Payment Service Flow

**Before** (current):
```
User purchases $X → Payment created with amount = X * 2500 VND
→ Webhook processes → addCredits(userId, X) → credits += X
```

**After** (new):
```
User purchases $X → Payment created with amount = X * 1500 VND
→ Webhook processes → addCredits(userId, X) → creditsNew += X
```

**Key Method Changes**:

1. **payment.service.ts::createCheckout()**
   - Change: `const amount = credits * VND_RATE_NEW;` (was VND_RATE)

2. **payment.service.ts::addCredits()**
   - Change: `$inc: { creditsNew }` (was credits)
   - Bonus flow also updates creditsNew

3. **user-new.repository.ts** (new methods):
   - `addCreditsNew(userId: string, amount: number)`
   - `deductCreditsNew(userId: string, amount: number)`
   - `getCreditsNew(userId: string): Promise<number>`

## Proxy Layer Changes (Go)

### Router Logic

```go
// main.go
func main() {
    // ... existing setup ...

    // Port 8005: Legacy credit system (ohmygpt)
    go func() {
        http.HandleFunc("/v1/", handleLegacyCredit)
        log.Fatal(http.ListenAndServe(":8005", nil))
    }()

    // Port 8004: New credit system (Openhands)
    go func() {
        http.HandleFunc("/v1/", handleNewCredit)
        log.Fatal(http.ListenAndServe(":8004", nil))
    }()
}
```

### User Key Model

```go
// internal/userkey/model.go
type UserKey struct {
    ID             string    `bson:"_id"`
    Name           string    `bson:"name"`

    // Legacy credits
    Credits        float64   `bson:"credits"`         // Legacy balance
    CreditsUsed    float64   `bson:"creditsUsed"`     // Legacy usage

    // New credits
    CreditsNew     float64   `bson:"creditsNew"`      // NEW FIELD
    CreditsNewUsed float64   `bson:"creditsNewUsed"`  // NEW FIELD

    // ... rest of fields ...
}
```

### Validator Logic

```go
// internal/userkey/validator.go

func (v *Validator) ValidateCredit(apiKey string, useNewCredit bool) error {
    user, err := v.GetUser(apiKey)
    if err != nil {
        return err
    }

    if useNewCredit {
        // Check creditsNew for port 8004
        if user.CreditsNew <= 0 {
            return errors.New("insufficient new credits")
        }
    } else {
        // Check credits for port 8005
        if user.Credits <= 0 {
            return errors.New("insufficient legacy credits")
        }
    }

    return nil
}
```

### Usage Tracker

```go
// internal/usage/tracker.go

func (t *Tracker) DeductCredit(userId string, cost float64, useNewCredit bool) error {
    if useNewCredit {
        // Deduct from creditsNew
        return t.db.UpdateOne(
            bson.M{"_id": userId},
            bson.M{
                "$inc": bson.M{
                    "creditsNew": -cost,
                    "creditsNewUsed": cost,
                },
            },
        )
    } else {
        // Deduct from credits (existing logic)
        return t.db.UpdateOne(
            bson.M{"_id": userId},
            bson.M{
                "$inc": bson.M{
                    "credits": -cost,
                    "creditsUsed": cost,
                },
            },
        )
    }
}
```

## Frontend Changes

### Dashboard Display

```typescript
// dashboard/page.tsx
<div className="credit-balances">
  <div className="legacy-credits">
    <h3>Legacy Credits (2500 VND/$1)</h3>
    <p>${user.credits.toFixed(2)}</p>
    <small>Use at chat.trollllm.xyz</small>
  </div>

  <div className="new-credits">
    <h3>Credits (1500 VND/$1)</h3>
    <p>${user.creditsNew.toFixed(2)}</p>
    <small>Use at chat2.trollllm.xyz</small>
  </div>
</div>
```

### Checkout Page

```typescript
// checkout/page.tsx
const VND_RATE = 1500; // Updated from 2500

// Display pricing
<div>
  <p>Rate: {VND_RATE} VND = $1 USD</p>
  <p>Amount: {credits * VND_RATE} VND</p>
</div>
```

## Testing Strategy

### Unit Tests
- Payment service: Verify creditsNew is incremented
- User repository: Test addCreditsNew/deductCreditsNew methods
- Go proxy validator: Test credit checks for both fields

### Integration Tests
- End-to-end purchase flow: Verify credits go to creditsNew
- API requests via port 8004: Verify creditsNew is deducted
- API requests via port 8005: Verify credits is deducted
- Bonus flows: Verify promo/referral bonuses add to creditsNew

### Manual Testing Checklist
- [ ] Purchase credits → verify creditsNew increases
- [ ] Make API call to port 8004 → verify creditsNew decreases
- [ ] Make API call to port 8005 → verify credits decreases
- [ ] Check dashboard → both balances display correctly
- [ ] Verify promo bonus adds to creditsNew
- [ ] Verify referral bonus adds to creditsNew
- [ ] Test with user having only legacy credits
- [ ] Test with user having only new credits
- [ ] Test with user having both credit types

## Rollout Plan

### Phase 1: Backend Schema (Low Risk)
- Add creditsNew, creditsNewUsed fields to UserNew model
- Deploy to production (default 0, no behavior change)
- Verify schema update successful

### Phase 2: Payment Logic (Medium Risk)
- Update payment service to use VND_RATE_NEW
- Update addCredits to increment creditsNew
- Update bonus logic
- Deploy to production
- Monitor: New payments should add to creditsNew

### Phase 3: Proxy Changes (High Risk)
- Add creditsNew field to Go user model
- Implement separate deduction logic
- Deploy to staging first
- Load test both endpoints
- Deploy to production
- Monitor: Port 8004 uses creditsNew, port 8005 uses credits

### Phase 4: Frontend (Low Risk)
- Update checkout page rate display
- Update dashboard to show both balances
- Update credits widget
- Deploy to production

### Phase 5: Documentation & Communication
- Update API documentation
- Update user guides
- Announce new endpoint and rate in Discord/email
- Provide migration guide for users

## Monitoring & Metrics

### Key Metrics to Track
- Total creditsNew balance across all users
- Total credits balance across all users (should gradually decrease)
- Revenue split: payments adding to creditsNew
- API usage split: port 8004 vs port 8005
- Credit deduction errors (insufficient credits)

### Alerts
- Spike in credit deduction errors
- Mismatch between payment amount and creditsNew increase
- Zero usage on port 8004 (indicates adoption issue)

## Rollback Strategy

If critical issues arise:

1. **Payment issues**: Revert payment service to add to `credits` field
2. **Proxy issues**: Route all traffic to port 8005 (legacy system)
3. **Data issues**: creditsNew field can be zeroed out if necessary (users won't lose legacy credits)

**Important**: Do NOT delete creditsNew field or data once deployed. Only disable new additions if needed.

## Future Considerations

### Potential Enhancements
1. **Manual conversion tool**: Admin UI to convert credits ↔ creditsNew (with rate adjustment)
2. **Auto-routing**: Smart routing based on available credits (if creditsNew empty, use credits)
3. **Credit expiration per field**: Separate expiration tracking for each credit type
4. **Analytics dashboard**: Detailed breakdown of usage by credit type

### Deprecation Plan
- Once legacy credits are depleted across user base (6-12 months), consider:
  - Deprecating port 8005
  - Removing `credits` field (after full migration)
  - Renaming `creditsNew` to `credits` for simplicity
