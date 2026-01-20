# ohmygpt-backup-keys-ui Specification

## Purpose
TBD - created by archiving change add-ohmygpt-backup-keys-page. Update Purpose after archive.
## Requirements
### Requirement: OhMyGPT Backup Keys API Endpoints

The backend SHALL provide REST API endpoints for managing OhMyGPT backup keys under `/admin/ohmygpt/backup-keys`.

#### Scenario: List all backup keys with statistics
- **Given** the user is authenticated as an admin
- **When** sending GET request to `/admin/ohmygpt/backup-keys`
- **Then** the system SHALL return JSON response with:
  - `keys`: array of backup key objects with masked API keys
  - `total`: total count of backup keys
  - `available`: count of unused backup keys
  - `used`: count of used backup keys
- **And** each key SHALL contain: `id`, `maskedApiKey`, `isUsed`, `activated`, `usedFor`, `usedAt`, `createdAt`, `deletesAt`
- **And** API keys SHALL be masked showing only first 8 and last 4 characters
- **And** `deletesAt` SHALL be calculated as `usedAt + 12 hours` for used keys

#### Scenario: Create a new backup key
- **Given** the user is authenticated as an admin
- **When** sending POST request to `/admin/ohmygpt/backup-keys` with body `{ id, apiKey }`
- **Then** the system SHALL validate the input using zod schema
- **And** on success, SHALL insert into `ohmygpt_backup_keys` collection with:
  - `isUsed: false`
  - `activated: false`
  - `createdAt: current timestamp`
- **And** SHALL return 201 status with the created key (masked)
- **And** on validation error, SHALL return 400 with error details

#### Scenario: Delete a backup key
- **Given** the user is authenticated as an admin
- **When** sending DELETE request to `/admin/ohmygpt/backup-keys/:id`
- **Then** the system SHALL delete the key from `ohmygpt_backup_keys` collection
- **And** SHALL return 200 with success message if key existed
- **And** SHALL return 404 if key not found

#### Scenario: Restore a used backup key
- **Given** the user is authenticated as an admin
- **And** a backup key exists with `isUsed: true`
- **When** sending POST request to `/admin/ohmygpt/backup-keys/:id/restore`
- **Then** the system SHALL update the key with:
  - `isUsed: false`
  - `activated: false`
  - `usedFor: null`
  - `usedAt: null`
- **And** SHALL return 200 with success message
- **And** SHALL return 404 if key not found

### Requirement: OhMyGPT Backup Keys Frontend Page

The frontend SHALL provide a page at `/ohmygpt-backup-keys` for managing OhMyGPT backup keys.

#### Scenario: Admin access control
- **Given** a user navigates to `/ohmygpt-backup-keys`
- **When** the user is not authenticated or not an admin
- **Then** the system SHALL redirect to `/dashboard`
- **When** the user is an admin
- **Then** the system SHALL display the backup keys management page

#### Scenario: Display backup keys statistics
- **Given** an admin user is on the OhMyGPT backup keys page
- **When** the page loads
- **Then** the system SHALL display three stat cards:
  - "Total Keys" showing total count
  - "Available" showing count of unused keys
  - "Used" showing count of used keys
- **And** stats SHALL be fetched from `/admin/ohmygpt/backup-keys`
- **And** stats SHALL update automatically after any CRUD operation

#### Scenario: Display backup keys table
- **Given** an admin user is on the OhMyGPT backup keys page
- **When** the page loads
- **Then** the system SHALL display a table with columns:
  - Key ID (monospace font)
  - API Key (masked, monospace font)
  - Status (Available/Used badge with color)
  - Used For (key ID that was replaced, or "—")
  - Created (date in DD/MM/YYYY format)
  - Actions (Restore/Delete buttons)
- **And** used keys SHALL show countdown timer until auto-deletion
- **And** available keys SHALL NOT show countdown

#### Scenario: Add single backup key via modal
- **Given** an admin user is on the OhMyGPT backup keys page
- **When** clicking "Add Backup Key" button
- **Then** the system SHALL open a modal with:
  - Key ID input field (required)
  - API Key input field (required, monospace font)
  - Warning message about auto-rotation
  - Submit button
  - Cancel button
- **When** submitting valid data
- **Then** the system SHALL POST to `/admin/ohmygpt/backup-keys`
- **And** on success, SHALL show success toast and reload keys
- **And** on error, SHALL show error toast with message

#### Scenario: Import multiple backup keys from file
- **Given** an admin user is on the OhMyGPT backup keys page
- **When** clicking "Import Keys" button
- **Then** the system SHALL open a modal with:
  - File input accepting .txt files
  - File format example showing `id|apiKey` format
  - Import button
- **When** selecting a file and submitting
- **Then** the system SHALL parse each line as `id|apiKey`
- **And** for each valid line, SHALL POST to `/admin/ohmygpt/backup-keys`
- **And** SHALL display result showing count of succeeded/failed imports
- **And** SHALL reload the keys list

