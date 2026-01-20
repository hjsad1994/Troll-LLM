# cache-fallback-detection Specification

## Purpose
TBD - created by archiving change detect-ohmygpt-cache-fallback. Update Purpose after archive.
## Requirements
### Requirement: Detect OhMyGPT cache fallback events

The system SHALL detect when OhMyGPT upstream responses indicate cache tokens are missing when they should be present, and track these events in a sliding window.

#### Scenario: Large request to cache-enabled model with no cache tokens

**Given** a user sends a request to Claude Opus 4.5 via OhMyGPT
**And** the model supports prompt caching
**And** the request contains >1024 input tokens
**When** the response usage contains `cache_read_input_tokens: 0` and `cache_creation_input_tokens: 0`
**Then** the system SHALL identify this as a cache fallback event
**And** the system SHALL record the event with timestamp and model
**And** the system SHALL log the detection

#### Scenario: Small request with no cache (not a fallback)

**Given** a user sends a request to Claude Sonnet 4.5 via OhMyGPT
**And** the request contains <1024 input tokens
**When** the response contains no cache tokens
**Then** the system SHALL NOT identify this as a cache fallback event

#### Scenario: Non-cache model with no cache tokens

**Given** a user sends a request to GPT-4 via OhMyGPT
**And** the model does not support prompt caching
**When** the response contains no cache tokens
**Then** the system SHALL NOT identify this as a cache fallback event

#### Scenario: Request with cache tokens present

**Given** a user sends a request to Claude Haiku 4.5 via OhMyGPT
**And** the request contains >1024 input tokens
**When** the response contains `cache_read_input_tokens: 5000`
**Then** the system SHALL NOT identify this as a cache fallback event

### Requirement: Aggregate cache fallback events in sliding window

The system SHALL maintain a sliding window of cache fallback events and count events within the time window to determine if alerting is needed.

#### Scenario: Events are added to buffer and counted

**Given** the cache fallback detection is enabled
**And** the time window is configured to 1 minute
**When** 3 cache fallback events occur within 1 minute
**Then** the system SHALL store all 3 events in the buffer
**And** the event count SHALL be 3

#### Scenario: Old events expire outside time window

**Given** 5 cache fallback events have occurred
**And** the time window is 1 minute
**And** 2 events occurred 2 minutes ago
**When** the event count is calculated
**Then** only the 3 recent events SHALL be counted
**And** the event count SHALL be 3

#### Scenario: Buffer is cleared after alert is sent

**Given** threshold is reached and alert is sent
**When** the alert is successfully sent
**Then** the event buffer SHALL be cleared
**And** the event count SHALL reset to 0

### Requirement: Send email alert when threshold is reached

The system SHALL send an email notification via Resend API when the number of cache fallback events reaches the configured threshold within the time window, subject to rate limiting.

#### Scenario: Send email when threshold is reached

**Given** cache fallback detection is enabled
**And** the threshold is configured to 5 events
**And** the time window is 1 minute
**And** 5 cache fallback events occur within 1 minute
**And** no alert has been sent in the last 5 minutes
**When** the 5th event is recorded
**Then** the system SHALL send an email via Resend API to the configured recipient
**And** the email SHALL contain: total event count, time window, affected models with counts, total estimated loss
**And** the system SHALL log that the email was sent
**And** the event buffer SHALL be cleared

#### Scenario: No email when threshold not reached

**Given** cache fallback detection is enabled
**And** the threshold is configured to 5 events
**When** only 2 cache fallback events occur within the time window
**Then** the system SHALL NOT send an email alert

#### Scenario: Rate limit prevents email spam

**Given** cache fallback detection is enabled
**And** an email alert was sent 2 minutes ago
**When** 5 more cache fallback events occur
**Then** the system SHALL NOT send an email
**And** the system SHALL log that the alert was rate limited
**And** the events SHALL remain in the buffer

#### Scenario: Email send failure does not crash or clear buffer

**Given** cache fallback detection is enabled
**And** the threshold is reached
**When** the Resend API call fails due to network error
**Then** the system SHALL log the error
**And** the system SHALL NOT crash
**And** the rate limiter SHALL NOT be updated
**And** the event buffer SHALL NOT be cleared (allowing retry)

#### Scenario: Disabled detection does not send alerts

**Given** cache fallback detection is disabled via environment variable
**When** responses are received with no cache tokens
**Then** the system SHALL NOT record events
**And** the system SHALL NOT send any email alerts

#### Scenario: Email includes aggregated statistics

**Given** threshold is reached and email is sent
**When** the email content is generated
**Then** the email SHALL include:
- Total number of events in the time window
- Time window duration
- Total estimated cost loss across all events
- Breakdown of events by model (model name + count)

