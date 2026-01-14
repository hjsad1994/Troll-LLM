# Tasks: Enhance Credits Expiration Datetime Display

## Implementation Tasks

### 1. Create formatDateTimeUTC7 formatter function
- [x] Add new function `formatDateTimeUTC7(dateStr: string | null | undefined): string` in `dashboard/page.tsx` after line 28
- [x] Function SHALL convert date to UTC+7 by adding 7 hours offset
- [x] Function SHALL return format: `DD/MM/YYYY HH:mm:ss` (UTC+7 label removed per user request)
- [x] Function SHALL return `-` if dateStr is null/undefined
- [x] Use zero-padded values for day, month, hours, minutes, seconds

**Validation**: Function returns correct format with UTC+7 offset ✓

### 2. Update creditsNew expiration display
- [x] Replace `formatDateDMY(billingInfo.expiresAtNew)` with `formatDateTimeUTC7(billingInfo.expiresAtNew)` on line 706
- [x] Verify the change is in the "Expires" field of creditsNew Credits Period section
- [x] Confirm "Purchased" field on line 696 still uses `formatDateDMY`

**Validation**: Standard credits expiration shows full datetime with UTC+7 ✓

### 3. Update credits expiration display
- [x] Replace `formatDateDMY(billingInfo.expiresAt)` with `formatDateTimeUTC7(billingInfo.expiresAt)` on line 753
- [x] Verify the change is in the "Expires" field of credits Credits Period section
- [x] Confirm "Purchased" field on line 743 still uses `formatDateDMY`

**Validation**: Premium credits expiration shows full datetime with UTC+7 ✓

### 4. Test responsive display
- [x] Test datetime display on desktop viewport (>= 1024px)
- [x] Test datetime display on tablet viewport (768px)
- [x] Test datetime display on mobile viewport (375px)
- [x] Verify text doesn't overflow container
- [x] Verify readability on both light and dark themes

**Validation**: Datetime displays correctly on all screen sizes ✓

### 5. Verify countdown badge unchanged
- [x] Verify countdown badge for creditsNew still shows "X days / Y days" format
- [x] Verify countdown badge for credits still shows "X/Y" format
- [x] Confirm badge logic on lines 673-690 and 724-736 is unchanged

**Validation**: Countdown badges display as before ✓

## Dependencies

- None - This is a frontend-only change

## Estimated Scope

- **Complexity**: Low
- **Files Modified**: 1 (frontend/src/app/(dashboard)/dashboard/page.tsx)
- **Lines Changed**: ~15 lines (new function + 2 replacements)
- **Testing Required**: Visual testing on multiple viewports

## Implementation Summary

All tasks completed successfully:
- Created `formatDateTimeUTC7()` function with UTC+7 offset conversion
- Updated creditsNew expiration display (line 706)
- Updated credits expiration display (line 753)
- Verified purchased fields and countdown badges remain unchanged
- Format: `DD/MM/YYYY HH:mm:ss` (without UTC+7 label per user feedback)
