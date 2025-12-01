## ADDED Requirements

### Requirement: Admin Dashboard - Time Period Filter
The admin dashboard SHALL allow filtering metrics by time period.

#### Scenario: Filter metrics by time period
- **WHEN** admin views the dashboard at `/admin`
- **THEN** the page SHALL display period filter options (1h, 24h, 7d, All)
- **AND** clicking a period SHALL re-fetch metrics for that time range
- **AND** the selected period SHALL be visually indicated
- **AND** metrics card SHALL display the current period context
