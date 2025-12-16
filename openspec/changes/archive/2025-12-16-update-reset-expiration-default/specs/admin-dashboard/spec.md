## MODIFIED Requirements

### Requirement: User Credits Management
Admin SHALL be able to set or add credits to user accounts with optional expiration reset.

The Reset Expiration checkbox SHALL default to **unchecked** when the Users page loads, requiring admin to explicitly opt-in to reset the user's subscription expiration date.

#### Scenario: Reset Expiration checkbox default state
- **WHEN** admin navigates to the Users management page
- **THEN** the "Reset Expiration" checkbox SHALL be unchecked by default

#### Scenario: Admin sets credits without resetting expiration
- **WHEN** admin enters an amount and clicks SET without checking "Reset Expiration"
- **THEN** the user's credits SHALL be updated to the specified amount
- **AND** the user's expiration date SHALL remain unchanged

#### Scenario: Admin adds credits without resetting expiration
- **WHEN** admin enters an amount and clicks ADD without checking "Reset Expiration"
- **THEN** the specified amount SHALL be added to the user's credits
- **AND** the user's expiration date SHALL remain unchanged

#### Scenario: Admin explicitly resets expiration
- **WHEN** admin checks the "Reset Expiration" checkbox
- **AND** admin clicks SET or ADD
- **THEN** the user's expiration date SHALL be reset based on subscription plan
