## 1. Backend - Update Plan Credits
- [x] 1.1 Update PLAN_LIMITS in user.model.ts (Pro: valueUsd = 500)
- [x] 1.2 Update updatePlan() in user.repository.ts to auto-grant credits when plan changes

## 2. GoProxy - Deduct Credits
- [x] 2.1 Add DeductCredits function in usage package
- [x] 2.2 Call DeductCredits after calculating billing cost in main.go

## 3. Testing
- [x] 3.1 Verify admin can set plan and user receives credits
- [x] 3.2 Verify credits are deducted after API requests
