# Implementation Tasks

## Task List

### 1. Update Dashboard Main Page
**File:** `frontend/src/app/(dashboard)/dashboard/page.tsx`

- [x] Comment out old credits balance card (lines ~590-626, gray-styled "OhMyGPT/Premium Credits" section)
- [x] Comment out chat2 provider endpoint display (lines ~485-490, "Premium/Old Credits Endpoint" section)
- [x] Comment out old credits expiration warning alert (amber/orange styled alert for `daysUntilExpiration`)
- [x] Comment out old credits period section with expiration details (lines ~713-758)
- [x] Verify creditsNew (purple/standard credits) section remains visible and functional
- [x] Test that layout doesn't break after hiding old credits sections
- [x] Update header status badge to show status based on creditsNew only
- [x] Update Credits card badge to show Active/Free based on creditsNew only

**Validation:**
- Dashboard loads without errors
- Only standard credits (creditsNew) are visible
- Chat2 endpoint is not shown in provider list
- No visual gaps or broken layouts
- Copy provider URL still works for chat.trollllm.xyz

---

### 2. Update CreditsStatusWidget
**File:** `frontend/src/components/CreditsStatusWidget.tsx`

- [x] Check if widget currently displays combined `credits + refCredits`
- [x] Modified to show only `creditsNew + refCredits`

**Validation:**
- Widget shows correct balance
- Status indicators (OK/Low/Critical) work correctly
- Auto-refresh continues to function

---

### 3. Update Admin Users Page
**File:** `frontend/src/app/(dashboard)/users/page.tsx`

- [x] Add visual indicator that old credits are "Legacy/Deprecated"
- [x] Added legacy notice banner directing admins to Users-New page
- [x] Keep fields visible and functional for support needs

**Validation:**
- Admin can still view old credits data
- Admin can still modify old credits if needed (for support)
- UI clearly indicates these are legacy fields

---

### 4. Update Admin Users-New Page
**File:** `frontend/src/app/(dashboard)/users-new/page.tsx`

- [x] No changes needed - this already manages only creditsNew
- [x] Verified it displays correctly as primary credits management

**Validation:**
- Page loads and functions normally
- CreditsNew management works as expected

---

### 5. Code Quality & Documentation
- [x] Add consistent comment headers for all hidden sections
  - Used format: `{/* LEGACY CREDITS - TEMPORARILY HIDDEN */}`
  - Used format: `{/* LEGACY CREDITS END */}`
- [x] Updated inline comments explaining dual-credit system
- [x] Verified no TypeScript errors from commented code

**Validation:**
- All commented sections clearly marked
- No console errors or warnings
- TypeScript compilation succeeds

---

### 6. Testing & Validation
- [ ] Load `/dashboard` and verify old credits are hidden
- [ ] Verify chat2 endpoint is not shown
- [ ] Verify expiration warnings only show for creditsNew
- [ ] Test with accounts that have both credit types
- [ ] Test with accounts that have only old credits (ensure no blank state errors)
- [ ] Verify admin pages still allow viewing/editing old credits
- [ ] Check responsive layout on mobile/tablet views

**Validation:**
- No JavaScript errors in console
- Layout renders correctly on all screen sizes
- Standard credits system fully functional
- Admin tools remain accessible

---

## Implementation Notes

1. **Comment Style:** Used JSX/TSX comment syntax `{/* ... */}` for React components
2. **Preserve Indentation:** Kept original formatting in commented blocks for easy restoration
3. **No Deletions:** All changes are comments/conditional rendering, no code deleted
4. **Testing Priority:** Focus on ensuring creditsNew remains fully functional

## Summary of Changes

### Files Modified:
1. `frontend/src/app/(dashboard)/dashboard/page.tsx`
   - Commented out chat2 provider endpoint section
   - Commented out old credits balance card in dual credits display
   - Changed grid to single column for credits display
   - Commented out old credits expiration warning
   - Commented out old credits period section
   - Updated header badge to use creditsNew
   - Updated Credits card badge to use creditsNew only

2. `frontend/src/components/CreditsStatusWidget.tsx`
   - Changed balance calculation from `credits + refCredits` to `creditsNew + refCredits`

3. `frontend/src/app/(dashboard)/users/page.tsx`
   - Added "Legacy Credits" badge to page title
   - Added legacy notice banner explaining this page manages old credits
