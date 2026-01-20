# dashboard-ai-provider-ui Specification

## Purpose
TBD - created by archiving change add-dual-domain-ai-provider-display. Update Purpose after archive.
## Requirements
### Requirement: Display Dual AI Provider Endpoints

The dashboard SHALL display only the standard AI Provider endpoint. The premium endpoint (`chat2.trollllm.xyz`) SHALL be temporarily hidden from the UI but remain functional in the backend.

#### Scenario: User views AI Provider section in dashboard

**Given** a user is logged into their dashboard
**When** they view the API Key card's AI Provider section
**Then** they should see only the standard endpoint:
- Standard endpoint: `https://chat.trollllm.xyz` with rate badge "1500 VND/$1"

**And** the endpoint should have:
- A clearly visible URL
- A rate badge showing the VND/USD conversion rate
- A copy-to-clipboard button
- Visual styling appropriate to the standard tier

**And** the premium endpoint (`https://chat2.trollllm.xyz`) SHALL NOT be visible in the UI
**And** the premium endpoint code SHALL remain in the codebase as commented code

#### Scenario: User copies standard endpoint URL

**Given** the user sees the AI Provider endpoint
**When** they click the copy button for the standard endpoint (`https://chat.trollllm.xyz`)
**Then** the URL should be copied to their clipboard
**And** the button should show feedback (e.g., "Copied!" text change or check icon)
**And** the feedback should reset after 2 seconds

#### Scenario: Premium endpoint code preserved in codebase

**Given** a developer inspects the dashboard source code
**When** they review the AI Provider section component
**Then** the premium endpoint display code SHALL be present but commented out
**And** comments SHALL clearly mark the section as "LEGACY CREDITS - TEMPORARILY HIDDEN"
**And** the code SHALL be easily uncommentable for future re-enablement

#### Scenario: User views on mobile device

**Given** a user accesses the dashboard on a mobile device (width < 640px)
**When** they view the AI Provider section
**Then** the standard endpoint should display correctly in mobile layout
**And** all text should be readable without horizontal scrolling
**And** copy button should be easily tappable (minimum 44px touch target)

---

### Requirement: Internationalization Support for Rate Information

The AI Provider section SHALL support both English and Vietnamese translations for the standard endpoint rate labels and descriptions only.

#### Scenario: English user views rate information

**Given** a user has selected English as their language preference
**When** they view the AI Provider section
**Then** the standard endpoint should show rate information in English
- Label: "Standard Rate" or "Rate: 1500 VND/$1"
- Description/subtitle if present should be in English

#### Scenario: Vietnamese user views rate information

**Given** a user has selected Vietnamese as their language preference
**When** they view the AI Provider section
**Then** the standard endpoint should show rate information in Vietnamese
- Label: "Tỷ giá chuẩn" or "Tỷ giá: 1500 VND/$1"
- Description/subtitle if present should be in Vietnamese

---

### Requirement: Visual Distinction Between Endpoint Tiers

The UI SHALL display only the standard endpoint with appropriate styling. Premium tier visual indicators SHALL be hidden.

#### Scenario: User views standard endpoint

**Given** a user views the AI Provider section
**When** they look at the endpoint
**Then** the standard endpoint should have:
- A neutral color scheme (e.g., slate/gray borders and backgrounds)
- Standard styling without premium indicators
- Rate badge in a subtle color (e.g., emerald or blue)

**And** no premium tier visual elements SHALL be displayed

