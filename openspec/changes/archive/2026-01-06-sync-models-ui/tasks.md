# Tasks: Sync Models UI with Config

## Phase 1: Backend API Enhancement

- [x] **1.1** Update `ModelConfig` interface in `backend/src/services/models.service.ts` to include all fields from config JSON
- [x] **1.2** Update `models.routes.ts` to expose full model metadata (cache prices, billing multiplier, etc.)

## Phase 2: Public Models Page (`/models`)

- [x] **2.1** Create API fetch hook or function in `frontend/src/app/models/page.tsx`
- [x] **2.2** Add loading and error states
- [x] **2.3** Update UI to use fetched data instead of hardcoded `models` array
- [x] **2.4** Update provider detection logic to derive from model ID patterns
- [x] **2.5** Update stats section to reflect actual model counts

## Phase 3: Dashboard Models Page (`/dashboard-models`)

- [x] **3.1** Create API fetch hook in `frontend/src/app/(dashboard)/dashboard-models/page.tsx`
- [x] **3.2** Add loading and error states
- [x] **3.3** Update UI to use fetched data instead of hardcoded `models` array
- [x] **3.4** Update filter counts to reflect actual data

## Phase 4: Validation

- [x] **4.1** Verify `/models` page displays all models from config
- [x] **4.2** Verify `/dashboard-models` page displays all models from config
- [x] **4.3** Verify pricing data matches config values
- [x] **4.4** Test filter functionality works with dynamic data
