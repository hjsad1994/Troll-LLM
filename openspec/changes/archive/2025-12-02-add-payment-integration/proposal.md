# Change: Add SePay Payment Gateway Integration (QR Code)

## Why
Currently, users must contact admin via Discord to upgrade their plan (Dev/Pro). This creates friction in the payment flow and delays user onboarding. Integrating SePay QR code payment allows users to self-service upgrade their subscription directly from the website by scanning QR with their banking app.

## What Changes
- Add new `/checkout` page for plan selection with embedded QR code
- Use SePay dynamic QR code URL for payment (no SDK required)
- Add backend API endpoints for payment initiation and webhook callback
- Store payment transactions in database for audit trail
- Auto-upgrade user plan upon successful payment via SePay webhook
- Add payment test section on homepage for quick payment testing (Dev/Pro)

## SePay QR Code Format
```
https://qr.sepay.vn/img?acc=VQRQAFRBD3142&bank=MBBank&amount={amount}&des={orderDescription}
```
- `acc`: Bank account number (VQRQAFRBD3142)
- `bank`: Bank name (MBBank)
- `amount`: Amount in VND
- `des`: Order description/invoice number (used to match payment)

## SePay Webhook Format
SePay sends POST request when payment is received:
```json
{
  "id": 92704,                              // Transaction ID on SePay
  "gateway": "MBBank",                      // Bank brand name
  "transactionDate": "2023-03-25 14:02:37", // Transaction time
  "accountNumber": "VQRQAFRBD3142",         // Bank account number
  "code": null,                             // Payment code
  "content": "TROLLDEV1701234567890AB",     // Transfer content (our orderCode)
  "transferType": "in",                     // "in" = incoming money
  "transferAmount": 35000,                  // Amount in VND
  "accumulated": 19077000,                  // Account balance
  "subAccount": null,
  "referenceCode": "MBVCB.3278907687",
  "description": ""
}
```
**Authentication:** Header `Authorization: Apikey {SEPAY_API_KEY}`

## Impact
- Affected specs: `user-dashboard` (plan upgrade flow)
- New spec: `payment` (new capability)
- Affected code:
  - `frontend/src/app/checkout/*` - new checkout pages with QR display
  - `backend/src/routes/payment.routes.ts` - payment API endpoints
  - `backend/src/services/payment.service.ts` - payment business logic
  - `backend/src/models/payment.model.ts` - payment transaction model
- New environment variables:
  - `SEPAY_ACCOUNT` - Bank account number (VQRQAFRBD3142)
  - `SEPAY_BANK` - Bank name (MBBank)
  - `SEPAY_API_KEY` - API key for webhook authentication

## Plan Pricing (VND)
- **Dev Plan**: 35,000 VND/month (225 credits)
- **Pro Plan**: 79,000 VND/month (500 credits)
