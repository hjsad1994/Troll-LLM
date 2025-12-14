# openhands-ui Specification

## Purpose
Define the OpenHands key management user interface, including navigation, page routes, and display terminology. These pages replace the previous OhmyGPT pages with identical functionality under new branding.

## MODIFIED Requirements

### Requirement: OpenHands Keys Management Page
The system SHALL provide admin page at `/openhands-keys` for managing OpenHands API keys.

#### Scenario: Navigate to OpenHands keys page
- **WHEN** admin clicks "OpenHands Keys" in sidebar
- **THEN** browser SHALL navigate to `/openhands-keys`
- **AND** page title SHALL display "OpenHands Keys"

#### Scenario: Display page header
- **WHEN** page renders
- **THEN** header SHALL show "OpenHands Keys" title
- **AND** subtitle SHALL say "Manage OpenHands API keys"

#### Scenario: Stats display
- **WHEN** page loads keys
- **THEN** stats cards SHALL show: "Total", "Healthy", "Unhealthy" counts
- **AND** call `/admin/openhands/keys` API endpoint

#### Scenario: Add key button
- **WHEN** admin clicks "Add OpenHands Key" button
- **THEN** modal SHALL open with title "Add OpenHands Key"
- **AND** form SHALL submit to `/admin/openhands/keys` endpoint

### Requirement: OpenHands Backup Keys Page
The system SHALL provide admin page at `/openhands-backup-keys` for managing OpenHands backup keys for auto-rotation.

#### Scenario: Navigate to backup keys page
- **WHEN** admin clicks "OpenHands Backup Keys" in sidebar
- **THEN** browser SHALL navigate to `/openhands-backup-keys`
- **AND** page title SHALL display "OpenHands Backup Keys"

#### Scenario: Display backup keys info
- **WHEN** page renders
- **THEN** header SHALL show "OpenHands Backup Keys" title
- **AND** subtitle SHALL say "Manage backup keys for automatic rotation when OpenHands keys fail"

#### Scenario: Stats display for backup keys
- **WHEN** page loads
- **THEN** stats cards SHALL show: "Total Keys", "Available", "Used"
- **AND** call `/admin/openhands/backup-keys` API endpoint

#### Scenario: Info section
- **WHEN** page displays info section
- **THEN** title SHALL be "How OpenHands Backup Keys Work"
- **AND** description SHALL explain backup keys are used when active OpenHands keys fail (401/402/403)

### Requirement: Sidebar Navigation Update
The system SHALL update sidebar navigation to reflect OpenHands branding.

#### Scenario: Display OpenHands menu items
- **WHEN** admin views sidebar
- **THEN** navigation SHALL include "OpenHands Keys" link to `/openhands-keys`
- **AND** navigation SHALL include "OpenHands Backup Keys" link to `/openhands-backup-keys`
- **AND** Key Bindings page SHALL remain at `/admin/bindings`

#### Scenario: Active route highlighting
- **WHEN** admin is on `/openhands-keys` or `/openhands-backup-keys`
- **THEN** corresponding sidebar item SHALL be highlighted as active

### Requirement: Bindings Page OpenHands Terminology
The system SHALL update `/admin/bindings` page to display "OpenHands" terminology throughout the UI.

#### Scenario: Keys section header
- **WHEN** bindings page renders keys section
- **THEN** section header SHALL display "OpenHands Keys"
- **AND** "Add Key" button SHALL say "Add Key" (generic)

#### Scenario: Binding creation modal
- **WHEN** admin clicks "Add Binding"
- **THEN** modal SHALL have dropdown labeled "OpenHands Key"
- **AND** bindings list SHALL refer to "OpenHands keys" in context

#### Scenario: Table and display labels
- **WHEN** viewing bindings table
- **THEN** all references SHALL use "OpenHands" instead of "OhmyGPT"
- **AND** info section SHALL say "How Key Bindings Work" (generic, but context implies OpenHands)

## ADDED Requirements

### Requirement: Translation Key Updates
The system SHALL use new translation keys for OpenHands terminology in i18n system.

#### Scenario: English translations
- **WHEN** language is English
- **THEN** translation key `openhandsKeys` SHALL return "OpenHands Keys"
- **AND** translation key `openhandsBackupKeys` SHALL return "OpenHands Backup Keys"

#### Scenario: Vietnamese translations
- **WHEN** language is Vietnamese
- **THEN** translation key `openhandsKeys` SHALL return "OpenHands Keys" (or Vietnamese equivalent)
- **AND** translation key `openhandsBackupKeys` SHALL return "OpenHands Backups" (or Vietnamese equivalent)

#### Scenario: Nested translation objects
- **WHEN** components access `t.openhandsKeys.*` or `t.openhandsBackupKeys.*`
- **THEN** system SHALL provide nested translations for page content
- **AND** fallback to English if Vietnamese translation missing
