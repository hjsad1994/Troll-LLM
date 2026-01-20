# ohmygpt-bindings-ui Specification

## Purpose
TBD - created by archiving change add-ohmygpt-bindings. Update Purpose after archive.
## Requirements
### Requirement: OhMyGPT Bindings API Endpoints

The backend SHALL provide REST API endpoints for managing OhMyGPT key bindings under `/admin/ohmygpt-bindings`.

#### Scenario: List all bindings with statistics
- **Given** the user is authenticated as an admin
- **When** sending GET request to `/admin/ohmygpt-bindings`
- **Then** the system SHALL return JSON response with:
  - `bindings`: array of binding objects
  - `byProxy`: bindings grouped by proxy ID
  - `proxies`: array of available proxies
  - `keys`: array of available OhMyGPT keys
  - `total`: total count of bindings
- **And** each binding SHALL contain: `proxyId`, `ohmygptKeyId`, `priority`, `isActive`, `proxyName`, `keyStatus`
- **And** the system SHALL auto-repair orphaned bindings before returning
- **And** `autoRepaired` metadata SHALL indicate if repairs were made

#### Scenario: Create a new binding
- **Given** the user is authenticated as an admin
- **When** sending POST request to `/admin/ohmygpt-bindings` with body `{ proxyId, ohmygptKeyId, priority }`
- **Then** the system SHALL validate the input using zod schema
- **And** SHALL verify that the proxy exists
- **And** SHALL verify that the key exists
- **And** on success, SHALL insert into `ohmygpt_bindings` collection
- **And** SHALL return 201 status with the created binding
- **And** on validation error, SHALL return 400 with error details

#### Scenario: Update binding priority
- **Given** the user is authenticated as an admin
- **And** a binding exists for the proxy and key
- **When** sending PATCH request to `/admin/ohmygpt-bindings/:proxyId/:keyId` with body `{ priority }`
- **Then** the system SHALL update the binding priority
- **And** SHALL return 200 with the updated binding
- **And** SHALL return 404 if binding not found

#### Scenario: Delete a binding
- **Given** the user is authenticated as an admin
- **When** sending DELETE request to `/admin/ohmygpt-bindings/:proxyId/:keyId`
- **Then** the system SHALL delete the binding from `ohmygpt_bindings` collection
- **And** SHALL return 200 with success message if binding existed
- **And** SHALL return 404 if binding not found

#### Scenario: Delete all bindings for a proxy
- **Given** the user is authenticated as an admin
- **When** sending DELETE request to `/admin/ohmygpt-bindings/:proxyId`
- **Then** the system SHALL delete all bindings for the proxy
- **And** SHALL return 200 with message indicating count deleted

#### Scenario: Get bindings for a specific proxy
- **Given** the user is authenticated as an admin
- **When** sending GET request to `/admin/ohmygpt-bindings/:proxyId`
- **Then** the system SHALL return all bindings for that proxy
- **And** bindings SHALL be sorted by priority ascending

#### Scenario: Auto-repair orphaned bindings
- **Given** orphaned bindings exist (key deleted but binding remains)
- **When** the system detects orphaned bindings
- **Then** the system SHALL check for backup keys that replaced the deleted key
- **And** SHALL update binding to use the replacement key if found
- **And** SHALL delete the binding if no replacement exists
- **And** SHALL return repair statistics (checked, repaired, deleted)

### Requirement: OhMyGPT Bindings Frontend Page

The frontend SHALL provide a page at `/admin/ohmygpt-bindings` for managing OhMyGPT key bindings.

#### Scenario: Admin access control
- **Given** a user navigates to `/admin/ohmygpt-bindings`
- **When** the user is not authenticated or not an admin
- **Then** the system SHALL redirect to `/dashboard`
- **When** the user is an admin
- **Then** the system SHALL display the bindings management page

#### Scenario: Display bindings grouped by proxy
- **Given** an admin user is on the OhMyGPT bindings page
- **When** the page loads
- **Then** the system SHALL display bindings grouped by proxy
- **And** each group SHALL show:
  - Proxy name and status
  - List of bindings sorted by priority
  - Key status for each binding
  - Active/inactive indicator
- **And** available keys (not bound) SHALL be shown separately

#### Scenario: Create binding modal
- **Given** an admin user is on the OhMyGPT bindings page
- **When** clicking "Add Binding" button
- **Then** the system SHALL open a modal with:
  - Proxy selector dropdown (available proxies)
  - Key selector dropdown (unbound keys)
  - Priority input (1-10, default 1)
  - Submit button
  - Cancel button
- **When** submitting valid data
- **Then** the system SHALL POST to `/admin/ohmygpt-bindings`
- **And** on success, SHALL show success toast and reload bindings
- **And** on error, SHALL show error toast with message

#### Scenario: Edit binding modal
- **Given** an admin user is on the OhMyGPT bindings page
- **When** clicking "Edit" button on a binding
- **Then** the system SHALL open a modal with:
  - Read-only proxy and key fields
  - Priority input (1-10)
  - Submit button
  - Cancel button
