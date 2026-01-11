# Implementation Tasks

## 1. Database Schema Updates
- [x] 1.1 Add `creditsNew` field (Number, default 0) to `usersNew` schema in `backend/src/models/user-new.model.ts`
- [x] 1.2 Add `tokensUserNew` field (Number, default 0) to track token usage for OpenHands in `usersNew` schema
- [x] 1.3 Update TypeScript interface `IUserNew` with new fields

## 2. Payment Service Modifications
- [x] 2.1 Update `payment.service.ts` `addCredits()` method to increment `creditsNew` instead of `credits`
- [x] 2.2 Ensure `expiresAt` logic applies to both `credits` and `creditsNew`
- [x] 2.3 Ensure promo bonus calculation applies to `creditsNew`
- [x] 2.4 Update payment logging to reflect `creditsNew` balance changes

## 3. GoProxy Model Updates
- [x] 3.1 Add `CreditsNew` field to `LegacyUser` struct in `goproxy/internal/userkey/model.go`
- [x] 3.2 Add `TokensUserNew` field to `LegacyUser` struct for tracking usage
- [x] 3.3 Update `UserCredits` struct to include `CreditsNew` field

## 4. GoProxy Validator Updates
- [x] 4.1 Update `validateFromUsersNewCollection()` to check `creditsNew > 0` for OpenHands requests
- [x] 4.2 Update `CheckUserCredits()` to support checking `creditsNew` based on upstream
- [x] 4.3 Update `GetUserCreditsWithRef()` to return both `credits` and `creditsNew`
- [x] 4.4 Add new function `GetUserCreditsNew(username string) (float64, error)` for OpenHands billing

## 5. GoProxy Billing Logic Routing
- [x] 5.1 Identify upstream port in request handler (8004 = OpenHands, 8005 = OhMyGPT)
- [x] 5.2 Route OpenHands (port 8004) billing to deduct from `creditsNew` and increment `tokensUserNew`
- [x] 5.3 Route OhMyGPT (port 8005) billing to deduct from `credits` and increment `creditsUsed`
- [x] 5.4 Update all MongoDB update queries in `main.go` to use correct field based on upstream

## 6. Testing & Validation
- [ ] 6.1 Test payment flow: verify credits added to `creditsNew` field
- [ ] 6.2 Test OpenHands (port 8004) request: verify deduction from `creditsNew`
- [ ] 6.3 Test OhMyGPT (port 8005) request: verify deduction from `credits`
- [ ] 6.4 Test expiration logic: verify both credit fields expire after 7 days
- [ ] 6.5 Test promo bonus: verify bonus applies to `creditsNew` during promo period
- [ ] 6.6 Test insufficient credits: verify appropriate error for each upstream

## 7. Documentation
- [x] 7.1 Update API documentation to reflect dual credit system (see DUAL_CREDITS_VERIFICATION.md)
- [x] 7.2 Document field usage: `credits` for OhMyGPT, `creditsNew` for OpenHands
- [ ] 7.3 Add migration notes if needed for existing users
