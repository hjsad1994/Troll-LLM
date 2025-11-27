## ADDED Requirements

### Requirement: Admin Dashboard
The system SHALL provide a web-based admin dashboard for managing keys and proxies.

#### Scenario: Admin accesses dashboard
- **WHEN** admin navigates to /admin
- **AND** is authenticated
- **THEN** system displays dashboard with overview stats
- **AND** shows navigation to keys, factory-keys, proxies pages

#### Scenario: Unauthenticated access redirects to login
- **WHEN** unauthenticated user navigates to /admin/*
- **THEN** system redirects to login page
- **AND** stores original URL for redirect after login

### Requirement: User Keys CRUD UI
The system SHALL provide UI for managing user API keys.

#### Scenario: Admin views keys list
- **WHEN** admin navigates to /admin/keys
- **THEN** system displays all user keys in table
- **AND** shows key ID (masked), name, tier, usage, status

#### Scenario: Admin creates new key via UI
- **WHEN** admin fills create key form with name, tier, token limit
- **AND** submits form
- **THEN** system creates key and displays full key ID once
- **AND** refreshes keys list

#### Scenario: Admin edits key via UI
- **WHEN** admin clicks edit on a key
- **THEN** system shows modal with editable fields
- **AND** allows updating quota and notes

#### Scenario: Admin revokes key via UI
- **WHEN** admin clicks revoke on a key
- **AND** confirms action
- **THEN** system revokes key
- **AND** updates list to show revoked status

### Requirement: Factory Keys CRUD UI
The system SHALL provide UI for managing factory API keys.

#### Scenario: Admin views factory keys
- **WHEN** admin navigates to /admin/factory-keys
- **THEN** system displays all factory keys with status
- **AND** shows tokens used, requests count, health status

#### Scenario: Admin adds factory key via UI
- **WHEN** admin fills add factory key form with ID and API key
- **AND** submits form
- **THEN** system creates factory key
- **AND** refreshes list

#### Scenario: Admin deletes factory key via UI
- **WHEN** admin clicks delete on a factory key
- **AND** confirms action
- **THEN** system deletes key and all bindings
- **AND** refreshes list

### Requirement: Proxies CRUD UI
The system SHALL provide UI for managing proxies and key bindings.

#### Scenario: Admin views proxies list
- **WHEN** admin navigates to /admin/proxies
- **THEN** system displays all proxies with health status
- **AND** shows name, type, host:port, latency, bound keys count

#### Scenario: Admin creates proxy via UI
- **WHEN** admin fills create proxy form
- **AND** submits form
- **THEN** system creates proxy
- **AND** refreshes list

#### Scenario: Admin binds key to proxy via UI
- **WHEN** admin selects proxy and clicks "Bind Key"
- **AND** selects factory key and priority
- **THEN** system creates binding
- **AND** shows updated bound keys count

#### Scenario: Admin unbinds key from proxy via UI
- **WHEN** admin clicks unbind on a key binding
- **AND** confirms action
- **THEN** system removes binding
- **AND** updates proxy display
