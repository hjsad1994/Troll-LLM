# Change: Add PayPal Payment Integration

## Why
Expand payment options beyond SePay to support international users who prefer PayPal. This enables global reach and provides an alternative payment method for users without Vietnamese bank accounts.

## What Changes
- Add PayPal Checkout SDK integration (backend + frontend)
- Add new API endpoints for PayPal order creation and capture (Pro plan only)
- Add PayPal webhook handling for payment confirmation
- Update checkout UI (`/checkout?plan=pro`) with dual payment methods:
  - **VN (Vietnam)**: SePay QR code
  - **International**: PayPal ($4.00 USD)
- Dev plan (`/checkout?plan=dev`): QR only (no PayPal)
- Add PayPal configuration environment variables

## Impact
- Affected specs: `payment`
- Affected code:
  - `backend/src/services/payment.service.ts` - Add PayPal methods
  - `backend/src/routes/payment.routes.ts` - Add PayPal endpoints
  - `frontend/src/pages/Checkout.tsx` - Add PayPal buttons
  - `backend/env.example` - Add PayPal env vars

## Configuration
PayPal Sandbox credentials provided:
- Client ID: `Ae7QEI6Hno-d19cLbWxwgHYY4NEIEeMvzWtog6gAV9pEQyoy22c5p8epmbqHNaZ0kZb78KLYOVSYND8r`
- Webhook ID: `0TL091548T368791A`
- Mode: Sandbox (will switch to Live for production)

## Pricing
- **Pro Plan only**: $4.00 USD (PayPal does not support Dev plan)
