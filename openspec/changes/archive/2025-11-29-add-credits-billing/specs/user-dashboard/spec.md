## ADDED Requirements

### Requirement: Auto-Grant Credits on Plan Upgrade
The system SHALL automatically grant credits to users when their plan is upgraded by admin.

#### Scenario: Admin upgrades user to Dev plan
- **WHEN** admin sets user plan from Free to Dev
- **THEN** user receives $225 credits added to their balance

#### Scenario: Admin upgrades user to Pro plan
- **WHEN** admin sets user plan from Free to Pro
- **THEN** user receives $500 credits added to their balance

#### Scenario: Admin changes plan between paid tiers
- **WHEN** admin changes user plan from Dev to Pro
- **THEN** user receives the difference in credits ($500 - $225 = $275)

### Requirement: Deduct Credits Per Request
The system SHALL deduct credits from user balance based on actual API usage cost.

#### Scenario: User makes API request
- **WHEN** user makes a request to the API proxy
- **THEN** credits are deducted based on model pricing (input_price_per_mtok * input_tokens + output_price_per_mtok * output_tokens)

#### Scenario: Credit deduction calculation
- **WHEN** request uses Claude Opus (input=$5/MTok, output=$25/MTok)
- **AND** request uses 1000 input tokens and 500 output tokens
- **THEN** deducted amount = (5 * 1000 / 1_000_000) + (25 * 500 / 1_000_000) = $0.0175
