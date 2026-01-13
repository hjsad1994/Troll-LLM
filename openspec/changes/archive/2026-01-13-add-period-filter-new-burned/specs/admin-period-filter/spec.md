# admin-period-filter Specification

## Purpose

Enable period-based filtering for OpenHands credit spending metrics in the admin dashboard by tracking which credit system (OhMyGPT vs OpenHands) was used for each request.

## ADDED Requirements

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

#### Scenario: DeductCreditsOhMyGPT logs ohmygpt credit type
- **WHEN** `DeductCreditsOhMyGPT()` function successfully deducts credits
- **AND** the request is logged via `LogRequestDetailed()`
- **THEN** the log parameters SHALL include `creditType: "ohmygpt"`
- **AND** the RequestLog document SHALL store this value in the `creditType` field

#### Scenario: DeductCreditsOpenHands logs openhands credit type
- **WHEN** `DeductCreditsOpenHands()` function successfully deducts credits
- **AND** the request is logged via `LogRequestDetailed()`
- **THEN** the log parameters SHALL include `creditType: "openhands"`
- **AND** the RequestLog document SHALL store this value in the `creditType` field

#### Scenario: RequestLogParams includes creditType field
- **WHEN** the Go proxy defines the `RequestLogParams` struct
- **THEN** the struct SHALL include a `CreditType string` field
- **AND** the `RequestLog` struct SHALL include a `CreditType string` field with bson tag `creditType,omitempty`
- **AND** the logging function SHALL persist this field to MongoDB

### Requirement: Backend Period-Based OpenHands Credit Aggregation

The backend user repository SHALL aggregate OpenHands credit spending from RequestLog based on the selected period filter.

#### Scenario: getUserStats aggregates creditsNewUsed from RequestLog
- **WHEN** `userRepository.getUserStats(period)` is called with any period value
- **THEN** the function SHALL query RequestLog collection for documents where `creditType == "openhands"`
- **AND** the function SHALL apply the period date filter to this query
- **AND** the function SHALL sum the `creditsCost` field from matching documents
- **AND** the result SHALL be returned as `totalCreditsNewUsed`

#### Scenario: Period filter applies to OpenHands credit aggregation
- **WHEN** `getUserStats()` is called with `period = "1h"`
- **THEN** the OpenHands credit aggregation SHALL include only RequestLog documents where `createdAt >= (now - 1 hour)`
- **AND** the aggregation SHALL filter by `creditType: "openhands"`

#### Scenario: Period filter applies to 24h OpenHands credit aggregation
- **WHEN** `getUserStats()` is called with `period = "24h"`
- **THEN** the OpenHands credit aggregation SHALL include only RequestLog documents where `createdAt >= start of today in Vietnam timezone (UTC+7)`
- **AND** the calculation SHALL match the existing 24h logic for OhMyGPT credits
- **AND** the result SHALL show OpenHands credits spent from 00:00:00 Vietnam time today

#### Scenario: All period includes all OpenHands credits
- **WHEN** `getUserStats()` is called with `period = "all"`
- **THEN** the OpenHands credit aggregation SHALL include all RequestLog documents where `creditType: "openhands"`
- **AND** no date filter SHALL be applied
- **AND** the result SHALL match the lifetime `creditsNewUsed` total in user documents (within RequestLog retention period)

#### Scenario: Backward compatibility with legacy logs
- **WHEN** aggregating OpenHands credits from RequestLog
- **THEN** the query SHALL match documents where `creditType == "openhands"` explicitly
- **AND** documents without `creditType` field SHALL NOT be included in OpenHands totals
- **AND** documents without `creditType` field SHALL be included in OhMyGPT totals by default
- **AND** this ensures accurate separation of the two credit systems

## MODIFIED Requirements

### Requirement: Admin Dashboard Display of CreditsNew Statistics

The admin dashboard User Stats card SHALL display OpenHands credit statistics with visual distinction from OhMyGPT credits.

**Context**: This requirement is being modified to support period-based filtering for the "New Burned" metric.

**Changes**:
- Update scenario to clarify that "New Burned" respects the period filter
- Add scenario for period-responsive behavior

#### Scenario: User Stats card displays creditsNewUsed total (MODIFIED)
- **WHEN** an admin views the admin dashboard at `/admin`
- **AND** a period filter is selected (1h, 3h, 8h, 24h, 7d, or all)
- **THEN** the User Stats card SHALL display a row labeled "New Burned" or "OH Burned"
- **AND** the value SHALL represent OpenHands credits spent during the selected period
- **AND** the value SHALL be calculated from RequestLog entries where `creditType == "openhands"` within the period
- **AND** the value SHALL be formatted using the `formatCredits()` helper function
- **AND** the value SHALL use rose or red color scheme (e.g., `text-rose-500 dark:text-rose-400`)
- **AND** the row SHALL include a colored dot indicator matching the text color

#### Scenario: New Burned metric changes when period filter changes (ADDED)
- **WHEN** an admin selects a different period filter (e.g., changes from "all" to "1h")
- **THEN** the "New Burned" metric SHALL update to show OpenHands credits spent during the newly selected period
- **AND** the API SHALL be called with the new period parameter
- **AND** the displayed value SHALL reflect the filtered timeframe
- **AND** the behavior SHALL match the "Burned" metric's period filtering behavior
