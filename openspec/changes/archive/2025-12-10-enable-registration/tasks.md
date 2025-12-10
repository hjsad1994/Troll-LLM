## 1. Enable Registration Form
- [x] 1.1 Remove `disabled` attribute from username input field
- [x] 1.2 Remove `disabled` attribute from password input field
- [x] 1.3 Remove `disabled` attribute from confirm password input field
- [x] 1.4 Change submit button from `type="button"` to `type="submit"`
- [x] 1.5 Remove `disabled` attribute and update button styling from gray to indigo
- [x] 1.6 Update button text to use proper submit label
- [x] 1.7 Remove `refCode` state and `useEffect` for ref parameter
- [x] 1.8 Remove `ref` parameter from `register()` API call

## 2. Remove Referral Page
- [x] 2.1 Delete `frontend/src/app/(dashboard)/referral/page.tsx`

## 3. Remove Referral from Sidebar
- [x] 3.1 Remove referral nav item from `userNavItems` array in `Sidebar.tsx`

## 4. Remove Referral API Functions
- [x] 4.1 Remove `getReferralInfo` function from `api.ts`
- [x] 4.2 Remove `getReferralStats` function from `api.ts`
- [x] 4.3 Remove `getReferredUsers` function from `api.ts`
- [x] 4.4 Remove `ReferralInfo`, `ReferralStats`, `ReferredUser` types from `api.ts`
- [x] 4.5 Remove `ref` parameter from `register()` function signature

## 5. Remove Referral i18n Strings
- [x] 5.1 Remove `referral` key from sidebar translations in `i18n.ts`
- [x] 5.2 Remove `dashboard.referral` object from all language translations

## 6. Verification
- [ ] 6.1 Test registration with valid credentials
- [ ] 6.2 Test password validation (min 6 characters)
- [ ] 6.3 Test password confirmation mismatch error
- [ ] 6.4 Test duplicate username error handling
- [ ] 6.5 Verify `/referral` returns 404
- [ ] 6.6 Verify Sidebar no longer shows Referral link