#### Scenario: Delete backup key with confirmation
- **Given** an admin user is on the OhMyGPT backup keys page
- **When** clicking "Delete" button on a backup key
- **Then** the system SHALL show confirmation dialog
- **When** confirming deletion
- **Then** the system SHALL send DELETE to `/admin/ohmygpt/backup-keys/:id`
- **And** on success, SHALL show success toast and reload keys
- **And** on error, SHALL show error toast

#### Scenario: Restore used backup key
- **Given** an admin user is on the OhMyGPT backup keys page
- **And** a backup key has `isUsed: true`
- **When** clicking "Restore" button on that key
- **Then** the system SHALL show confirmation dialog
- **When** confirming restore
- **Then** the system SHALL POST to `/admin/ohmygpt/backup-keys/:id/restore`
- **And** on success, SHALL show success toast and reload keys
- **And** the restored key SHALL show as "Available"

### Requirement: OhMyGPT Backup Keys Navigation

The admin sidebar SHALL include a navigation link to the OhMyGPT backup keys page.

#### Scenario: Navigation link in admin sidebar
- **Given** an admin user is logged in
- **When** viewing the admin sidebar
- **Then** the system SHALL display "OhMyGPT Backup Keys" link
- **And** the link SHALL point to `/ohmygpt-backup-keys`
- **And** the link SHALL display a key icon (same as OpenHands)
- **And** the link SHALL be positioned after "OpenHands Backup Keys"
- **And** clicking the link SHALL navigate to the OhMyGPT backup keys page

#### Scenario: Active state highlighting
- **Given** an admin user is on the OhMyGPT backup keys page
- **When** viewing the sidebar
- **Then** the "OhMyGPT Backup Keys" link SHALL have active state styling
- **And** SHALL be visually distinct from non-active links

### Requirement: OhMyGPT Backup Keys Translations

The LanguageProvider SHALL include translations for the OhMyGPT backup keys page.

#### Scenario: English translations
- **Given** the LanguageProvider is loaded
- **When** accessing `t.ohmygptBackupKeys`
- **Then** the system SHALL provide translations for:
  - `title`: Page title
  - `subtitle`: Page description
  - `badge`: Badge label
  - `stats.total`: Total keys label
  - `stats.available`: Available keys label
  - `stats.used`: Used keys label
  - `addButton`: Add button text
  - `table.*`: Table column labels
  - `modal.*`: Modal form labels
  - `toast.*`: Success/error messages
  - `confirm.*`: Confirmation dialog messages
  - `empty.*`: Empty state messages
  - `info.*`: Info section content

#### Scenario: Vietnamese translations (optional)
- **Given** the LanguageProvider supports Vietnamese
- **When** user selects Vietnamese language
- **Then** all OhMyGPT backup keys labels SHALL display in Vietnamese
- **And** SHALL maintain consistency with OpenHands translations

### Requirement: OhMyGPT Backup Keys Data Layer

The backend SHALL provide a service layer for OhMyGPT backup keys data operations.

#### Scenario: List backup keys from database
- **Given** the `ohmygpt_backup_keys` collection exists
- **When** calling `listBackupKeys()`
- **Then** the system SHALL query MongoDB for all documents
- **And** SHALL sort by `createdAt` descending
- **And** SHALL return array of `OhMyGPTBackupKey` objects

#### Scenario: Get backup key statistics
- **Given** the `ohmygpt_backup_keys` collection exists
- **When** calling `getBackupKeyStats()`
- **Then** the system SHALL count:
  - Total documents in collection
  - Documents with `isUsed: false`
  - Documents with `isUsed: true`
- **And** SHALL return stats object with `total`, `available`, `used`

#### Scenario: Create backup key in database
- **Given** valid input data `{ id, apiKey }`
- **When** calling `createBackupKey(data)`
- **Then** the system SHALL insert document into `ohmygpt_backup_keys`
- **And** the document SHALL have:
  - `_id: data.id`
  - `apiKey: data.apiKey`
  - `isUsed: false`
  - `activated: false`
  - `createdAt: current Date`
- **And** SHALL return the created document

#### Scenario: Delete backup key from database
- **Given** a backup key with given `id` exists
- **When** calling `deleteBackupKey(id)`
- **Then** the system SHALL delete document from `ohmygpt_backup_keys`
- **And** SHALL return `true` if document was deleted
- **And** SHALL return `false` if document not found

#### Scenario: Restore backup key in database
- **Given** a backup key with `isUsed: true` exists
- **When** calling `restoreBackupKey(id)`
- **Then** the system SHALL update the document with:
  - `isUsed: false`
  - `activated: false`
  - `usedFor: null`
  - `usedAt: null`
- **And** SHALL return `true` if document was updated
- **And** SHALL return `false` if document not found

