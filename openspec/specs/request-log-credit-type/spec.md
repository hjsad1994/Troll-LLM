# request-log-credit-type Specification

## Purpose

Track which credit system (OhMyGPT vs OpenHands) was used for each request to enable period-based aggregation of credit spending metrics.

## Requirements

### Requirement: RequestLog Credit Type Tracking

The RequestLog model SHALL track which credit system was charged for each request to enable period-based aggregation of both OhMyGPT and OpenHands credit spending.

#### Scenario: RequestLog includes creditType field
- **WHEN** a new request is logged to the `request_logs` collection
- **THEN** the document SHALL include a `creditType` field
- **AND** `creditType` SHALL be either "ohmygpt" or "openhands"
- **AND** `creditType` SHALL indicate which credit field was charged for billing
- **AND** the field SHALL be optional (not required) for backward compatibility

#### Scenario: OhMyGPT requests log creditType as ohmygpt
- **WHEN** a request is processed using the OhMyGPT billing path
- **AND** credits are deducted from the `credits` or `refCredits` fields
- **THEN** the RequestLog entry SHALL include `creditType: "ohmygpt"`
- **AND** this SHALL occur regardless of which upstream provider handled the request
- **AND** both goproxy-ohmygpt (port 8005) and goproxy-openhands (port 8004) SHALL correctly log "ohmygpt" when using OhMyGPT billing

#### Scenario: OpenHands requests log creditType as openhands
- **WHEN** a request is processed using the OpenHands billing path
- **AND** credits are deducted from the `creditsNew` field
- **THEN** the RequestLog entry SHALL include `creditType: "openhands"`
- **AND** this SHALL occur when billing_upstream is configured as "openhands"
- **AND** goproxy-openhands container (port 8004) SHALL log "openhands" for chat.trollllm.xyz requests

#### Scenario: Legacy requests without creditType default to ohmygpt
- **WHEN** a RequestLog document exists without a `creditType` field
- **THEN** aggregation queries SHALL treat it as `creditType: "ohmygpt"` for backward compatibility
- **AND** existing logs SHALL NOT require migration or updates
- **AND** statistics SHALL include these legacy logs in OhMyGPT totals

### Requirement: Go Proxy Credit Type Logging

The Go proxy SHALL include credit type information when logging requests to the RequestLog collection.

#### Scenario: RequestLogParams includes creditType field
- **WHEN** the Go proxy defines the `RequestLogParams` struct
- **THEN** the struct SHALL include a `CreditType string` field
- **AND** the `RequestLog` struct SHALL include a `CreditType string` field with bson tag `creditType,omitempty`
- **AND** the logging function SHALL persist this field to MongoDB

#### Scenario: Billing logic determines creditType
- **WHEN** a request is processed and billing is applied
- **THEN** the system SHALL determine creditType based on `billing_upstream` configuration
- **AND** if `billing_upstream == "openhands"`, creditType SHALL be "openhands"
- **AND** otherwise, creditType SHALL be "ohmygpt"
- **AND** this value SHALL be passed to `LogRequestDetailed()`

### Requirement: Backend Period-Based OpenHands Credit Aggregation

The backend user repository SHALL aggregate OpenHands credit spending from RequestLog based on the selected period filter.

#### Scenario: getUserStats aggregates creditsNewUsed from RequestLog
- **WHEN** `userRepository.getUserStats(period)` is called with any period value
- **THEN** the function SHALL query RequestLog collection for documents where `creditType == "openhands"`
- **AND** the function SHALL apply the period date filter to this query
- **AND** the function SHALL sum the `creditsCost` field from matching documents
- **AND** the result SHALL be returned as `totalCreditsNewUsed`

#### Scenario: Period filter applies to OpenHands credit aggregation
- **WHEN** `getUserStats()` is called with a specific period (1h, 3h, 8h, 24h, 7d)
- **THEN** the OpenHands credit aggregation SHALL include only RequestLog documents where `createdAt` is within the period
- **AND** the aggregation SHALL filter by `creditType: "openhands"`
- **AND** the calculation SHALL match the existing period logic for OhMyGPT credits

#### Scenario: All period includes all OpenHands credits
- **WHEN** `getUserStats()` is called with `period = "all"`
- **THEN** the OpenHands credit aggregation SHALL include all RequestLog documents where `creditType: "openhands"`
- **AND** no date filter SHALL be applied
- **AND** the result SHALL reflect all OpenHands spending within RequestLog retention period (30 days)

#### Scenario: Backward compatibility with legacy logs
- **WHEN** aggregating OpenHands credits from RequestLog
- **THEN** the query SHALL match documents where `creditType == "openhands"` explicitly
- **AND** documents without `creditType` field SHALL NOT be included in OpenHands totals
- **AND** documents without `creditType` field SHALL be included in OhMyGPT totals by default
- **AND** this ensures accurate separation of the two credit systems

### Requirement: Admin Dashboard Period-Responsive Display

The admin dashboard SHALL display OpenHands credit spending that responds to the selected period filter.

#### Scenario: New Burned metric respects period filter
- **WHEN** an admin views the admin dashboard at `/admin`
- **AND** a period filter is selected (1h, 3h, 8h, 24h, 7d, or all)
- **THEN** the "New Burned" metric SHALL display OpenHands credits spent during the selected period
- **AND** the value SHALL be calculated from RequestLog entries where `creditType == "openhands"` within the period
- **AND** the display SHALL update when the period filter changes

#### Scenario: New Burned metric changes when period filter changes
- **WHEN** an admin selects a different period filter
- **THEN** the "New Burned" metric SHALL update to show OpenHands credits spent during the newly selected period
- **AND** the API SHALL be called with the new period parameter
- **AND** the displayed value SHALL reflect the filtered timeframe
- **AND** the behavior SHALL match the "Burned" metric's period filtering behavior
