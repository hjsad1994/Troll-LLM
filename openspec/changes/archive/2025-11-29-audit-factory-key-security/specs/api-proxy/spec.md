## ADDED Requirements

### Requirement: Troll-Key Backend Isolation
The system SHALL ensure Troll-Keys (upstream API keys) remain completely hidden from non-admin users and are never exposed in API responses.

#### Scenario: Non-admin user attempts to access Troll-Keys endpoint
- **WHEN** a user with role "user" calls `GET /admin/troll-keys`
- **THEN** the system SHALL return HTTP 403 Forbidden
- **AND** response SHALL include error message "Insufficient permissions"

#### Scenario: Admin user lists Troll-Keys
- **WHEN** a user with role "admin" calls `GET /admin/troll-keys`
- **THEN** the system SHALL return Troll-Key metadata
- **AND** the `apiKey` field SHALL be excluded from the response
- **AND** a `maskedApiKey` field SHALL be included showing format `xxx***xxx`

#### Scenario: Troll-Key creation returns full key once
- **WHEN** admin calls `POST /admin/troll-keys` with valid data
- **THEN** the full `apiKey` value SHALL be returned in the response
- **AND** subsequent GET requests SHALL NOT include the full `apiKey`
- **AND** response SHALL include warning "Save this key - it will not be shown again"

#### Scenario: API response never contains full Troll-Key
- **WHEN** any API endpoint returns Troll-Key data
- **AND** the request is not a POST (creation)
- **THEN** the response SHALL NOT include the full `apiKey` field
- **AND** MongoDB projection SHALL exclude `apiKey` at query time

---

### Requirement: Troll-Key UI Admin-Only Access
The system SHALL restrict Troll-Key management UI to admin users only.

#### Scenario: Non-admin navigates to troll-keys page
- **WHEN** a user with role "user" navigates to `/troll-keys`
- **THEN** the system SHALL redirect to `/dashboard`
- **AND** Troll-Key management UI SHALL NOT be rendered

#### Scenario: Admin accesses troll-keys page
- **WHEN** a user with role "admin" navigates to `/troll-keys`
- **THEN** the system SHALL display the Troll-Key management UI
- **AND** keys SHALL be displayed with masked API key values

#### Scenario: User dashboard excludes Troll-Keys
- **WHEN** a user with role "user" views their dashboard
- **THEN** the dashboard SHALL NOT display Troll-Key information
- **AND** the dashboard SHALL NOT fetch Troll-Key endpoints

#### Scenario: Admin dashboard shows Troll-Keys
- **WHEN** a user with role "admin" views the admin dashboard
- **THEN** the dashboard MAY display Troll-Key summary (count, health)
- **AND** Troll-Key API values SHALL be masked

---

## MODIFIED Requirements

### Requirement: Troll-Key CRUD UI
The system SHALL provide UI for managing Troll-Keys (upstream API keys), restricted to admin users only.

#### Scenario: Admin views Troll-Keys
- **WHEN** admin navigates to `/admin/troll-keys`
- **THEN** system displays all Troll-Keys with status
- **AND** shows tokens used, requests count, health status
- **AND** shows masked API key (format: `xxx***xxx`)
- **AND** does NOT show full API key value

#### Scenario: Non-admin attempts Troll-Key access
- **WHEN** non-admin user navigates to `/admin/troll-keys` or `/troll-keys`
- **THEN** system redirects to `/dashboard`
- **AND** returns HTTP 403 if API endpoint is accessed directly

#### Scenario: Admin adds Troll-Key via UI
- **WHEN** admin fills add Troll-Key form with ID and API key
- **AND** submits form
- **THEN** system creates Troll-Key
- **AND** displays full API key ONCE in response
- **AND** refreshes list showing masked key only

#### Scenario: Admin deletes Troll-Key via UI
- **WHEN** admin clicks delete on a Troll-Key
- **AND** confirms action
- **THEN** system deletes key and all bindings
- **AND** refreshes list
