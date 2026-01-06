# Proposal: Add OhMyGPT Key Bindings Management

## Summary

Add a key bindings management page for OhMyGPT provider, identical to the existing OpenHands bindings page at `/admin/bindings`. This will allow administrators to manage proxy-to-key mappings for OhMyGPT with priority-based assignment and auto-repair functionality.

## Motivation

The OhMyGPT provider was recently implemented with:
- MongoDB collection `ohmygpt_keys` for API keys
- MongoDB collection `ohmygpt_bindings` for proxy-key mappings
- GoProxy integration in `goproxy/internal/ohmygpt/`

However, the admin UI for managing OhMyGPT bindings is missing. Currently there is no way for administrators to:
- View OhMyGPT proxy-key bindings
- Create new bindings between proxies and OhMyGPT keys
- Edit binding priorities
- Delete bindings
- Auto-repair orphaned bindings (when referenced keys are deleted)

Adding this UI will provide parity with OpenHands and enable complete OhMyGPT binding management through the dashboard.

## Proposed Solution

Create a new bindings management section for OhMyGPT that mirrors the OpenHands bindings implementation:

1. **Backend Extensions** (`/admin/ohmygpt/bindings`)
   - GET - List all bindings with auto-repair
   - POST - Create binding between proxy and key
   - PATCH - Update binding priority
   - DELETE `/:proxyId/:keyId` - Delete specific binding
   - DELETE `/:proxyId` - Delete all bindings for a proxy
   - GET `/:proxyId` - Get bindings for specific proxy

2. **Frontend Page** (`/admin/ohmygpt-bindings`)
   - Display statistics (keys, bindings, proxies)
   - Group bindings by proxy with priority sorting
   - Create binding modal (proxy + key + priority)
   - Edit binding modal
   - Delete binding with confirmation
   - Auto-repair orphaned bindings

3. **Navigation**
   - Add "OhMyGPT Bindings" link to admin sidebar
   - Position near OpenHands bindings entry

## Files to Create

- `backend/src/routes/ohmygpt-bindings.routes.ts` - Dedicated bindings API routes
- `backend/src/services/ohmygpt-bindings.service.ts` - Bindings data layer
- `frontend/src/app/(dashboard)/admin/ohmygpt-bindings/page.tsx` - Bindings UI page

## Files to Modify

- `backend/src/index.ts` - Register OhMyGPT bindings routes
- `frontend/src/components/Sidebar.tsx` - Add navigation link
- `frontend/src/lib/i18n.ts` - Add translations (English & Vietnamese)

## Alternatives Considered

**Alternative A: Extend OpenHands bindings page to support multiple providers**
- Add provider selector to existing bindings page
- More complex UI changes required
- Rejected: The separate page pattern is simpler and matches existing architecture

**Alternative B: No UI, use MongoDB directly**
- Admins would manage bindings via database scripts
- Poor UX, higher error risk
- Rejected: UI is essential for operational management

## Dependencies

- Requires `add-ohmygpt-provider`, `add-ohmygpt-backup-keys-page`, and `add-ohmygpt-keys-page` changes
- Depends on existing OhMyGPT MongoDB collections:
  - `ohmygpt_keys`
  - `ohmygpt_bindings`
  - `ohmygpt_backup_keys`
- Depends on shared `proxies` collection

## Success Criteria

1. Admin can navigate to `/admin/ohmygpt-bindings`
2. Page displays current OhMyGPT bindings grouped by proxy
3. Admin can create binding between proxy and key with priority
4. Admin can edit binding priority
5. Admin can delete bindings with confirmation
6. Orphaned bindings are auto-repaired or detected
7. Navigation link appears in admin sidebar
8. Page matches OpenHands bindings page styling and behavior

## References

- Existing OpenHands bindings implementation:
  - Frontend: `frontend/src/app/(dashboard)/admin/bindings/page.tsx`
  - Backend: `backend/src/routes/openhands.routes.ts` (lines 94-244)
  - Service: `backend/src/services/openhands.service.ts` (bindings functions)
- OhMyGPT provider: `goproxy/internal/ohmygpt/`
