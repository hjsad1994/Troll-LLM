# Proposal: Add OhMyGPT Keys Management Page

## Summary

Add a keys management page for OhMyGPT provider, identical to the existing OpenHands keys page at `/openhands-keys`. This will allow administrators to CRUD OhMyGPT API keys through the admin dashboard UI.

## Motivation

The OhMyGPT provider was recently implemented (see `add-ohmygpt-provider` change) with full backend support including:
- MongoDB collection `ohmygpt_keys`
- Key pool management with rotation
- Automatic key replacement when primary keys fail

However, the admin UI for managing OhMyGPT keys is missing. Currently there is no way for administrators to:
- View OhMyGPT keys status (healthy/unhealthy)
- Add new OhMyGPT API keys
- Import multiple OhMyGPT keys
- Delete OhMyGPT keys
- Reset key statistics (tokens used, requests count, status)

Adding this UI will provide parity with OpenHands and enable complete OhMyGPT management through the dashboard.

## Proposed Solution

Create a new page `/ohmygpt-keys` that mirrors the existing OpenHands keys page:

1. **Backend Routes** (`/admin/ohmygpt/keys`)
   - GET - List all keys with stats
   - POST - Create new key
   - DELETE `/:id` - Delete key and its bindings
   - POST `/:id/reset` - Reset key statistics
   - GET `/stats` - Get overall statistics

2. **Frontend Page** (`/ohmygpt-keys`)
   - Display key statistics (total, healthy, unhealthy)
   - Table showing all keys with masked API keys
   - Add single key modal
   - Import multiple keys from file
   - Delete/Reset actions with confirmation dialogs
   - Responsive design (desktop table + mobile cards)

3. **Navigation**
   - Add "OhMyGPT Keys" link to admin sidebar
   - Position near OpenHands keys entry for consistency

## Files to Create

- `backend/src/routes/ohmygpt.routes.ts` - Extend existing file with keys routes
- `backend/src/services/ohmygpt.service.ts` - Extend existing service with keys operations
- `frontend/src/app/(dashboard)/ohmygpt-keys/page.tsx` - Keys management UI page

## Files to Modify

- `frontend/src/components/Sidebar.tsx` - Add navigation link
- `frontend/src/lib/i18n.ts` - Add translations (English & Vietnamese)

## Alternatives Considered

**Alternative A: Extend OpenHands page to support multiple providers**
- Create a unified keys page with provider selector
- More complex, less focused
- Rejected: The separate page pattern is simpler and matches existing architecture

**Alternative B: No UI, use MongoDB directly**
- Admins would manage keys via database scripts
- Poor UX, higher error risk
- Rejected: UI is essential for operational management

## Dependencies

- Requires `add-ohmygpt-provider` and `add-ohmygpt-backup-keys-page` changes to be deployed first
- Depends on existing OhMyGPT MongoDB collections:
  - `ohmygpt_keys`
  - `ohmygpt_backup_keys`
  - `ohmygpt_bindings`

## Success Criteria

1. Admin can navigate to `/ohmygpt-keys`
2. Page displays current OhMyGPT keys from MongoDB
3. Admin can add single key via modal
4. Admin can import multiple keys from text file
5. Admin can delete keys with confirmation
6. Admin can reset key statistics (tokens, requests, status)
7. Navigation link appears in admin sidebar
8. Page matches OpenHands keys page styling and behavior

## References

- Existing OpenHands keys implementation:
  - Frontend: `frontend/src/app/(dashboard)/openhands-keys/page.tsx`
  - Backend: `backend/src/routes/openhands.routes.ts` (lines 24-90)
  - Service: `backend/src/services/openhands.service.ts` (lines 1-88)
- OhMyGPT backup keys: `openspec/specs/ohmygpt-backup-keys-ui/spec.md`
- OhMyGPT provider: `goproxy/internal/ohmygpt/`
