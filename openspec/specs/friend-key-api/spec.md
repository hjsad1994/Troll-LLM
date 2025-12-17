# friend-key-api Specification

## Purpose
TBD - created by archiving change fix-friend-key-openhands-403. Update Purpose after archive.
## Requirements
### Requirement: Friend Key Credits-Only Validation
The system SHALL validate Friend Key requests based on owner's credits balance only, regardless of their plan tier.

#### Scenario: Owner has credits
- **WHEN** a request is made using a Friend Key
- **AND** the owner has credits > 0 OR refCredits > 0
- **THEN** the request SHALL be allowed to proceed
- **AND** the owner's plan tier SHALL NOT affect validation

#### Scenario: Owner has no credits
- **WHEN** a request is made using a Friend Key
- **AND** the owner has credits <= 0 AND refCredits <= 0
- **THEN** return 402 Payment Required
- **AND** the error message SHALL be "Friend Key owner has insufficient tokens"

### Requirement: Friend Key OpenHands Error Handling
The system SHALL handle errors from OpenHands upstream with key rotation and sanitized error messages.

#### Scenario: OpenHands upstream returns 403
- **WHEN** a Friend Key request is forwarded to OpenHands and OpenHands returns 403
- **THEN** the system SHALL attempt key rotation to a backup OpenHands key
- **AND** if no backup keys are available, return a sanitized 403 error
- **AND** log the upstream error for debugging

#### Scenario: All OpenHands keys exhausted
- **WHEN** all OpenHands keys in the pool are exhausted or disabled
- **THEN** return a sanitized error response
- **AND** the error SHALL indicate upstream service issue

### Requirement: Friend Key Validation Error Messages
The system SHALL return specific, actionable error messages for Friend Key validation failures.

#### Scenario: Validation failure with specific cause
- **WHEN** Friend Key validation fails for any reason
- **THEN** the error response SHALL include:
  - HTTP status code appropriate to the failure type
  - Error message describing the specific failure
  - Error type for programmatic handling
- **AND** the message SHALL NOT expose internal implementation details

