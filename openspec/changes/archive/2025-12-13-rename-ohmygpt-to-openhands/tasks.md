# Tasks: Rename OhmyGPT to OpenHands

## Implementation Sequence

### 1. Backend API Routes & Services
- [x] 1.1 Rename `backend/src/routes/ohmygpt.routes.ts` to `openhands.routes.ts`
- [x] 1.2 Update all route paths: `/admin/ohmygpt/*` → `/admin/openhands/*`
- [x] 1.3 Rename `backend/src/services/ohmygpt.service.ts` to `openhands.service.ts`
- [x] 1.4 Update service function names and exported symbols
- [x] 1.5 Update imports in `backend/src/index.ts` to use new route file
- [x] 1.6 Update Zod schema variable names (`createBindingSchema.ohmygptKeyId` → `openhandsKeyId`)

### 2. Database Schema Updates
- [x] 2.1 Update field names in bindings collection: `ohmygptKeyId` → `openhandsKeyId`
- [x] 2.2 Create database migration script (if needed) to rename existing data
- [x] 2.3 Update all database queries to use new field name
- [x] 2.4 Test backward compatibility or dual-field support during transition

### 3. Go Proxy Package Rename
- [x] 3.1 Rename `goproxy/internal/ohmygpt/` directory to `internal/openhands/`
- [x] 3.2 Update package declaration in all files: `package ohmygpt` → `package openhands`
- [x] 3.3 Update imports in `goproxy/main.go`: `goproxy/internal/ohmygpt` → `goproxy/internal/openhands`
- [x] 3.4 Update all function calls and references to use new package name
- [x] 3.5 Update log messages: "OhmyGPT" → "OpenHands"
- [x] 3.6 Rebuild Go proxy and verify compilation

### 4. Frontend Route Migration
- [x] 4.1 Rename directory: `frontend/src/app/(dashboard)/ohmygpt-keys/` → `openhands-keys/`
- [x] 4.2 Rename directory: `frontend/src/app/(dashboard)/ohmygpt-backup-keys/` → `openhands-backup-keys/`
- [x] 4.3 Update layout files if any (`layout.tsx`) in renamed directories
- [x] 4.4 Update API fetch paths in page components: `/admin/ohmygpt/*` → `/admin/openhands/*`
- [x] 4.5 Update all UI text: "OhmyGPT" → "OpenHands"

### 5. Navigation & Sidebar Updates
- [x] 5.1 Update `frontend/src/components/Sidebar.tsx` nav items:
  - `/ohmygpt-keys` → `/openhands-keys`
  - `/ohmygpt-backup-keys` → `/openhands-backup-keys`
- [x] 5.2 Update labelKeys: `ohmygptKeys` → `openhandsKeys`, `ohmygptBackupKeys` → `openhandsBackupKeys`
- [x] 5.3 Update admin bindings page labels to show "OpenHands" terminology

### 6. Translations & i18n
- [x] 6.1 Update `frontend/src/lib/i18n.ts` translation keys:
  - `ohmygptKeys` → `openhandsKeys`
  - `ohmygptBackupKeys` → `openhandsBackupKeys`
- [x] 6.2 Update all translation strings in both English and Vietnamese
- [x] 6.3 Update usage references in components

### 7. Bindings Page Updates
- [x] 7.1 Update `frontend/src/app/(dashboard)/admin/bindings/page.tsx`
- [x] 7.2 Rename interface field: `ohmygptKeyId` → `openhandsKeyId`
- [x] 7.3 Update form fields and validation in binding forms
- [x] 7.4 Update all display labels and section titles: "OhmyGPT" → "OpenHands"
- [x] 7.5 Update API endpoints called from this page

### 8. Testing & Verification
- [ ] 8.1 Test all API endpoints respond correctly: GET, POST, DELETE, PATCH on `/admin/openhands/*`
- [ ] 8.2 Verify frontend routes work: navigate to `/openhands-keys` and `/openhands-backup-keys`
- [ ] 8.3 Test key creation, deletion, and stats reset
- [ ] 8.4 Test backup key creation, deletion, and restore functionality
- [ ] 8.5 Test bindings CRUD operations on `/admin/bindings`
- [ ] 8.6 Verify backup key auto-rotation logic still works when keys fail (401/402/403)
- [ ] 8.7 Test reload functionality on bindings page
- [ ] 8.8 Check Go proxy logs for correct "OpenHands" references
- [ ] 8.9 Verify database queries and field names are correct
- [ ] 8.10 Test navigation links in sidebar

### 9. Documentation & Cleanup
- [ ] 9.1 Search codebase for any remaining "ohmygpt" references: `grep -ri "ohmygpt" --exclude-dir=node_modules`
- [ ] 9.2 Update any remaining comments or documentation
- [ ] 9.3 Update OpenSpec archived proposals if they reference OhmyGPT
- [ ] 9.4 Verify all imports and dependencies are correct

## Dependencies
- Tasks 1.x must complete before 7.x (bindings page depends on backend routes)
- Tasks 3.x must complete before backend testing (Go proxy must be rebuilt)
- Tasks 4.x, 5.x, 6.x can run in parallel after 1.x completes
- Task 8.x (testing) depends on completion of all implementation tasks

## Validation
After all tasks complete:
1. Full end-to-end flow test: Create key → Create backup key → Create binding → Test rotation
2. Verify no "OhmyGPT" strings remain in user-facing text
3. Check browser console for any 404s or broken API calls
4. Monitor Go proxy logs during test requests
