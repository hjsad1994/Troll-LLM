# Change: Audit and Fix Troll-Key Security Architecture

## Why

The security architecture requires that Troll-Keys (upstream API keys) remain completely hidden from users. Users should only interact with the system through their own User API keys. However, the current implementation has **CRITICAL** security violations:

1. **Troll-Key API endpoint is NOT admin-only** - Any authenticated user can call `GET /admin/troll-keys` and receive full Troll-Key data
2. **Full `apiKey` field exposed** - The backend returns complete Troll-Keys including the sensitive `apiKey` value in API responses
3. **Frontend accessible to non-admins** - The `/troll-keys` page doesn't restrict access, and dashboards display Troll-Key data to all users
4. **Client-side masking only** - Troll-Keys are only masked in the UI (`maskApiKey()`), but full values are transmitted over the network

## What Changes

### Backend Fixes (CRITICAL)
- **BREAKING**: Add `requireAdmin` middleware to all Troll-Key read routes
- Modify `trollKeyRepository.findAll()` to exclude `apiKey` field from responses
- Create a separate admin-only method that returns full Troll-Key data (for creation/management only)
- Never return the `apiKey` field in any list/get response - only return a masked version

### Frontend Fixes
- Add admin role check to `/troll-keys` page - redirect non-admins
- Remove Troll-Keys display from user dashboard (`/dashboard/page.tsx`)
- Keep Troll-Keys display only in admin dashboard for admin users
- Update interfaces to expect `maskedApiKey` instead of `apiKey`

### Summary of Violations Found

| Location | Severity | Issue |
|----------|----------|-------|
| `admin.routes.ts:22` | CRITICAL | `GET /admin/troll-keys` has no role check |
| `troll-key.repository.ts:5-7` | CRITICAL | Returns full `apiKey` in queries |
| `frontend/troll-keys/page.tsx` | HIGH | No admin-only access control |
| `frontend/page.tsx:102-103` | MEDIUM | User dashboard fetches Troll-Keys |
| `frontend/admin/page.tsx` | LOW | Displays masked keys (acceptable for admins) |

## Impact
- Affected specs: `api-proxy`
- Affected code:
  - `backend/src/routes/admin.routes.ts` - Add role protection
  - `backend/src/repositories/troll-key.repository.ts` - Filter `apiKey` field
  - `backend/src/services/trollkey.service.ts` - Add safe list method
  - `backend/src/dtos/troll-key.dto.ts` - Add safe response DTO
  - `frontend/src/app/(dashboard)/troll-keys/page.tsx` - Add admin check
  - `frontend/src/app/(dashboard)/page.tsx` - Remove Troll-Keys for users
  - `frontend/src/lib/api.ts` - Update TrollKey interface
