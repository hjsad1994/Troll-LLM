## MODIFIED Requirements

### Requirement: Plan Configuration
The system SHALL support different user plans with varying token limits.

#### Scenario: Free plan limits
- **WHEN** user has plan "free"
- **THEN** monthly token limit SHALL be 0
- **AND** total token quota SHALL be 0
- **AND** RPM limit SHALL be 0
- **AND** user SHALL NOT be able to access API proxy

#### Scenario: Dev plan limits
- **WHEN** user has plan "dev"
- **THEN** plan value SHALL be $225 USD
- **AND** monthly token limit SHALL be calculated based on model pricing
- **AND** total token quota SHALL be calculated based on model pricing
- **AND** RPM limit SHALL be 300

#### Scenario: Pro plan limits
- **WHEN** user has plan "pro"
- **THEN** plan value SHALL be $600 USD
- **AND** monthly token limit SHALL be calculated based on model pricing
- **AND** total token quota SHALL be calculated based on model pricing
- **AND** RPM limit SHALL be 1000

---

## ADDED Requirements

### Requirement: Admin Pricing Dashboard
The system SHALL provide an admin UI for managing model pricing.

#### Scenario: View pricing dashboard
- **WHEN** admin navigates to `/admin/pricing`
- **THEN** the system SHALL display all model pricing in a table
- **AND** show modelId, displayName, input price, output price, status

#### Scenario: Edit model pricing via UI
- **WHEN** admin clicks "Edit" on a model pricing row
- **THEN** a form/modal SHALL appear with editable price fields
- **AND** admin can update inputPricePerMTok and outputPricePerMTok
- **AND** validation SHALL ensure prices are positive numbers

#### Scenario: Save pricing changes
- **WHEN** admin submits pricing changes
- **THEN** the system SHALL call `PUT /admin/pricing/:modelId`
- **AND** display success toast on successful update
- **AND** refresh the pricing table

#### Scenario: Add new model pricing
- **WHEN** admin clicks "Add Model" button
- **THEN** a form SHALL appear for entering new model details
- **AND** require modelId, displayName, inputPricePerMTok, outputPricePerMTok

---

### Requirement: Free Tier Upgrade Prompt
The system SHALL prompt Free Tier users to upgrade when they attempt to use restricted features.

#### Scenario: Display upgrade prompt for Free Tier
- **WHEN** Free Tier user views dashboard
- **THEN** the system SHALL display a banner indicating API access is restricted
- **AND** provide a link/button to upgrade plan

#### Scenario: Handle free_tier_restricted error
- **WHEN** API returns error type "free_tier_restricted"
- **THEN** the system SHALL display user-friendly upgrade message
- **AND** NOT show raw error details
