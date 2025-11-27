# Tasks: Add Admin Dashboard UI

## 1. Admin Layout & Navigation
- [x] 1.1 Create `backend/static/admin/index.html` - Dashboard home
- [x] 1.2 Create shared CSS styles
- [x] 1.3 Create navigation component (sidebar/header)
- [x] 1.4 Add login check and redirect

## 2. User Keys Management
- [x] 2.1 Create `backend/static/admin/keys.html`
- [x] 2.2 List all user keys with pagination
- [x] 2.3 Create new key form (name, tier, token limit)
- [x] 2.4 Edit key modal (update quota, notes)
- [x] 2.5 Revoke/Delete key with confirmation
- [x] 2.6 Reset usage button
- [x] 2.7 Search/filter keys

## 3. Factory Keys Management
- [x] 3.1 Create `backend/static/admin/factory-keys.html`
- [x] 3.2 List all factory keys with status
- [x] 3.3 Add new factory key form
- [x] 3.4 Delete factory key with confirmation
- [x] 3.5 Reset key status button
- [x] 3.6 Show usage statistics

## 4. Proxies Management
- [x] 4.1 Create `backend/static/admin/proxies.html`
- [x] 4.2 List all proxies with health status
- [x] 4.3 Create new proxy form (name, type, host, port, auth)
- [x] 4.4 Edit proxy modal
- [x] 4.5 Delete proxy with confirmation
- [x] 4.6 Bind/unbind keys UI
- [x] 4.7 View health history

## 5. Dashboard Overview
- [x] 5.1 Show system stats (total keys, proxies, requests)
- [x] 5.2 Show health status summary
- [x] 5.3 Recent activity log
- [x] 5.4 Quick actions

## 6. Backend Routes
- [x] 6.1 Add routes to serve admin pages
- [x] 6.2 Add session-based auth for admin pages
