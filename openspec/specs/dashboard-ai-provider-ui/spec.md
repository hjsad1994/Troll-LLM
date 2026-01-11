# dashboard-ai-provider-ui Specification

## Purpose
TBD - created by archiving change add-dual-domain-ai-provider-display. Update Purpose after archive.
## Requirements
### Requirement: Display Dual AI Provider Endpoints

The dashboard MUST display two distinct AI Provider URL options with their respective rate information to allow users to choose between standard and premium endpoints.

#### Scenario: User views AI Provider section in dashboard

**Given** a user is logged into their dashboard
**When** they view the API Key card's AI Provider section
**Then** they should see two distinct endpoint options:
- Standard endpoint: `https://chat.trollllm.xyz` with rate badge "1500 VND/$1"
- Premium endpoint: `https://chat2.trollllm.xyz` with rate badge "2500 VND/$1"

**And** each endpoint should have:
- A clearly visible URL
- A rate badge showing the VND/USD conversion rate
- A copy-to-clipboard button
- Visual styling appropriate to its tier (standard vs premium)

**And** the standard endpoint should be displayed first (primary position)

#### Scenario: User copies standard endpoint URL

**Given** the user sees both AI Provider endpoints
**When** they click the copy button for the standard endpoint (`https://chat.trollllm.xyz`)
**Then** the URL should be copied to their clipboard
**And** the button should show feedback (e.g., "Copied!" text change or check icon)
**And** the feedback should reset after 2 seconds

#### Scenario: User copies premium endpoint URL

**Given** the user sees both AI Provider endpoints
**When** they click the copy button for the premium endpoint (`https://chat2.trollllm.xyz`)
**Then** the URL should be copied to their clipboard
**And** the button should show feedback (e.g., "Copied!" text change or check icon)
**And** the feedback should reset after 2 seconds

#### Scenario: User views on mobile device

**Given** a user accesses the dashboard on a mobile device (width < 640px)
**When** they view the AI Provider section
**Then** both endpoints should display in a stacked vertical layout
**And** all text should be readable without horizontal scrolling
**And** copy buttons should be easily tappable (minimum 44px touch target)

---

### Requirement: Internationalization Support for Rate Information

The AI Provider section MUST support both English and Vietnamese translations for rate labels and descriptions.

#### Scenario: English user views rate information

**Given** a user has selected English as their language preference
**When** they view the AI Provider section
**Then** the standard endpoint should show rate information in English
- Label: "Standard Rate" or "Rate: 1500 VND/$1"
- Description/subtitle if present should be in English

**And** the premium endpoint should show rate information in English
- Label: "Premium Rate" or "Rate: 2500 VND/$1"
- Description/subtitle if present should be in English

#### Scenario: Vietnamese user views rate information

**Given** a user has selected Vietnamese as their language preference
**When** they view the AI Provider section
**Then** the standard endpoint should show rate information in Vietnamese
- Label: "Tỷ giá chuẩn" or "Tỷ giá: 1500 VND/$1"
- Description/subtitle if present should be in Vietnamese

**And** the premium endpoint should show rate information in Vietnamese
- Label: "Tỷ giá cao" or "Tỷ giá: 2500 VND/$1"
- Description/subtitle if present should be in Vietnamese

---

### Requirement: Visual Distinction Between Endpoint Tiers

The UI MUST provide clear visual distinction between standard and premium endpoints to help users understand the difference at a glance.

#### Scenario: User compares endpoint options visually

**Given** a user views the AI Provider section
**When** they look at both endpoints
**Then** the standard endpoint should have:
- A neutral color scheme (e.g., slate/gray borders and backgrounds)
- Standard styling without premium indicators
- Rate badge in a subtle color (e.g., emerald or blue)

**And** the premium endpoint should have:
- A distinct color scheme indicating premium tier (e.g., amber/orange or gradient)
- Optional premium indicator icon (e.g., lightning bolt, star)
- Rate badge in a warm color (e.g., amber, orange)

**And** the visual hierarchy should make it clear which is standard and which is premium without requiring users to read the rate numbers

