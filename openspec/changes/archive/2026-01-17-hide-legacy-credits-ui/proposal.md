# Proposal: Hide Legacy Credits UI

## Change ID
`hide-legacy-credits-ui`

## Status
Draft

## Overview
Temporarily disable (comment out) UI elements in the dashboard related to the old/legacy credits system, chat2 provider endpoint, and old credit expiration dates. This is a UI-only change to hide these features from users while keeping the backend functionality intact for future re-enablement.

## Motivation
The platform currently displays two parallel credit systems (new/standard and old/premium) which may cause user confusion. Temporarily hiding the legacy system's UI components will:
- Simplify the user experience by showing only the active credit system
- Reduce visual clutter on the dashboard
- Maintain backend compatibility for easy rollback if needed
- Keep the codebase ready for potential future re-enablement

## Objectives
1. Hide old credits balance display (`credits` field) from user dashboard
2. Hide chat2.trollllm.xyz provider endpoint section
3. Hide old credit expiration date displays and warnings
4. Preserve all UI code via comments (not deletion) for easy restoration
5. Ensure creditsNew (standard credits) system remains fully functional

## Scope

### In Scope
- Dashboard main page (`/dashboard`) - comment out old credits display sections
- Admin users management pages - mark legacy credit fields as hidden/deprecated in UI
- Credit expiration warnings - hide alerts for old credits only
- Chat2 provider endpoint display - comment out entire section

### Out of Scope
- Backend API endpoints (keep all `/api/*` routes functional)
- Database models and schemas (no data migration)
- Go proxy functionality (chat2.trollllm.xyz remains operational)
- Admin functionality to manually manage old credits (keep for support needs)
- Deletion of any code (only commenting/conditional rendering)

## Dependencies
None - this is a frontend-only change with no external dependencies.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users with existing old credits lose visibility | Medium | Keep admin tools functional to manually check/manage old credits |
| Accidental deletion instead of commenting | High | Code review to verify all changes use comments, not deletions |
| Breaking creditsNew display | High | Test thoroughly that standard credits remain visible |

## Success Criteria
- Old credits balance is not visible on `/dashboard`
- Chat2 provider section is hidden from endpoint list
- Old credit expiration warnings do not appear
- CreditsNew system displays correctly without changes
- Admin can still view/modify old credits in admin panels
- All commented code is clearly marked with consistent comment style
- No console errors or broken layouts

## Rollback Plan
Uncomment all marked sections to restore full dual-credits UI. All functionality remains in the codebase.
