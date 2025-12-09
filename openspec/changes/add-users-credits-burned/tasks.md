## 1. Backend Implementation
- [x] 1.1 Update `GET /admin/users` endpoint to call `getCreditsBurnedByUser()` in parallel with existing queries
- [x] 1.2 Merge `creditsBurned` data into each user object in the response

## 2. Frontend
- [x] 2.1 Add `creditsBurned` field to `AdminUser` interface in `api.ts`
- [x] 2.2 Add "Burned" translation to `i18n.ts` (en + vi)
- [x] 2.3 Add "Burned" column to Users table in `users/page.tsx`

## 3. Validation
- [ ] 3.1 Test endpoint response includes `creditsBurned` field for each user
- [ ] 3.2 Verify users with no usage show `creditsBurned: 0`
