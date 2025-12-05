# Change: Remove PayPal Payment Integration

## Why
PayPal integration is no longer needed. The system will use SePay (Vietnamese QR code payment) as the only payment method. This simplifies the codebase and removes unnecessary dependencies.

## What Changes
- **BREAKING**: Remove PayPal Checkout API endpoints (`/api/payment/paypal/*`)
- **BREAKING**: Remove PayPal payment option from checkout page (International tab)
- Remove PayPal-related fields from Payment data model
- Remove PayPal configuration environment variables
- Remove PayPal SDK dependencies from frontend
- Remove PayPal translation strings from i18n
- Update documentation to remove PayPal setup instructions

## Impact
- Affected specs: `payment`
- Affected code:
  - `backend/src/services/payment.service.ts` - Remove PayPal methods (already done)
  - `backend/src/routes/payment.routes.ts` - Remove PayPal endpoints (already done)
  - `backend/src/models/payment.model.ts` - Remove PayPal fields (already done)
  - `frontend/src/app/checkout/page.tsx` - Remove PayPal option (already done)
  - `frontend/src/lib/i18n.ts` - Remove PayPal translations
  - `frontend/package.json` - Remove @paypal/react-paypal-js dependency
  - `backend/env.example` - Remove PAYPAL_* environment variables
  - `DEPLOYMENT.md` - Remove PayPal configuration section
  - `openspec/specs/payment/spec.md` - Remove PayPal requirements
