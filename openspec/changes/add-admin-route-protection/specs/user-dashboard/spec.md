## ADDED Requirements

### Requirement: Admin Route Protection
The system SHALL restrict access to admin pages based on user role. Only users with role = 'admin' SHALL be able to access admin routes.

#### Scenario: Admin user accesses admin page
- **WHEN** a user with role 'admin' navigates to an admin page (e.g., /admin, /admin/pricing, /users)
- **THEN** the page SHALL render normally

#### Scenario: Regular user attempts to access admin page
- **WHEN** a user with role 'user' navigates to an admin page
- **THEN** the system SHALL display an "Access Denied" message
- **AND** the system SHALL redirect the user to /dashboard

#### Scenario: Unauthenticated user attempts to access admin page
- **WHEN** an unauthenticated user navigates to an admin page
- **THEN** the system SHALL redirect to the login page

### Requirement: Admin Routes Definition
The following routes SHALL be protected as admin-only:
- /admin - Admin dashboard
- /admin/pricing - Model pricing management
- /users - User management
- /keys - User API keys management (admin write, user read)
- /factory-keys - Factory keys management
- /proxies - Proxy management

#### Scenario: Protected routes list
- **WHEN** accessing any route in the admin routes list
- **THEN** the admin role check SHALL be enforced
