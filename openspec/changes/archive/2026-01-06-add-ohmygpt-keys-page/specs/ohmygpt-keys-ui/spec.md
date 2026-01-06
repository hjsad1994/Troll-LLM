# Spec: OhMyGPT Keys Management UI

## ADDED Requirements

### Requirement: OhMyGPT Keys API Endpoints

The backend SHALL provide REST API endpoints for managing OhMyGPT keys under `/admin/ohmygpt/keys`.

#### Scenario: List all keys with statistics
- **Given** the user is authenticated as an admin
- **When** sending GET request to `/admin/ohmygpt/keys`
- **Then** the system SHALL return JSON response with:
  - `keys`: array of key objects with masked API keys
  - `totalKeys`: total count of keys
  - `healthyKeys`: count of healthy keys
- **And** each key SHALL contain: `_id`, `apiKey` (masked), `status`, `tokensUsed`, `requestsCount`
- **And** API keys SHALL be masked showing only first 8 and last 4 characters
- **And** status SHALL be one of: `healthy`, `rate_limited`, `exhausted`, `error`

#### Scenario: Create a new key
- **Given** the user is authenticated as an admin
- **When** sending POST request to `/admin/ohmygpt/keys` with body `{ id, apiKey }`
- **Then** the system SHALL validate the input using zod schema
- **And** on success, SHALL insert into `ohmygpt_keys` collection with:
  - `status: 'healthy'`
  - `tokensUsed: 0`
  - `requestsCount: 0`
  - `createdAt: current timestamp`
- **And** SHALL return 201 status with the created key (masked)
- **And** on validation error, SHALL return 400 with error details

#### Scenario: Delete a key
- **Given** the user is authenticated as an admin
- **When** sending DELETE request to `/admin/ohmygpt/keys/:id`
- **Then** the system SHALL delete all bindings for the key
- **And** SHALL delete the key from `ohmygpt_keys` collection
- **And** SHALL return 200 with success message if key existed
- **And** SHALL return 404 if key not found

#### Scenario: Reset key statistics
- **Given** the user is authenticated as an admin
- **And** a key exists with non-zero statistics
- **When** sending POST request to `/admin/ohmygpt/keys/:id/reset`
- **Then** the system SHALL update the key with:
  - `status: 'healthy'`
  - `tokensUsed: 0`
  - `requestsCount: 0`
  - `lastError: null`
  - `cooldownUntil: null`
- **And** SHALL return 200 with success message
- **And** SHALL return 404 if key not found

#### Scenario: Get overall statistics
- **Given** the user is authenticated as an admin
- **When** sending GET request to `/admin/ohmygpt/stats`
- **Then** the system SHALL return JSON with:
  - `totalKeys`: total count of keys
  - `healthyKeys`: count of keys with status `healthy`
  - `totalBindings`: count of active bindings
  - `totalProxies`: count of active proxies

### Requirement: OhMyGPT Keys Frontend Page

The frontend SHALL provide a page at `/ohmygpt-keys` for managing OhMyGPT keys.

#### Scenario: Admin access control
- **Given** a user navigates to `/ohmygpt-keys`
- **When** the user is not authenticated or not an admin
- **Then** the system SHALL redirect to `/dashboard`
- **When** the user is an admin
- **Then** the system SHALL display the keys management page

#### Scenario: Display key statistics
- **Given** an admin user is on the OhMyGPT keys page
- **When** the page loads
- **Then** the system SHALL display three stat cards:
  - "Total" showing total key count
  - "Healthy" showing count of healthy keys
  - "Unhealthy" showing count of non-healthy keys
- **And** stats SHALL be fetched from `/admin/ohmygpt/keys`
- **And** stats SHALL update automatically after any CRUD operation

#### Scenario: Display keys table (desktop)
- **Given** an admin user is on the OhMyGPT keys page
- **When** viewing on desktop (lg breakpoint or larger)
- **Then** the system SHALL display a table with columns:
  - Key ID (monospace font)
  - API Key (masked, monospace font)
  - Status (Healthy/Unhealthy badge with color)
  - Tokens Used (formatted number)
  - Requests (formatted number)
  - Actions (Reset/Delete buttons)
- **And** unhealthy keys SHALL be displayed with red background and strikethrough
- **And** healthy keys SHALL be displayed with normal styling

#### Scenario: Display keys cards (mobile)
- **Given** an admin user is on the OhMyGPT keys page
- **When** viewing on mobile (below lg breakpoint)
- **Then** the system SHALL display cards for each key containing:
  - Key ID and masked API key
  - Status badge
  - Tokens Used and Requests statistics
  - Reset and Delete action buttons
- **And** unhealthy keys SHALL have red background
- **And** healthy keys SHALL have normal background

#### Scenario: Add single key via modal
- **Given** an admin user is on the OhMyGPT keys page
- **When** clicking "Add Key" button
- **Then** the system SHALL open a modal with:
  - Key ID input field (required)
  - API Key input field (required, monospace font)
  - Submit button
  - Cancel button
- **When** submitting valid data
- **Then** the system SHALL POST to `/admin/ohmygpt/keys`
- **And** on success, SHALL show success toast and reload keys
- **And** on error, SHALL show error toast with message

#### Scenario: Import multiple keys from file
- **Given** an admin user is on the OhMyGPT keys page
- **When** clicking "Import Keys" button
- **Then** the system SHALL open a modal with:
  - File input accepting .txt files
  - File format example showing `id|apiKey` format
  - Import button
