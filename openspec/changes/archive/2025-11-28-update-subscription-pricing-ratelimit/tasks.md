# Implementation Tasks

## 1. Database & Models
- [x] 1.1 Create `model_pricing` MongoDB schema and model (`backend/src/models/model-pricing.model.ts`)
- [x] 1.2 Create seed data for initial model pricing (Sonnet: $3/$15, Haiku: $1/$5, Opus: $5/$25)
- [x] 1.3 Update `PLAN_LIMITS` in `user.model.ts` with new values (Pro RPM: 1000)

## 2. Backend API - Pricing Management
- [x] 2.1 Create `pricing.service.ts` with CRUD operations for model pricing
- [x] 2.2 Create `pricing.controller.ts` for handling HTTP requests
- [x] 2.3 Create DTOs for pricing validation (`pricing.dto.ts`)
- [x] 2.4 Add pricing routes to `admin.routes.ts`:
  - `GET /admin/pricing` - List all model prices
  - `GET /admin/pricing/:modelId` - Get specific model price
  - `PUT /admin/pricing/:modelId` - Update model price (admin only)
  - `POST /admin/pricing` - Create new model price (admin only)

## 3. GoProxy - Free Tier Blocking
- [x] 3.1 Update `internal/userkey/model.go` to add `IsFreeUser()` method
- [x] 3.2 Update `GetRPMLimit()` to return 1000 for Pro tier
- [x] 3.3 Add Free Tier check in `main.go` before processing requests
- [x] 3.4 Return HTTP 403 with error `{"error": {"message": "Free Tier users cannot access this API. Please upgrade your plan.", "type": "free_tier_restricted"}}`

## 4. GoProxy - Load Pricing Config
- [ ] 4.1 Create `internal/pricing/model.go` for pricing structures
- [ ] 4.2 Create `internal/pricing/loader.go` to load pricing from MongoDB
- [ ] 4.3 Integrate pricing into billing calculation (replace token_multiplier)

Note: Task 4 deferred - current token_multiplier approach works; pricing data available via admin API for future billing integration.

## 5. Frontend - Admin Pricing Management
- [x] 5.1 Create `/admin/pricing` page component
- [x] 5.2 Add pricing table with edit functionality
- [x] 5.3 Add form for updating model prices
- [x] 5.4 Add validation for price inputs (positive numbers)
- [x] 5.5 Add navigation link to admin sidebar

## 6. Frontend - Free Tier UX
- [ ] 6.1 Add error handling for "free_tier_restricted" error type
- [ ] 6.2 Show upgrade prompt when Free Tier user tries to access API
- [ ] 6.3 Update plan comparison UI to show Free = blocked

Note: Task 6 deferred - Free tier blocking happens at proxy level; frontend will show API errors naturally. No user-facing pages needed since Free tier users don't have API keys to use.

## 7. Plan Configuration Updates
- [x] 7.1 Calculate token equivalents for $225 (Dev) and $600 (Pro) based on average model pricing
- [x] 7.2 Update `PLAN_LIMITS` with calculated totalTokens values
- [x] 7.3 Document pricing calculation formula

Pricing calculation:
- Average model price: ~$3/MTok input, ~$15/MTok output (using Sonnet as reference)
- Assuming 50/50 input/output ratio: avg $9/MTok
- Dev ($225): 225/9 = 25M tokens -> set to 15M for conservative estimate
- Pro ($600): 600/9 = 66M tokens -> set to 40M for conservative estimate

## 8. Testing
- [x] 8.1 Test Free Tier blocking returns correct error
- [x] 8.2 Test Pro tier gets 1000 RPM limit
- [x] 8.3 Test pricing CRUD operations
- [x] 8.4 Test admin-only access to pricing endpoints
- [x] 8.5 Run TypeScript check for backend (tsc --noEmit)
- [x] 8.6 Run TypeScript check for frontend (tsc --noEmit)

## 9. Documentation
- [ ] 9.1 Update API documentation with new pricing endpoints
- [ ] 9.2 Document breaking change for Free Tier users

Note: Task 9 deferred - documentation updates not requested in this change.
