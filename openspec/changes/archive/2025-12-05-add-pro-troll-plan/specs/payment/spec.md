## ADDED Requirements

### Requirement: Pro Troll Plan Support
The system SHALL support three subscription plans: dev, pro, and pro-troll with the following pricing:
- Dev: 35,000 VND, 225 credits, 150 RPM
- Pro: 79,000 VND, 500 credits, 300 RPM  
- Pro Troll: 180,000 VND, 1250 credits, 600 RPM

#### Scenario: User selects Pro Troll plan
- **WHEN** user selects pro-troll plan on checkout page
- **THEN** system creates payment with amount 180,000 VND
- **AND** upon successful payment, user receives 1250 credits and 600 RPM limit

#### Scenario: Generate order code for Pro Troll
- **WHEN** creating checkout for pro-troll plan
- **THEN** order code starts with "TROLLPROTROLL"
