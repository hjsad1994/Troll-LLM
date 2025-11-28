# Change: Remove Lite Plan - Simplify to Dev & Pro Only

## Why
Simplify pricing structure from 4 plans (Free, Lite, Dev, Pro) to 3 plans (Free, Dev, Pro). The Lite tier is being removed and its users will need to be migrated to Dev or Free.

## What Changes
- **BREAKING**: Remove `lite` plan from all plan enums and configurations
- Update `Dev` plan: 300 RPM, 15M tokens/month
- Update `Pro` plan: 600 RPM, 40M tokens/month
- Update all frontend UI to only show Free, Dev, Pro options
- Update backend validation to reject `lite` as invalid plan

## Impact
- Affected specs: `user-dashboard`
- Affected code:
  - `backend/src/models/user.model.ts` - UserPlan type, PLAN_LIMITS
  - `backend/src/routes/admin.routes.ts` - validPlans validation
  - `frontend/src/lib/api.ts` - UserPlan type
  - `frontend/src/app/(dashboard)/users/page.tsx` - PLAN_ORDER, PLAN_STYLES
- Database: Users with `plan: 'lite'` need migration to `'dev'` or `'free'`
