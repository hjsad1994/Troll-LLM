# Implementation Tasks: Dual-Rate Credit System

## Task Order and Dependencies

This change requires careful sequencing to avoid breaking the production system. Tasks are ordered by dependency and risk level.

---

## Phase 1: Database Schema & Model Updates (Low Risk)

### Task 1.1: Add creditsNew Fields to UserNew Model
**File**: `backend/src/models/user-new.model.ts`
- Add `creditsNew: number` to IUserNew interface
- Add `creditsNewUsed: number` to IUserNew interface
- Add `creditsNew: { type: Number, default: 0 }` to schema
- Add `creditsNewUsed: { type: Number, default: 0 }` to schema
- Update schema comments to document dual credit system

**Validation**:
- TypeScript compiles without errors
- Existing tests pass
- New users created after deployment have creditsNew = 0

**Dependencies**: None

---

### Task 1.2: Add VND_RATE_NEW Constant to Payment Model
**File**: `backend/src/models/payment.model.ts`
- Add `export const VND_RATE_NEW = 1500;` constant
- Add comment: `// VND_RATE (2500) is legacy reference, use VND_RATE_NEW for new purchases`
- Update inline documentation

**Validation**:
- Constant is exported and accessible
- TypeScript compiles
- No behavior change yet (constant not used)

**Dependencies**: None

---

### Task 1.3: Add Repository Methods for creditsNew
**File**: `backend/src/repositories/user-new.repository.ts`
- Add `addCreditsNew(userId: string, amount: number): Promise<void>` method
- Add `deductCreditsNew(userId: string, amount: number): Promise<boolean>` method
- Add `getCreditsNew(userId: string): Promise<number>` method
- Implement atomic updates using `$inc` operator

**Validation**:
- Methods compile without TypeScript errors
- Unit tests for new methods pass (create basic tests)
- Methods can be called but don't affect behavior yet

**Dependencies**: Task 1.1

---

## Phase 2: Backend Payment Logic (Medium Risk)

### Task 2.1: Update Payment Service to Use New Rate
**File**: `backend/src/services/payment.service.ts`
- In `createCheckout()`: Change `const amount = credits * VND_RATE;` to `const amount = credits * VND_RATE_NEW;`
- Update inline comments to reflect new rate

**Validation**:
- New checkout requests calculate amount at 1500 VND/$1
- QR codes display correct VND amount
- Manual test: Create checkout for $50, verify amount is 75,000 VND

**Dependencies**: Task 1.2

---

### Task 2.2: Update addCredits to Use creditsNew Field
**File**: `backend/src/services/payment.service.ts`
- In `addCredits()` method: Change `$inc: { credits }` to `$inc: { creditsNew }`
- Update payment record tracking: `creditsBefore`/`creditsAfter` should read/update creditsNew
- Update log messages to indicate creditsNew

**Validation**:
- Successful test payment adds credits to creditsNew field
- Payment record shows correct creditsBefore/creditsAfter
- credits field remains unchanged during new payments
- Manual test: Complete payment, check MongoDB directly for creditsNew value

**Dependencies**: Task 1.1, Task 2.1

---

### Task 2.3: Update Promo Bonus to Use creditsNew
**File**: `backend/src/services/payment.service.ts`
- In `calculateCreditsWithBonus()` and usage in `processWebhook()`: Ensure bonus adds to creditsNew
- No code change needed if already using `addCredits()` method
- Verify calculation applies to creditsNew field

**Validation**:
- During active promo, bonus credits add to creditsNew
- Manual test: Purchase during promo, verify creditsNew includes bonus

**Dependencies**: Task 2.2

---

### Task 2.4: Update Referral Bonus to Use creditsNew (Optional)
**File**: `backend/src/services/payment.service.ts`
- In `awardReferralBonus()` method (currently disabled): Update to use `addRefCredits` → `addCreditsNew`
- Note: Referral system is currently disabled, so this is future-proofing

**Validation**:
- If referral system is re-enabled, bonuses go to creditsNew
- No immediate validation needed (feature disabled)

**Dependencies**: Task 2.2

---

### Task 2.5: Update User Profile API to Return creditsNew
**File**: `backend/src/routes/user.routes.ts` and `backend/src/services/user.service.ts`
- Ensure GET `/api/user/profile` includes `creditsNew` and `creditsNewUsed` in response
- No code change needed if already returning full user object
- Verify response includes new fields

**Validation**:
- API response includes creditsNew field
- API test: `curl /api/user/profile` returns both credits and creditsNew
- Frontend can read creditsNew value

**Dependencies**: Task 1.1

---

