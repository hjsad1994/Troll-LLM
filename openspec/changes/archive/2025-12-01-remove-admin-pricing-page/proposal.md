# Change: Remove Admin Pricing Page and Related Components

## Why
The admin pricing page (`/admin/pricing`) and its backend services manage a MongoDB pricing table that is **NOT actually used** for credit calculation. The real billing logic is in GoProxy (`config/config.go`) which reads pricing from `models.json`. This redundant code adds maintenance overhead and potential confusion.

## What Changes
- **REMOVE** Frontend pricing page: `/admin/pricing`
- **REMOVE** Backend pricing controller, service, repository, and DTOs
- **REMOVE** Pricing API routes from admin routes
- **REMOVE** Sidebar navigation item "Model Pricing"
- **KEEP** GoProxy pricing logic (actual credit calculation)
- **KEEP** MongoDB model_pricing collection (in case needed later)

## Impact
- Affected specs: user-dashboard (remove Admin Pricing Dashboard requirement)
- Affected frontend code:
  - `frontend/src/app/(dashboard)/admin/pricing/page.tsx` - DELETE
  - `frontend/src/components/Sidebar.tsx` - Remove nav item
- Affected backend code:
  - `backend/src/controllers/pricing.controller.ts` - DELETE
  - `backend/src/services/pricing.service.ts` - DELETE
  - `backend/src/repositories/pricing.repository.ts` - DELETE
  - `backend/src/dtos/pricing.dto.ts` - DELETE
  - `backend/src/routes/admin.routes.ts` - Remove pricing routes
