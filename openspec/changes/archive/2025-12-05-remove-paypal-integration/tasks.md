# Tasks: Remove PayPal Payment Integration

## 1. Backend Changes (Already Done)
- [x] 1.1 Remove PayPal methods from `payment.service.ts`
- [x] 1.2 Remove PayPal routes from `payment.routes.ts`
- [x] 1.3 Remove PayPal fields from `payment.model.ts` (paypalOrderId, paymentMethod: 'paypal', paypalCaptureId, USD currency)
- [x] 1.4 Remove `payment.repository.ts` PayPal-related methods

## 2. Frontend Changes (Already Done)
- [x] 2.1 Remove PayPal checkout component and International tab from checkout page
- [x] 2.2 Remove @paypal/react-paypal-js from package.json

## 3. Remaining Frontend Changes
- [x] 3.1 Remove PayPal translation strings from `frontend/src/lib/i18n.ts`

## 4. Configuration Changes
- [x] 4.1 Remove PAYPAL_* environment variables from `backend/env.example` (already clean)

## 5. Documentation Updates
- [x] 5.1 Remove PayPal configuration section from `DEPLOYMENT.md`

## 6. OpenSpec Updates
- [x] 6.1 Remove PayPal requirements from `openspec/specs/payment/spec.md`
