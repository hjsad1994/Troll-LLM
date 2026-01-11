# Spec: Rate Display

## MODIFIED Requirements

### Requirement: Display Current Exchange Rate and Purchase Limits

The system MUST display the current VND to USD exchange rate (1500 VND = $1) and enforce minimum purchase of $20 consistently across all user-facing pricing interfaces.

#### Scenario: User views pricing section
**Given** a user visits the homepage pricing section
**When** they view the exchange rate banner
**Then** they should see "1,500 VND = $1" in English
**And** they should see "1.500 VND = $1" in Vietnamese
**And** they should see "Minimum: $20" in English
**And** they should see "Mua tối thiểu: $20" in Vietnamese

#### Scenario: User selects amount on checkout page
**Given** a user is on the checkout page
**When** they view the quick select buttons
**Then** they should see options for $30, $40, $50, $60, and $80
**And** the slider minimum MUST be $20
**And** the slider maximum MUST be $100
**When** they select or adjust the credit amount
**Then** the displayed VND amount MUST equal (credit_amount × 1500)
**And** the calculation MUST use VND_RATE = 1500
**And** all quick select VND amounts MUST be divisible by 1000 (no 500 fractions)

#### Scenario: User opens dashboard payment modal
**Given** a user opens the payment modal from dashboard
**When** they view the quick select buttons
**Then** they should see options for $30, $40, $50, $60, and $80
**And** the slider minimum MUST be $20
**And** the slider maximum MUST be $100
**When** they adjust the credit amount slider
**Then** the displayed VND amount MUST equal (credit_amount × 1500)
**And** the summary section MUST show the correct VND total
**And** all quick select VND amounts MUST be divisible by 1000 (no 500 fractions)

### Requirement: Quick Select Button Values

The system MUST provide predefined quick select amounts for user convenience.

#### Scenario: Quick select buttons display correct values
**Given** a user is on the checkout page or dashboard modal
**When** they view the quick select buttons
**Then** the buttons MUST display exactly: $30, $40, $50, $60, $80
**And** NOT display: $16, $25, $35, or $100
**And** all amounts MUST result in round VND values (divisible by 1000, not 500)
**When** they click a quick select button
**Then** the slider MUST jump to that amount
**And** the VND calculation MUST update immediately
**And** the VND amount MUST NOT contain fractional thousands (e.g., 10,500 or 37,500 are invalid)

### Requirement: Rate Consistency Across Components

The exchange rate MUST be consistent between frontend display and backend processing.

#### Scenario: Frontend matches backend configuration
**Given** the backend payment config returns vndRate: 1500
**When** a user views any pricing interface
**Then** the frontend MUST display the same rate as the backend
**And** calculations MUST produce identical VND amounts

#### Scenario: Language-specific formatting
**Given** the exchange rate is 1500 VND per dollar
**When** displaying in English
**Then** the format MUST be "1,500 VND = $1" (comma separator)
**When** displaying in Vietnamese
**Then** the format MUST be "1.500 VND = $1" (period separator)

### Requirement: Accurate VND Amount Calculation

All VND amounts MUST be calculated using the correct exchange rate of 1500 and respect the new minimum of $20. All VND amounts MUST be round numbers divisible by 1000.

#### Scenario: Calculate VND for minimum purchase
**Given** the minimum purchase amount is $20
**When** the system calculates the VND equivalent
**Then** it MUST show 30,000 VND (divisible by 1000)
**And** NOT show 40,000 VND (old minimum at old rate)
**And** NOT allow purchases below $20
**And** the amount MUST be a round number with no fractional thousands

#### Scenario: Calculate VND for quick select amounts
**Given** a user selects a quick select amount
**When** the amount is $30
**Then** the system MUST display 45,000 VND (divisible by 1000 ✓)
**When** the amount is $40
**Then** the system MUST display 60,000 VND (divisible by 1000 ✓)
**When** the amount is $50
**Then** the system MUST display 75,000 VND (divisible by 1000 ✓)
**When** the amount is $60
**Then** the system MUST display 90,000 VND (divisible by 1000 ✓)
**When** the amount is $80
**Then** the system MUST display 120,000 VND (divisible by 1000 ✓)
**And** NEVER display amounts with 500 fractions like 37,500 or 52,500

#### Scenario: VND amounts must be round numbers
**Given** a user adjusts the credit amount slider
**When** the resulting VND amount would contain fractional thousands
**Then** the system MUST round to the nearest 1000 VND
**Or** restrict slider steps to only allow amounts that produce round VND values
**And** NEVER display amounts like 10,500 or 33,750 with odd fractional thousands

#### Scenario: Calculate VND for maximum purchase
**Given** the maximum purchase amount is $100
**When** the system calculates the VND equivalent
**Then** it MUST show 150,000 VND
**And** NOT show 250,000 VND (old rate)

## Related Capabilities

- **billing**: Backend payment processing uses the same rate
- **documentation**: API documentation may reference payment rates
