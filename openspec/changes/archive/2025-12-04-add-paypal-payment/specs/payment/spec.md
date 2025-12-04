## ADDED Requirements

### Requirement: PayPal Checkout Integration
The system SHALL allow authenticated users to pay via PayPal for Pro plan only.

#### Scenario: Create PayPal order for Pro plan
- **WHEN** authenticated user calls `POST /api/payment/paypal/create` with `{ "plan": "pro" }`
- **THEN** the system SHALL create a pending payment record with `paymentMethod: 'paypal'`
- **AND** call PayPal Orders API v2 to create order with amount $4.00 USD
- **AND** return `{ orderId: "<paypal_order_id>" }` for frontend PayPal SDK

#### Scenario: Reject PayPal order for Dev plan
- **WHEN** authenticated user calls `POST /api/payment/paypal/create` with `{ "plan": "dev" }`
- **THEN** the system SHALL return 400 error with message "PayPal only supports Pro plan"

#### Scenario: Capture PayPal order after approval
- **WHEN** user approves payment in PayPal popup
- **AND** frontend calls `POST /api/payment/paypal/capture` with `{ "orderID": "<paypal_order_id>" }`
- **THEN** the system SHALL call PayPal Capture API
- **AND** update payment status to 'success'
- **AND** upgrade user plan to Pro and add 500 credits
- **AND** return `{ success: true, plan: "pro" }`

#### Scenario: PayPal order creation without authentication
- **WHEN** unauthenticated user calls `POST /api/payment/paypal/create`
- **THEN** the system SHALL return 401 Unauthorized

---

### Requirement: PayPal Webhook Handling
The system SHALL process PayPal webhooks for payment confirmation as a backup to capture flow.

**PayPal Webhook Payload (PAYMENT.CAPTURE.COMPLETED):**
```json
{
  "id": "WH-XXX",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": {
    "id": "capture_id",
    "status": "COMPLETED",
    "amount": {
      "value": "1.50",
      "currency_code": "USD"
    },
    "supplementary_data": {
      "related_ids": {
        "order_id": "paypal_order_id"
      }
    }
  }
}
```

#### Scenario: Verify PayPal webhook signature
- **WHEN** PayPal sends POST to `/api/payment/paypal/webhook`
- **THEN** the system SHALL verify webhook signature using PayPal Webhook ID
- **AND** if signature is invalid, return 401 Unauthorized

#### Scenario: Process PAYMENT.CAPTURE.COMPLETED webhook
- **WHEN** PayPal sends webhook with `event_type: "PAYMENT.CAPTURE.COMPLETED"`
- **AND** signature is valid
- **AND** `resource.status` is "COMPLETED"
- **THEN** the system SHALL find payment by `paypalOrderId`
- **AND** if payment is still pending, update status to 'success'
- **AND** upgrade user plan if not already upgraded
- **AND** return 200 OK

#### Scenario: Duplicate webhook handling
- **WHEN** PayPal sends webhook for already processed payment
- **THEN** the system SHALL ignore the webhook (idempotent)
- **AND** return 200 OK

---

### Requirement: PayPal Frontend Integration
The system SHALL display dual payment methods on checkout page: VN (QR) and International (PayPal).

#### Scenario: Display dual payment methods on Pro plan checkout
- **WHEN** authenticated user navigates to `/checkout?plan=pro`
- **THEN** the system SHALL display two payment method tabs/options:
  - **VN (Vietnam)**: SePay QR code (79,000 VND)
  - **International**: PayPal button ($4.00 USD)
- **AND** configure PayPalScriptProvider with client ID and USD currency

#### Scenario: Display QR only on Dev plan checkout
- **WHEN** authenticated user navigates to `/checkout?plan=dev`
- **THEN** the system SHALL display only VN payment method
- **AND** show SePay QR code (35,000 VND)
- **AND** NOT display PayPal option or International tab

#### Scenario: User selects VN payment on Pro plan
- **WHEN** user selects "VN" payment method on Pro plan checkout
- **THEN** the system SHALL display SePay QR code
- **AND** show amount 79,000 VND
- **AND** start polling for payment status

#### Scenario: User selects International payment on Pro plan
- **WHEN** user selects "International" payment method on Pro plan checkout
- **THEN** the system SHALL display PayPal button
- **AND** show amount $4.00 USD

#### Scenario: PayPal button click flow
- **WHEN** user clicks PayPal button on Pro plan
- **THEN** the system SHALL call backend `/api/payment/paypal/create` with `{ "plan": "pro" }`
- **AND** open PayPal popup with order ID
- **AND** on approval, call `/api/payment/paypal/capture`
- **AND** display success message on completion

#### Scenario: PayPal payment cancellation
- **WHEN** user cancels PayPal popup
- **THEN** the system SHALL display "Payment cancelled" message
- **AND** allow user to retry

#### Scenario: PayPal payment error
- **WHEN** PayPal returns error during checkout
- **THEN** the system SHALL display error message
- **AND** log error for debugging

---

### Requirement: PayPal Configuration
The system SHALL use environment variables for PayPal integration.

#### Scenario: Load PayPal configuration
- **WHEN** payment service initializes
- **THEN** it SHALL read from environment:
  - `PAYPAL_CLIENT_ID`: PayPal app client ID
  - `PAYPAL_CLIENT_SECRET`: PayPal app secret
  - `PAYPAL_WEBHOOK_ID`: Webhook ID for signature verification
  - `PAYPAL_MODE`: 'sandbox' or 'live'
- **AND** use sandbox API URL for sandbox mode
- **AND** use live API URL for live mode

#### Scenario: PayPal API endpoints
- **WHEN** `PAYPAL_MODE` is 'sandbox'
- **THEN** use `https://api-m.sandbox.paypal.com` as base URL
- **WHEN** `PAYPAL_MODE` is 'live'
- **THEN** use `https://api-m.paypal.com` as base URL

---

## MODIFIED Requirements

### Requirement: Payment Data Model
The system SHALL store payment transactions with the following schema.

#### Scenario: Payment record structure
- **WHEN** a payment is created
- **THEN** it SHALL contain:
  - `userId`: string (reference to user)
  - `plan`: 'dev' | 'pro'
  - `amount`: number (35000 or 79000 VND for SePay, 4.00 USD for PayPal Pro)
  - `currency`: 'VND' | 'USD'
  - `orderCode`: string (unique, used in QR des field) - for SePay
  - `paypalOrderId`: string (PayPal order ID) - for PayPal
  - `paymentMethod`: 'sepay' | 'paypal'
  - `status`: 'pending' | 'success' | 'failed' | 'expired'
  - `sepayTransactionId`: string (optional, from SePay webhook)
  - `paypalCaptureId`: string (optional, from PayPal capture)
  - `createdAt`: Date
  - `expiresAt`: Date (15 minutes from creation)
  - `completedAt`: Date (optional, when payment confirmed)
