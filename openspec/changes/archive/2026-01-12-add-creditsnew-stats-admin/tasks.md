# Tasks: Add CreditsNew Stats to Admin Dashboard

## Backend Tasks

- [x] **Update userRepository.getUserStats() aggregation**
  - Location: `backend/src/repositories/user.repository.ts`
  - Add `totalCreditsNew: { $sum: '$creditsNew' }` to the `$group` aggregation stage
  - Add `totalCreditsNewUsed: { $sum: '$creditsNewUsed' }` to the `$group` aggregation stage
  - Update return type to include `totalCreditsNew: number` and `totalCreditsNewUsed: number`
  - Include fallback values (|| 0) for both fields in the return object

- [x] **Update /admin/user-stats API response**
  - Location: `backend/src/routes/admin.routes.ts` (line 24-42)
  - Add `total_creditsNew` field to response JSON using `stats.totalCreditsNew`
  - Add `total_creditsNewUsed` field to response JSON using `stats.totalCreditsNewUsed`
  - Verify response structure matches frontend expectations

## Frontend Tasks

- [x] **Update UserStats TypeScript interface**
  - Location: `frontend/src/app/(dashboard)/admin/page.tsx` (line 31-39)
  - Add `total_creditsNew: number` property to interface
  - Add `total_creditsNewUsed: number` property to interface

- [x] **Update userStats state initialization**
  - Location: `frontend/src/app/(dashboard)/admin/page.tsx` (line 154)
  - Add `total_creditsNew: 0` to default state object
  - Add `total_creditsNewUsed: 0` to default state object

- [x] **Update userStats state setter in loadDashboard**
  - Location: `frontend/src/app/(dashboard)/admin/page.tsx` (line 206)
  - Ensure `setUserStats(userStatsData)` receives the new fields from API response
  - Verify `userStatsData` includes `total_creditsNew` and `total_creditsNewUsed`

- [x] **Add "New Credits" statistic row in User Stats card**
  - Location: `frontend/src/app/(dashboard)/admin/page.tsx` (after line 409, before Input tokens row)
  - Add new `<div>` with flex layout matching existing rows
  - Add teal/emerald colored dot indicator: `<span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400"></span>`
  - Add label: `<span className="text-gray-500 dark:text-neutral-500">New Credits</span>`
  - Add value: `<span className="text-teal-500 dark:text-teal-400 font-medium">{formatUSD(userStats.total_creditsNew)}</span>`
  - Apply same responsive styling as other rows (p-2 sm:p-0 rounded-lg bg-white/50 dark:bg-white/5 sm:bg-transparent)

- [x] **Add "New Burned" statistic row in User Stats card**
  - Location: `frontend/src/app/(dashboard)/admin/page.tsx` (after New Credits row, before Input tokens row)
  - Add new `<div>` with flex layout matching existing rows
  - Add rose/red colored dot indicator: `<span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400"></span>`
  - Add label: `<span className="text-gray-500 dark:text-neutral-500">New Burned</span>`
  - Add value: `<span className="text-rose-500 dark:text-rose-400 font-medium">{formatUSD(userStats.total_creditsNewUsed)}</span>`
  - Apply same responsive styling as other rows

## Testing & Validation

- [ ] **Test backend aggregation**
  - Start backend server
  - Query `/admin/user-stats` API endpoint (requires admin authentication)
  - Verify response includes `total_creditsNew` and `total_creditsNewUsed` fields
  - Verify values match manual MongoDB aggregation queries

- [ ] **Test frontend rendering**
  - Navigate to `/admin` dashboard as admin user
  - Verify "New Credits" row appears with teal color and formatted USD value
  - Verify "New Burned" row appears with rose/red color and formatted USD value
  - Verify statistics update when period filter is changed (values remain constant as they're not period-filtered)

- [ ] **Test responsive layout**
  - View admin dashboard on desktop (>= 640px width)
  - Verify new rows appear in vertical list layout
  - View admin dashboard on mobile (<640px width)
  - Verify new rows appear in 2-column grid with proper background styling

- [ ] **Validate data accuracy**
  - Use MongoDB shell to calculate `db.usersNew.aggregate([{$group: {_id: null, total: {$sum: "$creditsNew"}}}])`
  - Compare with dashboard display value
  - Repeat for `creditsNewUsed` field
  - Verify values match within acceptable rounding

## Documentation

- [x] **Update implementation notes**
  - Document that creditsNew statistics show current balances (not period-filtered)
  - Note color scheme: teal for available credits, rose for spent credits
  - Explain visual distinction from OhMyGPT credits (emerald vs teal, orange vs rose)

