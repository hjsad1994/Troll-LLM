## ADDED Requirements

### Requirement: Proxy Key Round-Robin Rotation
The system SHALL rotate through ALL keys bound to a proxy using round-robin algorithm, not just the primary key.

#### Scenario: Multiple keys per proxy
- **WHEN** a proxy has 3 keys bound (factory-1, factory-2, factory-3)
- **THEN** requests SHALL rotate: factory-1 → factory-2 → factory-3 → factory-1 → ...

#### Scenario: Priority ordering
- **WHEN** keys have different priorities (factory-1: priority 1, factory-2: priority 2, factory-3: priority 1)
- **THEN** rotation order SHALL be: factory-1 → factory-3 → factory-2 (sorted by priority, then by order)

#### Scenario: Key becomes unavailable
- **WHEN** a key is marked as rate_limited or exhausted during rotation
- **THEN** the system SHALL skip that key and continue to the next available key

### Requirement: Hot Reload Bindings
The system SHALL support reloading proxy-key bindings from database without restarting the goproxy service.

#### Scenario: Manual reload trigger
- **WHEN** admin calls `GET /reload` endpoint on goproxy
- **THEN** bindings SHALL be reloaded from MongoDB immediately

#### Scenario: Auto-reload
- **WHEN** goproxy is running
- **THEN** bindings SHALL be automatically reloaded every 30 seconds (configurable via `BINDING_RELOAD_INTERVAL`)

#### Scenario: Reload during traffic
- **WHEN** reload occurs while requests are being processed
- **THEN** in-flight requests SHALL NOT be affected
- **AND** new requests SHALL use updated bindings

### Requirement: Admin Bindings Management UI
The system SHALL provide an admin page to manage proxy-key bindings with visual configuration.

#### Scenario: View all bindings
- **WHEN** admin navigates to `/admin/bindings`
- **THEN** system SHALL display a table showing: Proxy Name | Bound Keys (with priority) | Actions

#### Scenario: Add binding
- **WHEN** admin clicks "Add Binding" and selects proxy, key, and priority (1-10)
- **THEN** binding SHALL be created in database
- **AND** success notification SHALL be shown

#### Scenario: Update priority
- **WHEN** admin changes priority of an existing binding
- **THEN** priority SHALL be updated in database
- **AND** goproxy SHALL pick up change on next reload

#### Scenario: Trigger reload from UI
- **WHEN** admin clicks "Reload GoProxy" button
- **THEN** system SHALL call goproxy reload endpoint
- **AND** confirmation message SHALL be shown

### Requirement: Extended Priority System
The system SHALL support priority levels 1-10 for key bindings (expanded from 1-2).

#### Scenario: Priority validation
- **WHEN** admin sets binding priority
- **THEN** system SHALL accept values 1-10
- **AND** reject values outside this range

#### Scenario: Priority ordering
- **WHEN** multiple keys have same priority
- **THEN** rotation order among same-priority keys SHALL be based on binding creation order
