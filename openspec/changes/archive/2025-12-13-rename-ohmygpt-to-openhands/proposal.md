# Proposal: Rename OhmyGPT to OpenHands

## Summary
Rename all occurrences of "OhmyGPT" to "OpenHands" across the backend, frontend, and Go proxy to reflect the new upstream provider branding. This is a comprehensive renaming effort that preserves all existing functionality including key management, backup key rotation logic, and proxy bindings.

## Context
The system currently uses "OhmyGPT" terminology for:
- API endpoints (`/admin/ohmygpt/*`)
- Frontend routes (`/ohmygpt-keys`, `/ohmygpt-backup-keys`)
- Database collections and field names (`ohmygptKeyId`)
- UI labels and navigation items
- Go package names and internal identifiers

This needs to be changed to "OpenHands" to align with the upstream provider's branding while maintaining full backward compatibility for the backup key rotation logic that automatically activates backup keys when primary keys fail (401/402/403 errors).

## Goals
- Rename all user-facing terminology from "OhmyGPT" to "OpenHands"
- Update API endpoints: `/admin/ohmygpt/*` → `/admin/openhands/*`
- Update frontend routes: `/ohmygpt-keys` → `/openhands-keys`, `/ohmygpt-backup-keys` → `/openhands-backup-keys`
- Rename `/admin/bindings` display labels to reflect OpenHands
- Update database field names: `ohmygptKeyId` → `openhandsKeyId`
- Update Go package: `internal/ohmygpt` → `internal/openhands`
- Preserve all existing functionality including backup key rotation logic
- Maintain data consistency during migration

## Non-Goals
- Changing the underlying architecture or logic
- Adding new features beyond the rename
- Breaking backward compatibility without migration strategy

## Impacted Areas

### Backend (`/backend`)
- **Routes**: `src/routes/ohmygpt.routes.ts` → rename file and update all endpoints
- **Services**: `src/services/ohmygpt.service.ts` → rename file and update function names
- **Database**: Update field names in bindings collection
- **API Endpoints**: All `/admin/ohmygpt/*` endpoints

### Frontend (`/frontend`)
- **Pages**:
  - `src/app/(dashboard)/ohmygpt-keys/page.tsx` → move to `/openhands-keys/`
  - `src/app/(dashboard)/ohmygpt-backup-keys/` → move to `/openhands-backup-keys/`
  - `src/app/(dashboard)/admin/bindings/page.tsx` → update labels
- **Navigation**: `src/components/Sidebar.tsx` → update nav items
- **Translations**: `src/lib/i18n.ts` → update translation keys

### Go Proxy (`/goproxy`)
- **Package**: `internal/ohmygpt/` → rename directory to `internal/openhands/`
- **Files**: All files in the package (`ohmygpt.go`, `backup.go`, `types.go`, `registry.go`)
- **Imports**: Update import paths across `main.go` and other files

### Database
- **Collections**: Potentially rename collections or add migration
- **Field Names**: Update `ohmygptKeyId` → `openhandsKeyId` in bindings

## Migration Strategy
1. Update Go proxy package and rebuild
2. Update backend routes, services, and models
3. Run database migration script to rename fields (or support both old/new field names temporarily)
4. Update frontend routes and components
5. Update all translation strings
6. Test end-to-end flow including backup key rotation

## Success Criteria
- All API endpoints respond with new `/admin/openhands/*` paths
- Frontend routes work with `/openhands-keys` and `/openhands-backup-keys`
- Bindings page displays "OpenHands" labels
- Navigation sidebar shows "OpenHands Keys" and "OpenHands Backup Keys"
- Backup key rotation logic continues to work when primary keys fail
- No broken links or references to old "OhmyGPT" terminology
- Database queries work with renamed fields
- Go proxy successfully loads and uses the renamed package

## Rollout Plan
1. Scaffold proposal and get approval
2. Implement changes in sequence: Go proxy → Backend → Database → Frontend
3. Test each layer before proceeding to next
4. Deploy with monitoring for any issues
