## 1. Backend Implementation
- [x] 1.1 Add `GET /api/admin/payments` endpoint in `backend/src/routes/admin.routes.ts`
- [x] 1.2 Add `getAllPayments` method in payment repository with pagination support

## 2. Frontend Sidebar
- [x] 2.1 Add "Billing" nav item to `adminNavItems` array in `frontend/src/components/Sidebar.tsx`

## 3. Frontend Page
- [x] 3.1 Create new page `frontend/src/app/(dashboard)/admin/billing/page.tsx`
- [x] 3.2 Implement payments table with user info, plan, amount, status, date columns
- [x] 3.3 Add pagination controls
- [x] 3.4 Add loading and error states

## 4. Testing
- [ ] 4.1 Verify admin can access billing page
- [ ] 4.2 Verify payments are displayed correctly
- [ ] 4.3 Verify non-admin users cannot access the page
