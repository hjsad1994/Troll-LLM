# Tasks: Add OhMyGPT Backup Keys Management Page

## Phase 1: Backend Data Layer
- [x] Create `backend/src/services/ohmygpt.service.ts`
  - [x] Define `OhMyGPTBackupKey` interface
  - [x] Implement `listBackupKeys()` function
  - [x] Implement `getBackupKeyStats()` function
  - [x] Implement `createBackupKey(data)` function
  - [x] Implement `deleteBackupKey(id)` function
  - [x] Implement `restoreBackupKey(id)` function
- [x] Verify MongoDB collection `ohmygpt_backup_keys` exists and has indexes

## Phase 2: Backend API Routes
- [x] Create `backend/src/routes/ohmygpt.routes.ts`
  - [x] GET `/admin/ohmygpt/backup-keys` - List keys with stats
  - [x] POST `/admin/ohmygpt/backup-keys` - Create backup key
  - [x] DELETE `/admin/ohmygpt/backup-keys/:id` - Delete backup key
  - [x] POST `/admin/ohmygpt/backup-keys/:id/restore` - Restore backup key
  - [x] Add zod validation schemas
- [x] Register routes in `backend/src/index.ts`
  - [x] Import ohmygpt routes
  - [x] Mount at `/admin/ohmygpt`

## Phase 3: Frontend Page
- [x] Create `frontend/src/app/(dashboard)/ohmygpt-backup-keys/page.tsx`
  - [x] Copy from OpenHands backup keys page template
  - [x] Update API endpoints to use `/admin/ohmygpt/backup-keys`
  - [x] Update translations keys to use `ohmygptBackupKeys.*`
  - [x] Update page title, badge, and descriptions for OhMyGPT
  - [x] Ensure all CRUD operations work correctly
- [x] Test authentication and admin-only access

## Phase 4: Navigation
- [x] Update `frontend/src/components/Sidebar.tsx`
  - [x] Add navigation item for `/ohmygpt-backup-keys`
  - [x] Add key icon (duplicate of OpenHands key icon)
  - [x] Position after OpenHands backup keys entry
- [x] Update `frontend/src/components/LanguageProvider.tsx` (optional)
  - [x] Add `ohmygptBackupKeys` translations
  - [x] Include title, subtitle, button labels, toast messages

## Phase 5: Testing
- [x] Test page loads at `/ohmygpt-backup-keys`
- [x] Test create single backup key
- [x] Test import multiple keys from file
- [x] Test delete backup key with confirmation
- [x] Test restore used backup key
- [x] Verify stats display correctly
- [x] Verify API key masking works (first 8 + last 4 chars)
- [x] Test countdown timer for used keys (12h auto-delete)

## Phase 6: Documentation
- [x] Update any relevant README files
- [x] Add usage examples for OhMyGPT backup key management