- **When** submitting valid data
- **Then** the system SHALL PATCH to `/admin/ohmygpt-bindings/:proxyId/:keyId`
- **And** on success, SHALL show success toast and reload bindings

#### Scenario: Delete binding with confirmation
- **Given** an admin user is on the OhMyGPT bindings page
- **When** clicking "Delete" button on a binding
- **Then** the system SHALL show confirmation dialog
- **When** confirming deletion
- **Then** the system SHALL send DELETE to `/admin/ohmygpt-bindings/:proxyId/:keyId`
- **And** on success, SHALL show success toast and reload bindings

#### Scenario: Auto-repair notification
- **Given** orphaned bindings were detected and repaired
- **When** the page loads
- **Then** the system SHALL display a notification banner
- **And** the banner SHALL show count of repaired and deleted bindings
- **And** the banner SHALL have a dismiss button

### Requirement: OhMyGPT Bindings Navigation

The admin sidebar SHALL include a navigation link to the OhMyGPT bindings page.

#### Scenario: Navigation link in admin sidebar
- **Given** an admin user is logged in
- **When** viewing the admin sidebar
- **Then** the system SHALL display "OhMyGPT Bindings" link
- **And** the link SHALL point to `/admin/ohmygpt-bindings`
- **And** the link SHALL display a link icon (same as OpenHands bindings)
- **And** the link SHALL be positioned near "Key Bindings" entry
- **And** clicking the link SHALL navigate to the OhMyGPT bindings page

#### Scenario: Active state highlighting
- **Given** an admin user is on the OhMyGPT bindings page
- **When** viewing the sidebar
- **Then** the "OhMyGPT Bindings" link SHALL have active state styling
- **And** SHALL be visually distinct from non-active links

### Requirement: OhMyGPT Bindings Translations

The LanguageProvider SHALL include translations for the OhMyGPT bindings page.

#### Scenario: English translations
- **Given** the LanguageProvider is loaded
- **When** accessing `t.ohmygptBindings`
- **Then** the system SHALL provide translations for:
  - `title`: Page title
  - `subtitle`: Page description
  - `stats.*`: Statistics labels
  - `addButton`: Add button text
  - `modal.*`: Modal form labels
  - `toast.*`: Success/error messages
  - `confirm.*`: Confirmation dialog messages
  - `empty.*`: Empty state messages
  - `autoRepair`: Auto-repair notification

#### Scenario: Vietnamese translations
- **Given** the LanguageProvider supports Vietnamese
- **When** user selects Vietnamese language
- **Then** all OhMyGPT bindings labels SHALL display in Vietnamese
- **And** SHALL maintain consistency with OpenHands translations

### Requirement: OhMyGPT Bindings Data Layer

The backend SHALL provide a service layer for OhMyGPT bindings data operations.

#### Scenario: List bindings from database
- **Given** the `ohmygpt_bindings` collection exists
- **When** calling `listBindings()`
- **Then** the system SHALL query MongoDB for all documents
- **And** SHALL return array of `OhMyGPTBinding` objects

#### Scenario: Get bindings for specific proxy
- **Given** the `ohmygpt_bindings` collection exists
- **When** calling `getBindingsForProxy(proxyId)`
- **Then** the system SHALL query for documents with matching `proxyId`
- **And** SHALL sort by `priority` ascending
- **And** SHALL return array of bindings

#### Scenario: Create binding in database
- **Given** valid input data `{ proxyId, ohmygptKeyId, priority }`
- **When** calling `createBinding(data)`
- **Then** the system SHALL verify proxy exists in `proxies` collection
- **And** SHALL verify key exists in `ohmygpt_keys` collection
- **And** SHALL insert document into `ohmygpt_bindings`
- **And** SHALL return the created document

#### Scenario: Update binding in database
- **Given** a binding exists for the proxy and key
- **When** calling `updateBinding(proxyId, keyId, data)`
- **Then** the system SHALL update the document with new priority
- **And** SHALL return the updated document
- **And** SHALL return `null` if binding not found

#### Scenario: Delete binding from database
- **Given** a binding exists
- **When** calling `deleteBinding(proxyId, keyId)`
- **Then** the system SHALL delete document from `ohmygpt_bindings`
- **And** SHALL return `true` if document was deleted
- **And** SHALL return `false` if document not found

#### Scenario: Delete all bindings for proxy
- **Given** multiple bindings exist for a proxy
- **When** calling `deleteAllBindingsForProxy(proxyId)`
- **Then** the system SHALL delete all documents with matching `proxyId`
- **And** SHALL return count of deleted documents

#### Scenario: Repair orphaned bindings
- **Given** orphaned bindings exist (key deleted)
- **When** calling `repairBindings()`
- **Then** the system SHALL check each binding's key exists
- **And** for orphaned bindings, SHALL check if backup key replaced the deleted key
- **And** SHALL update binding to use replacement key if found
- **And** SHALL delete binding if no replacement exists
- **And** SHALL return statistics: { checked, repaired, deleted }