### Task 2.6: Update Payment Config Endpoint to Return New Rate
**File**: `backend/src/routes/payment.routes.ts`
- Update `GET /api/payment/config` to return `vndRate: VND_RATE_NEW`
- Ensure frontend receives 1500, not 2500

**Validation**:
- API returns `{ vndRate: 1500, ... }`
- Manual test: `curl /api/payment/config` shows correct rate

**Dependencies**: Task 1.2

---

## Phase 3: Go Proxy Changes (High Risk)

### Task 3.1: Add creditsNew Fields to Go UserKey Model
**File**: `goproxy/internal/userkey/model.go`
- Add `CreditsNew float64` field with bson tag `"creditsNew"`
- Add `CreditsNewUsed float64` field with bson tag `"creditsNewUsed"`
- Update struct comments

**Validation**:
- Go code compiles without errors
- User documents can be unmarshaled with new fields
- Test: Load user from MongoDB, verify CreditsNew field is populated

**Dependencies**: Task 1.1 (schema must exist in DB)

---

### Task 3.2: Update Validator to Check Appropriate Credit Field
**File**: `goproxy/internal/userkey/validator.go`
- Add parameter to validator methods: `useNewCredit bool`
- In validation logic: if `useNewCredit`, check `CreditsNew`; else check `Credits`
- Update error messages to indicate which credit field is insufficient

**Validation**:
- Unit tests: Validator correctly checks CreditsNew when useNewCredit=true
- Unit tests: Validator correctly checks Credits when useNewCredit=false
- Validation rejects request when appropriate field has insufficient balance

**Dependencies**: Task 3.1

---

### Task 3.3: Update Usage Tracker to Deduct from Appropriate Field
**File**: `goproxy/internal/usage/tracker.go`
- Add parameter to deduction methods: `useNewCredit bool`
- In deduction logic: if `useNewCredit`, deduct from creditsNew; else deduct from credits
- Update MongoDB queries: `$inc: { creditsNew: -cost, creditsNewUsed: cost }` or `$inc: { credits: -cost, creditsUsed: cost }`

**Validation**:
- Unit tests: Deduction updates correct fields based on useNewCredit parameter
- Integration test: Simulate request, verify correct field is decremented in DB

**Dependencies**: Task 3.1

---

### Task 3.4: Implement Port-Based Credit Selection in Main Router
**File**: `goproxy/main.go`
- Set up two separate HTTP listeners:
  - Port 8004 (Openhands) → routes to handler with `useNewCredit=true`
  - Port 8005 (ohmygpt) → routes to handler with `useNewCredit=false`
- Update handler functions to pass `useNewCredit` to validator and tracker
- Ensure correct credit field is used based on port

**Validation**:
- Both ports start successfully
- Request to port 8004 deducts from creditsNew
- Request to port 8005 deducts from credits
- Integration test: Send test requests to both ports, verify correct field deduction

**Dependencies**: Task 3.2, Task 3.3

---

### Task 3.5: Update Insufficient Credit Error Messages
**File**: `goproxy/internal/userkey/validator.go` and error handling
- Return specific error messages:
  - Port 8004: "Insufficient new credits. Please top up at checkout page."
  - Port 8005: "Insufficient legacy credits. Use chat2.trollllm.xyz for new credit system."
- Ensure error format matches OpenAI/Anthropic specs (402 status)

**Validation**:
- Manual test: User with creditsNew=0 gets correct error on port 8004
- Manual test: User with credits=0 gets correct error on port 8005
- Error response format is valid JSON and includes helpful message

**Dependencies**: Task 3.2

---

## Phase 4: Frontend Updates (Low Risk)

### Task 4.1: Update Checkout Page to Use New Rate
**File**: `frontend/src/app/checkout/page.tsx`
- Update `const VND_RATE = 2500;` to `const VND_RATE = 1500;`
- Update UI text: "Rate: 1,500 VND = $1 USD"
- Update pricing calculations and displays

**Validation**:
- Checkout page displays correct VND amounts
- For $50 purchase, displays "75,000 VND"
- QR code matches displayed amount

**Dependencies**: Task 2.6 (payment config API)

---

### Task 4.2: Update Dashboard to Display Both Credit Balances
**File**: `frontend/src/app/(dashboard)/dashboard/page.tsx`
- Fetch both `credits` and `creditsNew` from user profile API
- Display two separate credit sections:
  - "Legacy Credits (2500 VND/$1)" → `{user.credits}`
  - "Credits (1500 VND/$1)" → `{user.creditsNew}`
- Add tooltips/help text explaining the difference
- Add links to appropriate endpoints (chat.trollllm.xyz vs chat2.trollllm.xyz)

**Validation**:
- Dashboard shows both credit balances
- Values match database values
- UI is clear and not confusing

**Dependencies**: Task 2.5 (profile API returns creditsNew)

