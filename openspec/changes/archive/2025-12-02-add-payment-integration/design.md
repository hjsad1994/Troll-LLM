## Context
TrollLLM needs a self-service payment system for users to upgrade from Free to Dev/Pro plans. SePay dynamic QR code is chosen for simple integration - users scan QR with their banking app to make bank transfer.

**Stakeholders**: End users, Admin
**Constraints**: Must support VND currency, bank transfer method

## Goals / Non-Goals
**Goals:**
- Enable self-service plan upgrades via SePay QR code
- Simple integration without SDK dependency
- Audit trail for all payment transactions
- Automatic plan upgrade upon successful payment via webhook

**Non-Goals:**
- Multiple payment methods (card, e-wallet) - future enhancement
- Recurring subscriptions - manual renewal for now
- Refund handling - manual process via admin

## Decisions

### Decision 1: Use SePay Dynamic QR Code
**Why**: Simplest integration - just generate QR image URL with parameters. No SDK required, works with all Vietnamese banking apps.

**QR URL Format:**
```
https://qr.sepay.vn/img?acc=VQRQAFRBD3142&bank=MBBank&amount={amount}&des={description}
```

**Alternatives considered:**
- SePay SDK (`sepay-pg-node`): More complex, requires form submission and redirects
- VNPay: More complex integration, requires more documentation
- MoMo: E-wallet only, not suitable for larger transactions

### Decision 2: Store bank info and API key in environment variables
**Why**: Security best practice - keep configuration separate from code.

```env
# backend/.env
SEPAY_ACCOUNT=VQRQAFRBD3142
SEPAY_BANK=MBBank
SEPAY_API_KEY=your_sepay_api_key_here
```

### Decision 3: QR Code embedded checkout flow
**Why**: User stays on our website, scans QR with their banking app. Simpler UX than redirect-based flow.

**Flow:**
1. User selects plan on `/checkout` page
2. Frontend calls `POST /api/payment/checkout` with plan
3. Backend creates pending payment record with unique order ID
4. Backend returns QR code URL with amount and order description
5. Frontend displays QR code for user to scan
6. User scans QR and completes payment in their banking app
7. SePay detects payment and sends webhook to callback endpoint
8. Backend verifies payment and upgrades user plan
9. Frontend polls for payment status or receives real-time update

### Decision 4: Order description format
**Why**: SePay uses the `des` (description) field in QR code. When user pays, this appears in `content` field of webhook. Must be unique and identifiable.

**Format:** `TROLL{planCode}{timestamp}{random}`
- Example: `TROLLDEV1701234567890AB` (Dev plan)
- Example: `TROLLPRO1701234567890CD` (Pro plan)

### Decision 5: Webhook authentication and validation
**Why**: Ensure webhook requests are from SePay, not attackers.

**SePay webhook payload:**
```json
{
  "id": 92704,                              // SePay transaction ID
  "gateway": "MBBank",                      // Bank name
  "transactionDate": "2023-03-25 14:02:37", // Transaction time
  "accountNumber": "VQRQAFRBD3142",         // Our bank account
  "code": null,                             // Payment code
  "content": "TROLLDEV1701234567890AB",     // Transfer content (our orderCode!)
  "transferType": "in",                     // "in" = incoming
  "transferAmount": 35000,                  // Amount in VND
  "accumulated": 19077000,                  // Balance
  "subAccount": null,
  "referenceCode": "MBVCB.3278907687",
  "description": ""
}
```

**Authentication:** SePay sends header `Authorization: Apikey {API_KEY}`

**Validation steps:**
1. Verify `Authorization` header matches `Apikey {SEPAY_API_KEY}`
2. Check `transferType` is `"in"` (incoming money)
3. Check `accountNumber` matches `SEPAY_ACCOUNT`
4. Search `content` field for matching orderCode (e.g., `TROLLDEV...` or `TROLLPRO...`)
5. Verify `transferAmount` matches expected amount (35000 or 79000)
6. If all valid, mark payment as success and upgrade user

### Decision 6: Payment model schema
```typescript
interface IPayment {
  _id: string;                    // Auto-generated MongoDB ObjectId
  userId: string;                 // User making payment
  plan: 'dev' | 'pro';           // Plan being purchased
  amount: number;                 // Amount in VND (35000 or 79000)
  currency: 'VND';
  orderCode: string;              // Unique order code (in QR des field)
  status: 'pending' | 'success' | 'failed' | 'expired';
  sepayTransactionId?: string;    // SePay transaction reference
  createdAt: Date;
  expiresAt: Date;                // QR code expiration (15 minutes)
  completedAt?: Date;
}
```

### Decision 7: Payment status polling
**Why**: User needs feedback after scanning QR. Two approaches:
1. **Polling**: Frontend polls `GET /api/payment/{id}/status` every 3 seconds
2. **WebSocket**: Real-time update (more complex)

**Choice**: Start with polling for simplicity, add WebSocket later if needed.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| User pays wrong amount | QR includes exact amount, most banking apps auto-fill |
| Duplicate order codes | Use timestamp + random suffix |
| Webhook delivery failure | Add manual verification option; admin can check SePay dashboard |
| QR expiration | Set 15-minute expiry, show countdown timer |
| User closes page before payment completes | Payment continues; show in payment history |

## Migration Plan
1. Deploy backend changes first (new routes, models)
2. Configure environment variables on production
3. Test with small amount payment
4. Update frontend checkout links
5. Monitor webhook delivery

## Open Questions
- [x] QR code format - Confirmed: `https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=...`
- [ ] Webhook URL configuration in SePay dashboard
- [ ] Should we support plan renewal before expiration?
- [ ] Email/notification on successful payment?
