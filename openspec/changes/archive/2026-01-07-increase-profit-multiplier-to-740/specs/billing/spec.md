# Spec Delta: Billing

## MODIFIED Requirements

### Requirement: Profit multiplier for billing calculations

**ADDED** The profit multiplier SHALL be **740 VND per $1** of credits sold.

**REMOVED** The profit multiplier of 665 VND per $1.

#### Scenario: Calculate profit for a successful payment after cutoff date

**GIVEN** a payment with status "success"
**AND** the payment was completed on or after 2026-01-06 20:49:00 (VN timezone)
**AND** the payment has credits = 20 USD
**WHEN** profit is calculated
**THEN** profit SHALL be: `20 × 740 = 14,800 VND`

#### Scenario: Display total profit in admin billing dashboard

**GIVEN** the admin billing page at `/admin/billing`
**AND** there are 5 successful payments with 20 credits each after the cutoff date
**WHEN** the total profit is calculated
**THEN** total profit SHALL be: `5 × 20 × 740 = 74,000 VND`

#### Scenario: Profit calculation for payments before cutoff date

**GIVEN** a payment with status "success"
**AND** the payment was completed before 2026-01-06 20:49:00 (VN timezone)
**WHEN** profit is calculated
**THEN** profit SHALL be 0 VND (regardless of the multiplier change)
