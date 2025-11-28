# Tasks: Remove Lite Plan

## 1. Backend Changes
- [x] 1.1 Update `backend/src/models/user.model.ts` - Remove `lite` from UserPlan type
- [x] 1.2 Update `backend/src/models/user.model.ts` - Remove `lite` from PLAN_LIMITS, update Dev to 300 RPM/15M, Pro to 600 RPM/40M
- [x] 1.3 Update `backend/src/models/user.model.ts` - Remove `lite` from schema enum
- [x] 1.4 Update `backend/src/routes/admin.routes.ts` - Remove `lite` from validPlans array

## 2. Frontend Changes
- [x] 2.1 Update `frontend/src/lib/api.ts` - Remove `lite` from UserPlan type
- [x] 2.2 Update `frontend/src/app/(dashboard)/users/page.tsx` - Remove `lite` from PLAN_ORDER
- [x] 2.3 Update `frontend/src/app/(dashboard)/users/page.tsx` - Remove `lite` from PLAN_STYLES and all color mappings

## 3. Database Migration
- [x] 3.1 Create migration script to update users with `plan: 'lite'` to `plan: 'dev'`
- [x] 3.2 Run migration script (0 users to migrate - none had lite plan)

## 4. Verification
- [x] 4.1 TypeScript compiles successfully (backend & frontend)
- [x] 4.2 Test /users page displays only Free, Dev, Pro
- [x] 4.3 Test plan change modal only shows Free, Dev, Pro options
- [x] 4.4 Verify API rejects `lite` as invalid plan