---

### Task 4.3: Update Credits Status Widget
**File**: `frontend/src/components/CreditsStatusWidget.tsx`
- Display both credit balances in widget
- Use compact format to avoid clutter
- Consider showing total or combined view option

**Validation**:
- Widget shows both balances
- Widget updates in real-time after payment
- Widget displays correctly on all screen sizes

**Dependencies**: Task 2.5

---

### Task 4.4: Update Header Credit Display
**File**: `frontend/src/components/Header.tsx`
- Display both credit balances or combined total
- Add icon/indicator for each credit type

**Validation**:
- Header shows credit information clearly
- No UI overflow or layout issues

**Dependencies**: Task 2.5

---

### Task 4.5: Add User Documentation for Dual Credit System
**File**: `frontend/src/app/docs/...` (create new page or update existing)
- Explain dual credit system
- Document which endpoint uses which credit field
- Provide examples and FAQs
- Add migration guide for users with legacy credits

**Validation**:
- Documentation is clear and comprehensive
- Users can understand how to use both credit types

**Dependencies**: None (can be done in parallel)

---

## Phase 5: Testing & Validation

### Task 5.1: End-to-End Payment Flow Test
- User purchases $50 credits
- Verify payment amount is 75,000 VND
- Verify creditsNew increases by 50 (or 60 if promo active)
- Verify credits field unchanged
- Verify payment record has correct creditsBefore/creditsAfter

**Dependencies**: All Phase 2 and Phase 4 tasks

---

### Task 5.2: End-to-End API Request Test (Port 8004)
- User makes API request to chat2.trollllm.xyz
- Verify creditsNew is deducted
- Verify credits field unchanged
- Verify response is successful

**Dependencies**: All Phase 3 tasks

---

### Task 5.3: End-to-End API Request Test (Port 8005)
- User makes API request to chat.trollllm.xyz
- Verify credits is deducted
- Verify creditsNew field unchanged
- Verify response is successful

**Dependencies**: All Phase 3 tasks

---

### Task 5.4: Insufficient Credits Error Test
- User with creditsNew=0 makes request to port 8004 → Verify 402 error
- User with credits=0 makes request to port 8005 → Verify 402 error
- Verify error messages are helpful

**Dependencies**: Task 3.5

---

### Task 5.5: Promo Bonus Test
- Activate promo (20% bonus)
- Purchase $50 credits
- Verify creditsNew increases by 60 (50 + 10 bonus)

**Dependencies**: Task 2.3

---

### Task 5.6: Dashboard Display Test
- Log in to dashboard
- Verify both credit balances display correctly
- Verify labels and tooltips are clear
- Test on mobile and desktop

**Dependencies**: Task 4.2

---

## Phase 6: Documentation & Deployment

### Task 6.1: Update API Documentation
- Document dual credit system in API docs
- Document endpoint differences (port 8004 vs 8005)
- Update payment API documentation with new rate

**Dependencies**: None (can be done in parallel)

---

### Task 6.2: Create Deployment Plan
- Write step-by-step deployment instructions
- Define rollback procedure
- Set up monitoring alerts for credit deduction errors

**Dependencies**: None (can be done in parallel)

---

### Task 6.3: Deploy to Staging Environment
- Deploy all changes to staging
- Run full test suite
- Perform manual QA

**Dependencies**: All implementation tasks

---

### Task 6.4: Deploy to Production
- Deploy backend changes first (schema, models, services)
- Deploy Go proxy changes
- Deploy frontend changes
- Monitor error rates and credit deduction patterns

**Dependencies**: Task 6.3

---

### Task 6.5: Announce Changes to Users
- Send email/Discord notification about new endpoint
- Explain new rate (1500 VND/$1)
- Provide migration guide
- Announce legacy system will remain available

**Dependencies**: Task 6.4

---

## Summary

**Total Tasks**: 28 tasks across 6 phases

**Critical Path**:
1. Task 1.1 → 2.2 → 3.1 → 3.3 → 3.4 → 5.2 (API flow for port 8004)
2. Task 1.2 → 2.1 → 4.1 → 5.1 (Payment flow)

**Estimated Implementation Time**: 3-5 days
- Phase 1-2: 1 day (backend)
- Phase 3: 1.5 days (Go proxy, most complex)
- Phase 4: 0.5 day (frontend)
- Phase 5: 1 day (testing)
- Phase 6: 0.5 day (deployment)

**Risk Level**: Medium-High
- Highest risk: Phase 3 (Go proxy changes) - incorrect deduction could cause revenue loss
- Medium risk: Phase 2 (payment logic) - incorrect rate could affect pricing
- Low risk: Phase 1 & 4 (schema and UI changes)
