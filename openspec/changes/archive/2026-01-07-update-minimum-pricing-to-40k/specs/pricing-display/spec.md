# pricing-display Specification

## MODIFIED Requirements

### Requirement: Minimum Pricing Display

The pricing page SHALL display the correct minimum purchase amount in Vietnamese Dong (VND) based on the current VND exchange rate and minimum credit purchase requirement.

#### Scenario: Pricing page shows correct minimum VND amount

- **GIVEN** the VND exchange rate is 2.500 VND per $1 USD
- **AND** the minimum credit purchase is $16 USD
- **WHEN** a user views the pricing section on the landing page (/#pricing)
- **THEN** the pricing card SHALL display **"40.000VND tối thiểu"** (40.000 VND minimum)
- **AND** the amount SHALL match the actual minimum checkout amount

#### Scenario: Consistency across pricing components

- **GIVEN** the minimum pricing is displayed on the landing page
- **WHEN** a user clicks "Mua ngay" (Buy Now) to proceed to checkout
- **THEN** the checkout page minimum slider SHALL start at $16 USD (40.000 VND)
- **AND** the amounts SHALL be consistent between landing page and checkout

#### Scenario: Display format validation

- **GIVEN** the pricing page is rendered
- **WHEN** displaying the minimum amount
- **THEN** the number SHALL use Vietnamese number format with dots as thousand separators (40.000)
- **AND** the text SHALL include "VND" currency indicator
- **AND** the text SHALL include "tối thiểu" (minimum) label in Vietnamese

## Rationale

This change corrects a display inconsistency where the landing page showed "20.000VND tối thiểu" while the actual minimum purchase was $16 (40.000 VND at 2.500 VND/$1 rate). The backend already correctly enforces the $16 minimum; this update aligns the frontend display with the implemented business logic.

## Related Requirements

- **billing:** Payment minimum validation (enforces $16 minimum in checkout)
- **documentation:** Pricing page content accuracy
