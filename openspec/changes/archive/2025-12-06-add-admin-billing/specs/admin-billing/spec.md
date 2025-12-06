# Admin Billing Dashboard

## ADDED Requirements

### Requirement: Admin Billing Navigation
The admin sidebar SHALL include a "Billing" navigation item that links to `/admin/billing`.

#### Scenario: Admin sees billing in sidebar
- **WHEN** admin user views the dashboard sidebar
- **THEN** a "Billing" menu item is visible below other admin items
- **AND** clicking it navigates to `/admin/billing`

### Requirement: Admin Payments API
The system SHALL provide an API endpoint `GET /api/admin/payments` for administrators to retrieve all payment records.

#### Scenario: Admin fetches all payments
- **WHEN** admin calls `GET /api/admin/payments`
- **THEN** the system returns a paginated list of all payments
- **AND** each payment includes: id, userId, username, plan, amount, status, orderCode, createdAt, completedAt

#### Scenario: Non-admin access denied
- **WHEN** non-admin user calls `GET /api/admin/payments`
- **THEN** the system returns 403 Forbidden

### Requirement: Admin Billing Page
The system SHALL provide a billing management page at `/admin/billing` that displays all user payments.

#### Scenario: Admin views billing page
- **WHEN** admin navigates to `/admin/billing`
- **THEN** a table of all payments is displayed
- **AND** the table shows columns: User, Plan, Amount, Status, Order Code, Date

#### Scenario: Admin sees payment details
- **WHEN** admin views the billing table
- **THEN** each row shows payment information with appropriate status badges
- **AND** amounts are formatted in VND currency

#### Scenario: Admin filters payments
- **WHEN** admin uses the period filter
- **THEN** payments are filtered by the selected time period
