# billing Specification

## Purpose
TBD - created by archiving change disable-payments-temporarily. Update Purpose after archive.
## Requirements
### Requirement: Temporary Payment Disablement
The system SHALL provide the ability to temporarily disable payment functionality across the application while keeping other features accessible.

#### Scenario: Dashboard payment button disabled
- **WHEN** a user is on the dashboard page and payment functionality is disabled
- **THEN** the "Buy Credits" button SHALL be disabled or hidden
- **AND** a notice SHALL be displayed explaining payments are temporarily unavailable

#### Scenario: Checkout page shows maintenance notice
- **WHEN** a user navigates to /checkout while payment functionality is disabled
- **THEN** a maintenance notice SHALL be displayed
- **AND** the notice SHALL explain payments are temporarily unavailable
- **AND** the notice SHALL provide an option to return to the homepage

#### Scenario: Payment modal shows disabled message
- **WHEN** a user attempts to open the payment modal while payment functionality is disabled
- **THEN** the modal SHALL display a disabled notice
- **AND** the notice SHALL explain payments are temporarily unavailable

### Requirement: Payment Disablement Configuration
The system SHALL use a configuration flag to control payment functionality enablement.

#### Scenario: Configure payment disablement via environment variable
- **WHEN** the administrator sets the PAYMENTS_ENABLED environment variable to false
- **THEN** payment functionality SHALL be disabled across all frontend interfaces
- **AND** the configuration SHALL be read at build time or runtime

#### Scenario: Re-enable payments
- **WHEN** the administrator sets the PAYMENTS_ENABLED environment variable to true or removes it
- **THEN** payment functionality SHALL be restored
- **AND** all payment interfaces SHALL function normally

### Requirement: Profit Calculation and Display
The admin billing dashboard SHALL display profit information for successful payments based on the pricing policy.

#### Scenario: Profit column in payments table
- **WHEN** an administrator views the payments table at `/admin/billing`
- **THEN** a "Profit" column SHALL be displayed for each payment row
- **AND** profit SHALL be calculated as: `creditsUSD * 665` (profit per $1 sold)
- **AND** profit SHALL only be calculated for payments with `completedAt >= 2026-01-06 20:49:00` (VN timezone)
- **AND** profit for payments before the cutoff SHALL display as "0 VND"

#### Scenario: Total profit stat card
- **WHEN** an administrator views the billing dashboard
- **THEN** a "Total Profit" stat card SHALL be displayed
- **AND** the total SHALL aggregate profit from all successful payments in the filtered period
- **AND** only payments meeting the cutoff criteria SHALL be included in the total

#### Scenario: Profit API response field
- **WHEN** the backend API returns payment data
- **THEN** each payment SHALL include a `profitVND` field
- **AND** `profitVND` SHALL contain the calculated profit in VND (integer)
- **AND** `profitVND` SHALL be 0 for payments before the policy change date

#### Scenario: Profit calculation formula
- **WHEN** calculating profit for a payment
- **THEN** the selling price SHALL be 2500 VND per $1 USD
- **AND** the cost SHALL be 1835 VND per $1 USD
- **AND** the profit formula SHALL be: `profit = payment.credits * 665` (where 665 = 2500 - 1835)
- **AND** the result SHALL be an integer value in VND

#### Scenario: Date-based profit eligibility
- **WHEN** determining if a payment is eligible for profit calculation
- **THEN** payments SHALL use Vietnam timezone (UTC+7) for date comparison
- **AND** the cutoff datetime SHALL be `2026-01-06 20:49:00` in VN timezone
- **AND** payments with `completedAt >= cutoff` SHALL have profit calculated
- **AND** payments with `completedAt < cutoff` or `status != 'success'` SHALL have 0 profit

