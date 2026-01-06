# Tasks: Add OhMyGPT Key Bindings Management

## Phase 1: Create Backend Bindings Service
- [x] Create `backend/src/services/ohmygpt-bindings.service.ts` (added to existing ohmygpt.service.ts)
  - [x] Define `OhMyGPTBinding` interface
  - [x] Implement `listBindings()` function
  - [x] Implement `getBindingsForProxy(proxyId)` function
  - [x] Implement `createBinding(data)` function
  - [x] Implement `updateBinding(proxyId, keyId, data)` function
  - [x] Implement `deleteBinding(proxyId, keyId)` function
  - [x] Implement `deleteAllBindingsForProxy(proxyId)` function
  - [x] Implement `repairBindings()` function for auto-repair

## Phase 2: Create Backend Bindings Routes
- [x] Create `backend/src/routes/ohmygpt-bindings.routes.ts` (added to existing ohmygpt.routes.ts)
  - [x] GET `/admin/ohmygpt/bindings` - List all bindings with auto-repair
  - [x] POST `/admin/ohmygpt/bindings` - Create binding
  - [x] PATCH `/admin/ohmygpt/bindings/:proxyId/:keyId` - Update binding
  - [x] DELETE `/admin/ohmygpt/bindings/:proxyId/:keyId` - Delete binding
  - [x] DELETE `/admin/ohmygpt/bindings/:proxyId` - Delete all bindings for proxy
  - [x] GET `/admin/ohmygpt/bindings/:proxyId` - Get bindings for proxy
  - [x] Add zod validation schemas

## Phase 3: Register Routes
- [x] Update `backend/src/index.ts`
  - [x] Import ohmygpt routes (already imported)
  - [x] Mount at `/admin/ohmygpt` (already mounted)

## Phase 4: Create Frontend Bindings Page
- [x] Create `frontend/src/app/(dashboard)/admin/ohmygpt-bindings/page.tsx`
  - [x] Copy from OpenHands bindings page template
  - [x] Update API endpoints to use `/admin/ohmygpt/bindings`
  - [x] Update page title, descriptions for OhMyGPT
  - [x] Implement grouped bindings display by proxy
  - [x] Implement create/edit/delete modals
  - [x] Implement auto-repair functionality

## Phase 5: Update Navigation
- [x] Update `frontend/src/components/Sidebar.tsx`
  - [x] Add navigation item for `/admin/ohmygpt-bindings`
  - [x] Add link icon (same as OpenHands bindings)
  - [x] Position near OpenHands bindings entry

## Phase 6: Add Translations
- [x] Update `frontend/src/lib/i18n.ts`
  - [x] Add `ohmygptBindings` translations (sidebar)
  - [x] Add full page translations for English
  - [x] Add full page translations for Vietnamese
  - [x] Include all UI labels and messages

## Phase 7: Testing
- [ ] Test page loads at `/admin/ohmygpt-bindings`
- [ ] Test create binding between proxy and key
- [ ] Test edit binding priority
- [ ] Test delete binding with confirmation
- [ ] Test delete all bindings for proxy
- [ ] Verify auto-repair functionality
- [ ] Verify grouped display by proxy
- [ ] Verify priority sorting within groups

## Phase 8: Documentation
- [ ] Update any relevant README files
- [ ] Document OhMyGPT bindings management
