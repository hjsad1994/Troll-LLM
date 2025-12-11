## 1. Backend Updates
- [x] 1.1 Add `subscriptionDays` field to user API response (from CREDIT_PACKAGES config, default 7 days)

## 2. Admin Users Page - Expires Display
- [x] 2.1 Update `getDaysRemaining` function to return both remaining days and total days
- [x] 2.2 Update Expires column to display X/Y format (e.g., "6/7")
- [x] 2.3 Add color coding: green for > 3 days, amber for <= 3 days, red for expired

## 3. Admin Users Page - Mobile Responsive
- [x] 3.1 Hide table on small screens (< 768px) and show card-based layout instead
- [x] 3.2 Create UserCard component with all user info displayed in a mobile-friendly grid
- [x] 3.3 Add SET/ADD credits controls to mobile card view
- [x] 3.4 Ensure all actions work properly on mobile

## 4. User Dashboard - Expires Display
- [x] 4.1 Add expires countdown section to billing card on user dashboard
- [x] 4.2 Display X/Y format with same color coding as admin page
- [x] 4.3 Show warning message when subscription is expiring soon (< 3 days)

## 5. Testing and Validation
- [x] 5.1 Test expires display with various remaining days (7, 3, 1, 0, expired)
- [x] 5.2 Test mobile responsive layout on different screen sizes
- [x] 5.3 Verify all interactive elements work on touch devices
