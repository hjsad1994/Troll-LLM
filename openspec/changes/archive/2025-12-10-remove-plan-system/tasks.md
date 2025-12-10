## 1. Backend Model Changes
- [ ] 1.1 Remove `plan` field from `IUser` and `IUserNew` interfaces
- [ ] 1.2 Remove `planStartDate`, `planExpiresAt` fields from user models
- [ ] 1.3 Remove plan-related helper functions and constants (CREDIT_PACKAGES plan mapping)

## 2. Backend Service Changes
- [ ] 2.1 Update `user.service.ts` to remove plan logic
- [ ] 2.2 Update `payment.service.ts` to remove plan assignment, only add credits
- [ ] 2.3 Update `auth.service.ts` to remove plan checks on login
- [ ] 2.4 Remove plan upgrade/downgrade logic from admin routes

## 3. GoProxy Changes
- [ ] 3.1 Update `validator.go` to only check credits (already mostly done)
- [ ] 3.2 Remove any plan-based RPM differentiation
- [ ] 3.3 Ensure all users with credits get DefaultUserRPM (300)

## 4. Frontend Dashboard Changes
- [ ] 4.1 Remove plan badge/display from dashboard page
- [ ] 4.2 Remove plan period section (planStartDate, planExpiresAt display)
- [ ] 4.3 Update credits display to be primary indicator
- [ ] 4.4 Remove plan expiration warnings

## 5. Frontend Checkout Changes
- [ ] 5.1 Remove plan selection from checkout page
- [ ] 5.2 Change to credits-only purchase flow
- [ ] 5.3 Update payment modal/UI

## 6. Admin UI Changes
- [ ] 6.1 Remove plan dropdown from user edit modal
- [ ] 6.2 Remove plan column from users table
- [ ] 6.3 Keep credits/refCredits edit functionality

## 7. API Routes Cleanup
- [ ] 7.1 Update user routes to not return plan field
- [ ] 7.2 Update admin routes to not accept plan updates
- [ ] 7.3 Remove plan-based access control (Free Tier restrictions)

## 8. Testing & Validation
- [ ] 8.1 Test API access with credits > 0
- [ ] 8.2 Test API rejection with credits = 0
- [ ] 8.3 Test refCredits fallback when credits = 0
- [ ] 8.4 Test payment webhook adds credits without plan change
