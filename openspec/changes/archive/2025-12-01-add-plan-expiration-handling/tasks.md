## 1. Backend - User Model Update
- [x] 1.1 Add `planStartDate: Date | null` field to User model
- [x] 1.2 Add `planExpiresAt: Date | null` field to User model
- [x] 1.3 Create migration script to add fields to existing users (schema auto-updates with default null)

## 2. Backend - Admin Routes Update
- [x] 2.1 Update `PUT /admin/users/:userId/plan` to set `planStartDate` and `planExpiresAt` when upgrading
- [x] 2.2 Clear `planStartDate` and `planExpiresAt` when downgrading to Free
- [x] 2.3 Add utility function `calculatePlanExpiration(startDate: Date): Date`

## 3. Backend - Plan Expiration Check
- [x] 3.1 Create `checkAndResetExpiredPlan(user: IUser)` function in user.service.ts
- [x] 3.2 Add expiration check in auth middleware (on login)
- [x] 3.3 Add expiration check in API key validation (via GoProxy)

## 4. GoProxy - Plan Expiration Check
- [x] 4.1 Add `PlanExpiresAt` field to UserKey struct
- [x] 4.2 Add expiration check in request validation (IsPlanExpired method)
- [x] 4.3 Delete expired key from MongoDB when plan expires

## 5. Backend - Billing API Update
- [x] 5.1 Include `planStartDate` and `planExpiresAt` in `GET /api/user/billing` response
- [x] 5.2 Add `daysUntilExpiration` and `isExpiringSoon` fields in response

## 6. Frontend - Dashboard Update
- [x] 6.1 Display plan expiration date in billing section
- [x] 6.2 Add warning banner for expiring plans (< 7 days)
- [x] 6.3 Hide expiration info for Free tier users

## 7. Testing
- [x] 7.1 TypeScript backend compiles without errors
- [x] 7.2 Go proxy builds without errors
- [ ] 7.3 Manual test: plan upgrade sets correct expiration date
- [ ] 7.4 Manual test: plan expiration resets to Free tier correctly
