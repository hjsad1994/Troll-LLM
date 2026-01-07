## ADDED Requirements

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
