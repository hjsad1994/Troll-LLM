# Spec Delta: Payment System - New Rate

## ADDED Requirements

### Requirement: New VND Rate Constant

The payment model SHALL define a new VND rate constant for the new credit pricing.

#### Scenario: VND_RATE_NEW constant is defined
- **Given** the payment model in `backend/src/models/payment.model.ts`
- **When** the constants are defined
- **Then** it SHALL include `export const VND_RATE_NEW = 1500`
- **And** the existing `VND_RATE` constant SHALL remain at 2500 for reference

#### Scenario: VND rate documentation
- **Given** the payment model constants section
- **When** developers read the code
- **Then** comments SHALL indicate `VND_RATE` is legacy/reference
- **And** comments SHALL indicate `VND_RATE_NEW` is the current rate for new purchases

### Requirement: All New Purchases Use New Rate

The payment service SHALL calculate payment amounts using the new rate (1500 VND/$1) for all new purchases.

#### Scenario: Checkout uses new rate
- **Given** a user initiates a credit purchase for $X
- **When** calling `paymentService.createCheckout(userId, X)`
- **Then** the system SHALL calculate `amount = X * VND_RATE_NEW`
- **And** the amount SHALL be `X * 1500` VND
- **And** the system SHALL NOT use `VND_RATE` (2500)

#### Scenario: QR code displays new rate amount
- **Given** a checkout with credits $50
- **When** the QR code URL is generated
- **Then** the amount parameter SHALL be `50 * 1500 = 75,000` VND
- **And** the QR code SHALL display the correct amount to pay

#### Scenario: Payment record stores VND amount at new rate
- **Given** a payment is created for $50 credits
- **When** the payment record is saved to database
- **Then** the `amount` field SHALL be `75,000` (not 125,000)
- **And** the `credits` field SHALL be `50`

### Requirement: Credit Addition to creditsNew Field

The payment service SHALL add purchased credits to the `creditsNew` field instead of `credits` field.

#### Scenario: Successful payment adds to creditsNew
- **Given** a successful payment webhook for $50 credits
- **And** the user has `creditsNew: 10` and `credits: 20`
- **When** the payment is processed
- **Then** the system SHALL increment `creditsNew` by 50
- **And** the user SHALL have `creditsNew: 60`
- **And** the `credits` field SHALL remain at `20` (unchanged)

#### Scenario: Promo bonus adds to creditsNew
- **Given** a promo is active with 20% bonus
- **And** a user purchases $50 credits
- **When** the payment is processed
- **Then** the base credits SHALL be `50`
- **And** the bonus credits SHALL be `10` (20% of 50)
- **And** the total added to `creditsNew` SHALL be `60`
- **And** the `credits` field SHALL NOT be modified

#### Scenario: Payment tracking includes creditsNew
- **Given** a payment webhook is processed
- **When** the payment record is updated
- **Then** the system SHALL record `creditsBefore` (value of creditsNew before payment)
- **And** the system SHALL record `creditsAfter` (value of creditsNew after payment)
- **And** these values SHALL reflect `creditsNew` field, not `credits`

### Requirement: Referral Bonuses to creditsNew

The payment service SHALL award referral bonuses to the `creditsNew` field for both referrer and referred user.

#### Scenario: First purchase referral bonus to creditsNew
- **Given** UserA was referred by UserB
- **And** UserA makes their first purchase of $50
- **When** the referral bonus is awarded
- **Then** the system SHALL add bonus credits to UserA's `creditsNew` field
- **And** the system SHALL add bonus credits to UserB's `creditsNew` field
- **And** the `credits` field SHALL NOT be modified for either user

#### Scenario: Referral bonus calculation unchanged
- **Given** a first purchase of $50
- **When** calculating referral bonus
- **Then** the bonus SHALL be `max(5, floor(50 * 0.5)) = 25` credits
- **And** this amount SHALL be added to `creditsNew` for both users

### Requirement: Payment Configuration Returns New Rate

The payment configuration API SHALL return the new rate for frontend display.

#### Scenario: Payment config endpoint returns new rate
- **Given** the payment config endpoint at `GET /api/payment/config`
- **When** a frontend client requests payment configuration
- **Then** the response SHALL include `vndRate: 1500`
- **And** the response SHALL NOT return 2500

#### Scenario: Frontend uses config for display
- **Given** the checkout page fetches payment config
- **When** displaying pricing information
- **Then** it SHALL show "1,500 VND = $1 USD"
- **And** for $50 purchase, it SHALL show "75,000 VND"

## MODIFIED Requirements

### Requirement: Payment Service addCredits Method

The existing `addCredits` method SHALL be modified to add credits to `creditsNew` field.

#### Scenario: addCredits updates creditsNew field
- **Given** `paymentService.addCredits(userId, 50)` is called
- **When** the method updates the user document
- **Then** it SHALL execute: `UserNew.findByIdAndUpdate(userId, { $inc: { creditsNew: 50 } })`
- **And** it SHALL NOT modify the `credits` field

#### Scenario: addCredits maintains expiration behavior
- **Given** a user has `expiresAt: 2026-01-15`
- **And** a new payment adds credits on 2026-01-11
- **When** `addCredits` is called
- **Then** the system SHALL update `expiresAt` to 7 days from now (2026-01-18)
- **And** the expiration SHALL apply to both `credits` and `creditsNew` fields

#### Scenario: addCredits updates payment record
- **Given** a payment with paymentId
- **When** `addCredits(userId, 50, discordId, paymentId)` is called
- **Then** the payment record SHALL be updated with:
  - `creditsBefore` = user's creditsNew before addition
  - `creditsAfter` = user's creditsNew after addition

### Requirement: Frontend Checkout Page Uses New Rate

The frontend checkout page SHALL display pricing based on the new rate.

#### Scenario: Checkout page VND_RATE constant
- **Given** the checkout page in `frontend/src/app/checkout/page.tsx`
- **When** the page component is rendered
- **Then** the `VND_RATE` constant SHALL be `1500`
- **And** it SHALL NOT be `2500`

#### Scenario: Checkout page pricing display
- **Given** a user selects $50 credits
- **When** the checkout page calculates the VND amount
- **Then** it SHALL display "75,000 VND"
- **And** the rate SHALL be shown as "1,500 VND per $1"

#### Scenario: Checkout page QR code uses new rate
- **Given** a user proceeds to payment
- **When** the QR code is generated
- **Then** the QR code amount SHALL reflect `credits * 1500` VND
- **And** the displayed text SHALL match the QR code amount

## REMOVED Requirements

None. No existing requirements are removed, only extended or modified.

## Data Types

### PaymentConfig
```typescript
{
  vndRate: number          // 1500 (new rate)
  minCredits: number       // 16
  maxCredits: number       // 100
  validityDays: number     // 7
  promoActive?: boolean    // true if promo is currently active
  promoBonus?: number      // e.g., 20 for 20% bonus
}
```

### PaymentAmount
```typescript
{
  credits: number          // USD amount (e.g., 50)
  vndAmount: number        // VND amount (e.g., 75000)
  rate: number             // 1500
}
```

## Constraints

- All payments MUST use `VND_RATE_NEW` (1500) for amount calculation
- Credits from payments MUST be added to `creditsNew` field
- The `credits` field is effectively read-only (no new additions)
- Existing `VND_RATE` constant remains for reference but is not used in new payments
- Payment expiration behavior remains unchanged (7 days)
- Promo and referral bonuses follow the same field (`creditsNew`)
