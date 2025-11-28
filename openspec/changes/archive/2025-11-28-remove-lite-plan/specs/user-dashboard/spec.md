## MODIFIED Requirements

### Requirement: Plan Configuration
The system SHALL support different user plans with varying token limits.

#### Scenario: Free plan limits
- **WHEN** user has plan "free"
- **THEN** monthly token limit SHALL be 0
- **AND** total token quota SHALL be 0
- **AND** RPM limit SHALL be 0

#### Scenario: Dev plan limits
- **WHEN** user has plan "dev"
- **THEN** monthly token limit SHALL be 15,000,000
- **AND** total token quota SHALL be 15,000,000
- **AND** RPM limit SHALL be 300

#### Scenario: Pro plan limits
- **WHEN** user has plan "pro"
- **THEN** monthly token limit SHALL be 40,000,000
- **AND** total token quota SHALL be 40,000,000
- **AND** RPM limit SHALL be 600
