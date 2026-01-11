# Implementation Tasks

## Phase 1: Backend API Updates
- [x] 1. **Update user profile API response**
   - Add `creditsNew` field to `GET /api/users/profile` response
   - Add `tokensUserNew` field to response
   - Verify backend already has these fields in the `usersNew` model (✓ confirmed)
   - **Validation**: Test API endpoint returns `creditsNew` field

- [x] 2. **Update billing info API response (if applicable)**
   - Check if `GET /api/users/billing` needs `creditsNew` field
   - Add if needed for consistency
   - **Validation**: Test billing endpoint returns correct data structure

## Phase 2: Frontend Type Definitions
- [x] 3. **Update TypeScript interfaces**
   - Add `creditsNew: number` to `UserProfile` interface in `frontend/src/lib/api.ts`
   - Add `tokensUserNew: number` to `UserProfile` interface
   - Add `creditsNew: number` to `BillingInfo` interface (if needed)
   - **Validation**: TypeScript compilation succeeds without errors

## Phase 3: Dashboard UI Implementation
- [x] 4. **Redesign Credits card layout**
   - Update `frontend/src/app/(dashboard)/dashboard/page.tsx`
   - Split the single credits display into two sections:
     - OhMyGPT Credits (Premium) - using `credits` field
     - OpenHands Credits (Standard) - using `creditsNew` field
   - Use a two-column grid or stacked layout
   - **Validation**: Both balances visible on dashboard

- [x] 5. **Add visual differentiation**
   - Add distinct icons or color schemes for each credit type
   - Add labels: "Premium Credits (OhMyGPT)" and "Standard Credits (OpenHands)"
   - Add rate information: "2500 VND/$1" for Premium, "1500 VND/$1" for Standard
   - **Validation**: Visual distinction clear between credit types

- [x] 6. **Add creditsNew display with USD formatting**
   - Display `creditsNew` value using `toFixed(2)` for consistent USD format
   - Match existing credits display pattern: `${(userProfile.creditsNew || 0).toFixed(2)}`
   - **Validation**: creditsNew displays as "$X.XX"

- [x] 7. **Update Credits card header/description**
   - Update card description to indicate it shows both credit types
   - Ensure subtitle explains the dual-balance system
   - **Validation**: User understands both balances are shown

## Phase 4: Responsive Design
- [x] 8. **Test responsive layout**
   - Verify two-column layout works on desktop (md: breakpoint)
   - Verify stacked layout works on mobile
   - Ensure both balances remain readable at all screen sizes
   - **Validation**: Dashboard responsive across screen sizes

## Phase 5: Internationalization (i18n)
- [x] 9. **Add translation keys for creditsNew labels**
   - Add translation keys to `frontend/src/lib/i18n.ts`
   - Add English labels: "Premium Credits", "Standard Credits", "OpenHands Credits", etc.
   - Add Vietnamese labels if needed
   - **Validation**: Labels display correctly in all languages

## Phase 6: Testing & Verification
- [ ] 10. **Test with real user data**
    - Test with user having both `credits` and `creditsNew` > 0
    - Test with user having only `credits` > 0, `creditsNew` = 0
    - Test with user having only `creditsNew` > 0, `credits` = 0
    - Test with user having both = 0
    - **Validation**: All scenarios display correctly

- [ ] 11. **Verify API-UI data flow**
    - Confirm `getUserProfile()` returns `creditsNew`
    - Confirm dashboard reads and displays `userProfile.creditsNew`
    - Verify no console errors
    - **Validation**: Data flows correctly from backend to UI

- [ ] 12. **Cross-browser testing**
    - Test on Chrome, Firefox, Safari, Edge
    - Verify formatting and layout consistency
    - **Validation**: Works across major browsers

## Notes
- The backend already has `creditsNew` and `tokensUserNew` fields in the `usersNew` model (confirmed in `backend/src/models/user-new.model.ts:27,57`)
- Payment service already adds credits to `creditsNew` (confirmed in `backend/src/services/payment.service.ts:282`)
- No changes needed to billing/routing logic (already implemented in archived changes)
- Focus is purely on exposing existing backend data to the frontend UI

## Implementation Summary
✅ **Completed**:
- Backend API updated to return `creditsNew` and `tokensUserNew` fields in UserProfile and BillingInfo interfaces
- Frontend TypeScript interfaces updated to include new fields
- Dashboard UI redesigned with dual-credit display showing both Premium (OhMyGPT) and Standard (OpenHands) credits
- Visual differentiation added with distinct colors (violet for Premium, emerald for Standard) and icons
- Responsive grid layout implemented (2 columns on desktop, stacked on mobile)
- Internationalization keys added for both English and Vietnamese
- Active status badge now checks both credit balances

⏳ **Pending User Testing**:
- Manual testing with real user data across different scenarios
- API-UI data flow verification
- Cross-browser compatibility testing