- **When** selecting a file and submitting
- **Then** the system SHALL parse each line as `id|apiKey`
- **And** for each valid line, SHALL POST to `/admin/ohmygpt/keys`
- **And** SHALL display result showing count of succeeded/failed imports
- **And** SHALL reload the keys list

#### Scenario: Delete key with confirmation
- **Given** an admin user is on the OhMyGPT keys page
- **When** clicking "Delete" button on a key
- **Then** the system SHALL show confirmation dialog
- **When** confirming deletion
- **Then** the system SHALL send DELETE to `/admin/ohmygpt/keys/:id`
- **And** on success, SHALL show success toast and reload keys
- **And** on error, SHALL show error toast

#### Scenario: Reset key statistics with confirmation
- **Given** an admin user is on the OhMyGPT keys page
- **And** a key has non-zero statistics or unhealthy status
- **When** clicking "Reset" button on that key
- **Then** the system SHALL show confirmation dialog
- **When** confirming reset
- **Then** the system SHALL POST to `/admin/ohmygpt/keys/:id/reset`
- **And** on success, SHALL show success toast and reload keys
- **And** the reset key SHALL show as "healthy" with zero statistics

### Requirement: OhMyGPT Keys Navigation

The admin sidebar SHALL include a navigation link to the OhMyGPT keys page.

#### Scenario: Navigation link in admin sidebar
- **Given** an admin user is logged in
- **When** viewing the admin sidebar
- **Then** the system SHALL display "OhMyGPT Keys" link
- **And** the link SHALL point to `/ohmygpt-keys`
- **And** the link SHALL display a key icon (same as OpenHands)
- **And** the link SHALL be positioned before "OpenHands Keys" (alphabetical)
- **And** clicking the link SHALL navigate to the OhMyGPT keys page

#### Scenario: Active state highlighting
- **Given** an admin user is on the OhMyGPT keys page
- **When** viewing the sidebar
- **Then** the "OhMyGPT Keys" link SHALL have active state styling
- **And** SHALL be visually distinct from non-active links

### Requirement: OhMyGPT Keys Translations

The LanguageProvider SHALL include translations for the OhMyGPT keys page.

#### Scenario: English translations
- **Given** the LanguageProvider is loaded
- **When** accessing `t.ohmygptKeys`
- **Then** the system SHALL provide translations for:
  - `title`: Page title
  - `subtitle`: Page description
  - `stats.total`: Total keys label
  - `stats.healthy`: Healthy keys label
  - `stats.unhealthy`: Unhealthy keys label
  - `addButton`: Add button text
  - `table.*`: Table column labels
  - `modal.*`: Modal form labels
  - `toast.*`: Success/error messages
  - `confirm.*`: Confirmation dialog messages
  - `empty.*`: Empty state messages

#### Scenario: Vietnamese translations
- **Given** the LanguageProvider supports Vietnamese
- **When** user selects Vietnamese language
- **Then** all OhMyGPT keys labels SHALL display in Vietnamese
- **And** SHALL maintain consistency with OpenHands translations

### Requirement: OhMyGPT Keys Data Layer

The backend SHALL provide a service layer for OhMyGPT keys data operations.

#### Scenario: List keys from database
- **Given** the `ohmygpt_keys` collection exists
- **When** calling `listKeys()`
- **Then** the system SHALL query MongoDB for all documents
- **And** SHALL return array of `OhMyGPTKey` objects
- **And** each object SHALL contain: `_id`, `apiKey`, `status`, `tokensUsed`, `requestsCount`, `lastError`, `cooldownUntil`, `createdAt`

#### Scenario: Get key statistics
- **Given** the `ohmygpt_keys` collection exists
- **When** calling `getStats()`
- **Then** the system SHALL count:
  - Total documents in collection
  - Documents with `status: 'healthy'`
  - Active bindings in `ohmygpt_bindings`
  - Active proxies
- **And** SHALL return stats object with `totalKeys`, `healthyKeys`, `totalBindings`, `totalProxies`

#### Scenario: Create key in database
- **Given** valid input data `{ id, apiKey }`
- **When** calling `createKey(data)`
- **Then** the system SHALL insert document into `ohmygpt_keys`
- **And** the document SHALL have:
  - `_id: data.id`
  - `apiKey: data.apiKey`
  - `status: 'healthy'`
  - `tokensUsed: 0`
  - `requestsCount: 0`
  - `createdAt: current Date`
- **And** SHALL return the created document

#### Scenario: Delete key from database
- **Given** a key with given `id` exists
- **When** calling `deleteKey(id)`
- **Then** the system SHALL delete all bindings in `ohmygpt_bindings` for the key
- **And** SHALL delete document from `ohmygpt_keys`
- **And** SHALL return `true` if document was deleted
- **And** SHALL return `false` if document not found

#### Scenario: Reset key statistics in database
- **Given** a key with non-zero statistics exists
- **When** calling `resetKeyStats(id)`
- **Then** the system SHALL update the document with:
  - `status: 'healthy'`
  - `tokensUsed: 0`
  - `requestsCount: 0`
  - `lastError: null`
  - `cooldownUntil: null`
  - `updatedAt: current Date`
- **And** SHALL return the updated document
- **And** SHALL return `null` if document not found
