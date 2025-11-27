## ADDED Requirements

### Requirement: Next.js Frontend Architecture
The system SHALL provide a modern React-based admin frontend using Next.js App Router with Tailwind CSS.

#### Scenario: Frontend project structure
- **WHEN** developer opens the `frontend/` directory
- **THEN** they see a standard Next.js 14+ project with App Router
- **AND** Tailwind CSS is configured and ready to use
- **AND** TypeScript is enabled for type safety

#### Scenario: Development mode
- **WHEN** developer runs `npm run dev` in frontend folder
- **THEN** Next.js development server starts with hot reload
- **AND** changes to code are reflected immediately

### Requirement: Dashboard Page
The system SHALL provide a dashboard page at the root route showing system status and overview.

#### Scenario: Access dashboard
- **WHEN** user navigates to `/`
- **THEN** dashboard page is displayed
- **AND** shows system status information
- **AND** shows quick links to other admin sections

### Requirement: API Keys Management
The system SHALL provide a page to manage API keys at `/keys` route.

#### Scenario: View API keys
- **WHEN** user navigates to `/keys`
- **THEN** list of API keys is displayed
- **AND** each key shows name, key value (masked), status, and usage

#### Scenario: Create API key
- **WHEN** user clicks "Create Key" button
- **AND** fills in key details
- **THEN** new API key is created
- **AND** key list is refreshed

#### Scenario: Delete API key
- **WHEN** user clicks delete on a key
- **AND** confirms deletion
- **THEN** API key is removed
- **AND** key list is refreshed

### Requirement: Factory Keys Management
The system SHALL provide a page to manage Factory API keys at `/factory-keys` route.

#### Scenario: View factory keys
- **WHEN** user navigates to `/factory-keys`
- **THEN** list of Factory keys is displayed with status and quota

#### Scenario: Add factory key
- **WHEN** user adds a new Factory key
- **THEN** key is validated and stored
- **AND** list is updated

### Requirement: Proxies Management
The system SHALL provide a page to manage proxy configurations at `/proxies` route.

#### Scenario: View proxies
- **WHEN** user navigates to `/proxies`
- **THEN** list of configured proxies is displayed

#### Scenario: Configure proxy
- **WHEN** user creates or edits a proxy configuration
- **THEN** proxy settings are saved
- **AND** changes take effect

### Requirement: Tailwind CSS Styling
The system SHALL use Tailwind CSS for all styling with a consistent design system.

#### Scenario: Responsive design
- **WHEN** user accesses admin panel on different devices
- **THEN** UI adapts to screen size (mobile, tablet, desktop)

#### Scenario: Consistent styling
- **WHEN** user navigates between pages
- **THEN** visual design remains consistent
- **AND** uses Tailwind utility classes

### Requirement: Backend API Integration
The frontend SHALL communicate with backend API for all data operations.

#### Scenario: API calls
- **WHEN** frontend needs data
- **THEN** it makes HTTP requests to backend API
- **AND** handles loading and error states appropriately

#### Scenario: Environment configuration
- **WHEN** frontend is deployed
- **THEN** API URL is configurable via environment variables
