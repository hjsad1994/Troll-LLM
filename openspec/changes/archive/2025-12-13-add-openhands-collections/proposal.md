# Change: Add OpenHands Collections for Independent Key Management

## Why
The system currently uses `ohmygpt_*` collections (ohmygpt_keys, ohmygpt_backup_keys, ohmygpt_key_bindings) in MongoDB. We need separate `openhands_*` collections (openhands_keys, openhands_backup_keys, openhands_bindings) to independently manage OpenHands keys without affecting the existing OhMyGPT key system. This allows parallel management of two different key pools with identical CRUD capabilities.

## What Changes
- Add new MongoDB collections: `openhands_keys`, `openhands_backup_keys`, `openhands_bindings`
- Update backend service layer to read/write from new `openhands_*` collections instead of `ohmygpt_*`
- Ensure frontend pages at `/openhands-keys`, `/openhands-backup-keys`, and `/admin/bindings` properly connect to the new collections
- Maintain full CRUD operations (Create, Read, Update, Delete) for all three entity types
- Keep existing `ohmygpt_*` collections unchanged for backward compatibility

## Impact
- Affected specs: `openhands-management` (new capability)
- Affected code:
  - `backend/src/services/openhands.service.ts` - change collection names from `ohmygpt_*` to `openhands_*`
  - Frontend pages already exist and connect to correct endpoints
  - No breaking changes to existing functionality
