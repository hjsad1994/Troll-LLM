# Design: PayPal Payment Integration

## Context
The current payment system only supports SePay (Vietnamese QR code payment). To expand to international users, PayPal integration is needed as an alternative payment method.

## Goals
- Support PayPal Checkout for international users
- Maintain existing SePay flow unchanged
- Use PayPal Orders API v2 (recommended, v1 is deprecated)
- Handle webhooks for reliable payment confirmation

## Non-Goals
- PayPal Subscriptions (one-time payments only)
- PayPal Credit/Pay Later features
- Multi-currency support (USD only for PayPal)

## Decisions

### 1. Use PayPal REST API directly (not SDK)
**Rationale**: The TypeScript SDK has limited documentation. Direct REST API calls are simpler and more maintainable.

### 2. Payment Flow
```
Frontend                    Backend                     PayPal
   |                           |                          |
   |-- POST /paypal/create --->|                          |
   |                           |-- Create Order --------->|
   |                           |<-- Order ID -------------|
   |<-- { orderId } -----------|                          |
   |                           |                          |
   |-- PayPal Popup ---------->|                          |
   |                           |                          |
   |<-- onApprove(orderID) ----|                          |
   |                           |                          |
   |-- POST /paypal/capture -->|                          |
   |                           |-- Capture Order -------->|
   |                           |<-- Capture Result -------|
   |                           |-- Upgrade User Plan      |
   |<-- { success } -----------|                          |
```

### 3. Pricing
- **Pro Plan only**: $4.00 USD
- Dev Plan: Not available via PayPal (SePay only)

### 4. Webhook Events to Listen
- `PAYMENT.CAPTURE.COMPLETED` - Primary event for successful payment
- `CHECKOUT.ORDER.APPROVED` - Optional, for logging

### 5. Database Schema
Reuse existing `Payment` model with additional field:
- `paypalOrderId`: string (PayPal order ID)
- `paymentMethod`: 'sepay' | 'paypal'

## Risks / Trade-offs
- **Currency conversion**: Fixed USD prices may not match VND exactly
  - Mitigation: Round to user-friendly USD amounts
- **Webhook reliability**: PayPal may retry webhooks
  - Mitigation: Idempotent webhook handler (check if already processed)

## Environment Variables
```env
PAYPAL_CLIENT_ID=Ae7QEI6Hno-d19cLbWxwgHYY4NEIEeMvzWtog6gAV9pEQyoy22c5p8epmbqHNaZ0kZb78KLYOVSYND8r
PAYPAL_CLIENT_SECRET=EMz1ZWEpcP0lkFFWvHiEpIH3sWHbnt7kqe9Nm1saXmcOaVsSTt1iv7fHGoyGs5hhRqRcaMvYtuR1HUWi
PAYPAL_WEBHOOK_ID=0TL091548T368791A
PAYPAL_MODE=sandbox
```

## Open Questions
- None
