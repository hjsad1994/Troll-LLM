# Change: Add Referral System

## Why
Increase user acquisition and retention by incentivizing existing users to refer new customers. Both referrer and referred user receive bonus credits upon successful payment.

## What Changes
- Add referral code generation for each user
- Track referral relationships (who referred whom)
- Award **referral credits** (separate from main credits) when referred user completes payment:
  - **Dev Plan**: 25 referral credits for both referrer and referred user
  - **Pro Plan**: 50 referral credits for both referrer and referred user
- **Referral credits are a separate balance** (`refCredits` field)
- **Usage priority**: Main credits are used first, then referral credits when main credits are exhausted
- **Referral credits benefit**: When using referral credits, user gets **Pro-level RPM (1000 RPM)**
- Add referral link sharing functionality
- **Add new Referral page** at `/dashboard/referral` with:
  - User's referral link with copy button
  - List of referred users (with status: registered/paid)
  - Total successful referrals count
  - Total refCredits earned
  - Current refCredits balance
- **Add Referral menu item** to dashboard sidebar

## Impact
- Affected specs: `payment`, `api-proxy`
- Affected code:
  - Backend: User model, Payment service, new Referral routes
  - Frontend: Registration page, Dashboard (referral section)
  - GoProxy: Credit deduction logic, RPM calculation
  - Database: User schema (referralCode, referredBy, refCredits fields)
