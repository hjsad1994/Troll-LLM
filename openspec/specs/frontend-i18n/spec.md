# frontend-i18n Specification

## Purpose
TBD - created by archiving change add-i18n-models-docs. Update Purpose after archive.
## Requirements
### Requirement: Models Page Localization
The system SHALL display all text content on the Models page (`/models`) in the user's selected language (Vietnamese or English).

#### Scenario: User views Models page in Vietnamese
- **WHEN** user has selected Vietnamese language
- **THEN** all page text displays in Vietnamese including:
  - Page title, description, and badge
  - Table headers and labels
  - Search placeholder
  - Provider filter names
  - Promotion banner text
  - CTA section and footer

#### Scenario: User views Models page in English
- **WHEN** user has selected English language
- **THEN** all page text displays in English

### Requirement: Docs Page Localization
The system SHALL display all text content on the Docs page (`/docs`) in the user's selected language (Vietnamese or English).

#### Scenario: User views Docs page in Vietnamese
- **WHEN** user has selected Vietnamese language
- **THEN** all page text displays in Vietnamese including:
  - Sidebar navigation titles
  - Page title and description
  - Section headings
  - Card titles and descriptions
  - Tips and notes
  - Search placeholder

#### Scenario: User views Docs page in English
- **WHEN** user has selected English language
- **THEN** all page text displays in English

### Requirement: Docs Quickstart Page Localization
The system SHALL display all text content on the Docs Quickstart page (`/docs/quickstart`) in the user's selected language (Vietnamese or English).

#### Scenario: User views Quickstart page in Vietnamese
- **WHEN** user has selected Vietnamese language
- **THEN** all page text displays in Vietnamese including:
  - Page title and description
  - Step titles and instructions
  - Code block titles
  - Tips and notes

#### Scenario: User views Quickstart page in English
- **WHEN** user has selected English language
- **THEN** all page text displays in English

### Requirement: Docs Integrations Pages Localization
The system SHALL display all text content on the Docs Integrations pages (`/docs/integrations/*`) in the user's selected language (Vietnamese or English).

#### Scenario: User views Kilo Code integration page in Vietnamese
- **WHEN** user has selected Vietnamese language
- **AND** navigates to `/docs/integrations/kilo-code`
- **THEN** all page text displays in Vietnamese

#### Scenario: User views Roo Code integration page in Vietnamese
- **WHEN** user has selected Vietnamese language
- **AND** navigates to `/docs/integrations/roo-code`
- **THEN** all page text displays in Vietnamese

#### Scenario: User views Claude Code integration page in Vietnamese
- **WHEN** user has selected Vietnamese language
- **AND** navigates to `/docs/integrations/claude-code`
- **THEN** all page text displays in Vietnamese

#### Scenario: User views Droid integration page in Vietnamese
- **WHEN** user has selected Vietnamese language
- **AND** navigates to `/docs/integrations/droid`
- **THEN** all page text displays in Vietnamese

### Requirement: Language Persistence Across Pages
The system SHALL maintain the user's language preference when navigating between pages.

#### Scenario: Language persists from homepage to models
- **WHEN** user selects Vietnamese on homepage
- **AND** navigates to Models page
- **THEN** Models page displays in Vietnamese

#### Scenario: Language persists from models to docs
- **WHEN** user selects English on Models page
- **AND** navigates to Docs page
- **THEN** Docs page displays in English

### Requirement: Pricing Countdown Sale Translations
The system SHALL provide translations for the pricing page countdown sale timer in both English and Vietnamese.

#### Scenario: Display countdown labels in English
- **WHEN** user views pricing page with English language
- **THEN** countdown displays "Sale ends in", "Days", "Hours", "Minutes", "Seconds"

#### Scenario: Display countdown labels in Vietnamese
- **WHEN** user views pricing page with Vietnamese language
- **THEN** countdown displays "Khuyến mãi kết thúc sau", "Ngày", "Giờ", "Phút", "Giây"

