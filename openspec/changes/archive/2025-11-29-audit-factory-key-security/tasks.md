# Tasks: Troll-Key Security Fixes

## 1. Backend - Route Protection (CRITICAL)
- [x] 1.1 Add `requireAdmin` middleware to `GET /admin/troll-keys` route
- [x] 1.2 Add `requireAdmin` middleware to `GET /admin/troll-keys/analytics` route  
- [x] 1.3 Add `requireAdmin` middleware to `GET /admin/troll-keys/:id/analytics` route
- [x] 1.4 Verify all Troll-Key routes require admin role

## 2. Backend - Data Filtering (CRITICAL)
- [x] 2.1 Create `SafeTrollKey` interface that excludes `apiKey` field
- [x] 2.2 Modify `trollKeyRepository.findAll()` to return `maskedApiKey` instead of `apiKey`
- [x] 2.3 Modify `trollKeyRepository.findById()` to return `maskedApiKey` instead of `apiKey`
- [x] 2.4 Internal method `findHealthy()` kept unchanged (used by GoProxy internally)
- [x] 2.5 Update service layer to use SafeTrollKey type
- [x] 2.6 Only expose full `apiKey` during creation response (show once with warning)

## 3. Frontend - Access Control
- [x] 3.1 Add admin role check to `/troll-keys/page.tsx` - redirect non-admins
- [x] 3.2 N/A - `/troll-keys/layout.tsx` doesn't exist
- [x] 3.3 Remove Troll-Keys section from user dashboard (`page.tsx`) - only fetch/show for admins
- [x] 3.4 Admin dashboard (`admin/page.tsx`) unmodified - already admin-only

## 4. Frontend - Interface Updates
- [x] 4.1 Update `TrollKey` interface to use `maskedApiKey` instead of `apiKey`
- [x] 4.2 Update troll-keys page and dashboard to use `maskedApiKey`
- [x] 4.3 Backend now returns masked keys - removed client-side maskKey calls for Troll-Keys

## 5. Testing and Verification
- [x] 5.1 Backend route protection added - non-admin users will get 403
- [x] 5.2 API responses now return `maskedApiKey` - full `apiKey` never exposed
- [x] 5.3 Troll-keys page has redirect for non-admins
- [x] 5.4 User dashboard no longer shows/fetches Troll-Keys
- [x] 5.5 Admin-only sections show masked Troll-Keys
- [x] 5.6 TypeScript compilation verified for both backend and frontend

## 6. Security Validation
- [x] 6.1 Backend returns `maskedApiKey` only - network requests never contain full Troll-Keys
- [x] 6.2 GoProxy unchanged - correctly uses Troll-Keys internally via `findHealthy()`
- [x] 6.3 Code comments added explaining security architecture
