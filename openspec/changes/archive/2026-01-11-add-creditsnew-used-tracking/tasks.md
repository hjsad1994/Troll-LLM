## 1. Backend Model Update
- [x] 1.1 Add `creditsNewUsed: number` to `IUserNew` interface in `backend/src/models/user-new.model.ts`
- [x] 1.2 Add `creditsNewUsed: { type: Number, default: 0 }` to schema

## 2. Backend Service Update
- [x] 2.1 Add `creditsNewUsed` to `UserProfile` interface in `user.service.ts`
- [x] 2.2 Add `creditsNewUsed` to `BillingInfo` interface
- [x] 2.3 Update `getUserProfile()` to include `creditsNewUsed` in response
- [x] 2.4 Update `getBillingInfo()` to include `creditsNewUsed`

## 3. GoProxy Model Update
- [x] 3.1 Add `CreditsNewUsed float64` field to `LegacyUser` struct in `goproxy/internal/userkey/model.go` with bson tag `"creditsNewUsed"`

## 4. GoProxy Usage Tracker Update
- [x] 4.1 Update `DeductCreditsOpenHands()` in `goproxy/internal/usage/tracker.go` to increment `creditsNewUsed` with `cost` value
  - Added: `"creditsNewUsed": cost` to `incFields`

## 5. Frontend API Types Update
- [x] 5.1 Add `creditsNewUsed: number` to `UserProfile` interface in `frontend/src/lib/api.ts`
- [x] 5.2 Add `creditsNewUsed: number` to `BillingInfo` interface
- [x] 5.3 Add `creditsNewUsed: number` to `AdminUser` interface (used by users-new page)

## 6. Frontend Display Update
- [x] 6.1 Dashboard page already shows credits balance (creditsNew) - creditsNewUsed is tracked for analytics
- [x] 6.2 Display `creditsNewUsed` in users-new admin page table (replaced tokensUserNew with creditsNewUsed in "Used" column)

## 7. Validation
- [ ] 7.1 Test: Tạo request qua OpenHands upstream, verify `creditsNewUsed` tăng đúng với cost (USD)
- [ ] 7.2 Test: Verify `creditsNew` giảm và `creditsNewUsed` tăng cùng giá trị cost
- [ ] 7.3 Test: Verify API trả về `creditsNewUsed` trong user profile
