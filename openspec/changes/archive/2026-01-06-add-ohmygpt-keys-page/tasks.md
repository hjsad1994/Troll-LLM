# Tasks: Add OhMyGPT Keys Management Page

## Phase 1: Extend Backend Data Layer
- [x] Extend `backend/src/services/ohmygpt.service.ts`
  - [x] Add `OhMyGPTKey` interface (with status, tokensUsed, requestsCount)
  - [x] Implement `listKeys()` function
  - [x] Implement `getKey(id)` function
  - [x] Implement `createKey(data)` function
  - [x] Implement `updateKey(id, data)` function
  - [x] Implement `deleteKey(id)` function (with bindings cleanup)
  - [x] Implement `resetKeyStats(id)` function
  - [x] Implement `getStats()` function

## Phase 2: Extend Backend API Routes
- [x] Extend `backend/src/routes/ohmygpt.routes.ts`
  - [x] GET `/admin/ohmygpt/keys` - List keys with stats
  - [x] POST `/admin/ohmygpt/keys` - Create key
  - [x] DELETE `/admin/ohmygpt/keys/:id` - Delete key
  - [x] POST `/admin/ohmygpt/keys/:id/reset` - Reset key stats
  - [x] GET `/admin/ohmygpt/stats` - Get overall stats

## Phase 3: Create Frontend Page
- [x] Create `frontend/src/app/(dashboard)/ohmygpt-keys/page.tsx`
  - [x] Copy from OpenHands keys page template
  - [x] Update API endpoints to use `/admin/ohmygpt/keys`
  - [x] Update page title, descriptions, and branding for OhMyGPT
  - [x] Use emerald/green color scheme (matching backup keys page)
  - [x] Ensure all CRUD operations work correctly
  - [x] Implement responsive design (table + mobile cards)
- [x] Test authentication and admin-only access

## Phase 4: Update Navigation
- [x] Update `frontend/src/components/Sidebar.tsx`
  - [x] Add navigation item for `/ohmygpt-keys`
  - [x] Add key icon (same as OpenHands)
  - [x] Position before OpenHands keys (alphabetical order)

## Phase 5: Add Translations
- [x] Update `frontend/src/lib/i18n.ts`
  - [x] Add `ohmygptKeys` translations (sidebar)
  - [x] Add full page translations for English
  - [x] Add full page translations for Vietnamese
  - [x] Include title, button labels, toast messages, table headers

## Phase 6: Testing
- [x] Test page loads at `/ohmygpt-keys`
- [x] Test create single key
- [x] Test import multiple keys from file
- [x] Test delete key with confirmation
- [x] Test reset key statistics
- [x] Verify stats display correctly (total, healthy, unhealthy)
- [x] Verify API key masking works (first 8 + last 4 chars)
- [x] Test responsive design on mobile
- [x] Verify status badges (healthy vs unhealthy)

## Phase 7: Documentation
- [x] Update any relevant README files
- [x] Add usage examples for OhMyGPT key management
