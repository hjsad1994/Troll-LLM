# Proposal: Add OhMyGPT Backup Keys Management Page

## Summary

Add a backup keys management page for OhMyGPT provider, identical to the existing OpenHands backup keys page at `/openhands-backup-keys`. This will allow administrators to CRUD OhMyGPT backup keys through the admin dashboard UI.

## Motivation

The OhMyGPT provider was recently implemented (see `add-ohmygpt-provider` change) with full backend support including:
- MongoDB collection `ohmygpt_backup_keys`
- Backup key rotation logic in `goproxy/internal/ohmygpt/backup.go`
- Automatic key replacement when primary keys fail

However, the admin UI is missing. Currently there is no way for administrators to:
- View OhMyGPT backup keys status
- Add new OhMyGPT backup keys
- Import multiple OhMyGPT backup keys
- Delete OhMyGPT backup keys
- Restore used OhMyGPT backup keys

Adding this UI will provide parity with OpenHands and enable complete OhMyGPT management through the dashboard.

## Proposed Solution

Create a new page `/ohmygpt-backup-keys` that mirrors the existing OpenHands backup keys page:

1. **Backend Routes** (`/admin/ohmygpt/backup-keys`)
   - GET - List all backup keys with stats
   - POST - Create new backup key
   - DELETE `/:id` - Delete backup key
   - POST `/:id/restore` - Restore used backup key

2. **Frontend Page** (`/ohmygpt-backup-keys`)
   - Display backup key statistics (total, available, used)
   - Table showing all backup keys with masked API keys
   - Add single key modal
   - Import multiple keys from file
   - Delete/Restore actions with confirmation dialogs
   - Auto-deletion countdown for used keys

3. **Navigation**
   - Add "OhMyGPT Backup Keys" link to admin sidebar
   - Position near OpenHands entries for consistency

## Files to Create

- `backend/src/routes/ohmygpt.routes.ts` - OhMyGPT API routes
- `backend/src/services/ohmygpt.service.ts` - OhMyGPT data layer
- `frontend/src/app/(dashboard)/ohmygpt-backup-keys/page.tsx` - Backup keys UI page

## Files to Modify

- `frontend/src/components/Sidebar.tsx` - Add navigation link
- `frontend/src/components/LanguageProvider.tsx` - Add translations (optional)
- `backend/src/index.ts` - Register OhMyGPT routes

## Alternatives Considered

**Alternative A: Extend OpenHands page to support multiple providers**
- Create a unified backup keys page with provider selector
- More complex, less focused
- Rejected: The separate page pattern is simpler and matches existing architecture

**Alternative B: No UI, use MongoDB directly**
- Admins would manage keys via database scripts
- Poor UX, higher error risk
- Rejected: UI is essential for operational management

## Dependencies

- Requires `add-ohmygpt-provider` change to be deployed first
- Depends on existing OhMyGPT MongoDB collections:
  - `ohmygpt_backup_keys`
  - `ohmygpt_keys`

## Success Criteria

1. Admin can navigate to `/ohmygpt-backup-keys`
2. Page displays current OhMyGPT backup keys from MongoDB
3. Admin can add single backup key via modal
4. Admin can import multiple keys from text file
5. Admin can delete backup keys with confirmation
6. Admin can restore used backup keys
7. Navigation link appears in admin sidebar
8. Page matches OpenHands backup keys page styling and behavior

## References

- Existing OpenHands backup keys implementation:
  - Frontend: `frontend/src/app/(dashboard)/openhands-backup-keys/page.tsx`
  - Backend: `backend/src/routes/openhands.routes.ts` (lines 259-346)
  - Service: `backend/src/services/openhands.service.ts` (lines 150-199)
- OhMyGPT provider: `goproxy/internal/ohmygpt/`
