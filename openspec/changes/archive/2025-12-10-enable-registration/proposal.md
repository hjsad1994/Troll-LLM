# Change: Enable User Registration & Remove Referral System

## Why
1. The registration page at `/register` is currently disabled - users cannot create new accounts
2. The referral system is no longer needed and should be removed to simplify the platform

## What Changes

### 1. Enable Registration (Frontend)
- Re-enable all form inputs (username, password, confirm password) on `/register`
- Enable the submit button with proper form submission
- Remove referral code (`ref`) parameter support from registration

### 2. Remove Referral System
- **BREAKING**: Remove `/referral` page from dashboard
- **BREAKING**: Remove referral link from Sidebar navigation
- Remove referral-related API calls and types from frontend
- Remove referral i18n strings
- Remove `ref` parameter handling from registration flow

## Impact
- Affected specs:
  - `user-dashboard` (add registration requirement)
  - `payment` (remove referral requirements)
- Affected code:
  - `frontend/src/app/register/page.tsx` - Enable form, remove ref handling
  - `frontend/src/app/(dashboard)/referral/page.tsx` - Delete file
  - `frontend/src/components/Sidebar.tsx` - Remove referral nav item
  - `frontend/src/lib/api.ts` - Remove referral API functions
  - `frontend/src/lib/i18n.ts` - Remove referral strings
