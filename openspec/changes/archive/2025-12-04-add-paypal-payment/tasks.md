# Tasks: Add PayPal Payment Integration

## 1. Backend Implementation
- [ ] 1.1 Add PayPal environment variables to `env.example`
- [ ] 1.2 Create PayPal authentication helper (get access token)
- [ ] 1.3 Add `createPayPalOrder` method to payment service (Pro plan only, $4.00 USD)
- [ ] 1.4 Add `capturePayPalOrder` method to payment service
- [ ] 1.5 Add `processPayPalWebhook` method to payment service
- [ ] 1.6 Add PayPal webhook signature verification (Webhook ID: 0TL091548T368791A)
- [ ] 1.7 Add PayPal routes: `POST /api/payment/paypal/create`, `POST /api/payment/paypal/capture`, `POST /api/payment/paypal/webhook`
- [ ] 1.8 Update Payment model with `paymentMethod` and `paypalOrderId` fields

## 2. Frontend Implementation
- [ ] 2.1 Install `@paypal/react-paypal-js` package
- [ ] 2.2 Add PayPal client ID to frontend environment
- [ ] 2.3 Create PayPalCheckout component with PayPalButtons
- [ ] 2.4 Update Checkout page (`/checkout?plan=pro`) with dual payment tabs: VN (QR) + International (PayPal)
- [ ] 2.5 Update Checkout page (`/checkout?plan=dev`) to show QR only (no PayPal)
- [ ] 2.6 Handle PayPal payment success/error states

## 3. Testing
- [ ] 3.1 Test PayPal sandbox checkout flow for Pro plan
- [ ] 3.2 Test webhook handling with PayPal simulator
- [ ] 3.3 Verify user plan upgrade after PayPal payment
- [ ] 3.4 Verify Dev plan does NOT show PayPal option

## 4. Documentation
- [ ] 4.1 Update DEPLOYMENT.md with PayPal configuration instructions
