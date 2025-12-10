## REMOVED Requirements

### Requirement: User Plan Management
**Reason**: Hệ thống Plan được loại bỏ. Quyền truy cập API chỉ dựa trên credits.
**Migration**: Users với plan != 'free' cần được cấp credits trước khi deploy.

---

## MODIFIED Requirements

### Requirement: API Key Validation
The system SHALL validate API keys and check user credits balance before allowing API access.

#### Scenario: Valid API key with credits
- **WHEN** request contains valid API key in Authorization header
- **AND** user has credits > 0 OR refCredits > 0
- **THEN** request SHALL be processed
- **AND** credits SHALL be deducted based on usage

#### Scenario: Valid API key without credits
- **WHEN** request contains valid API key in Authorization header
- **AND** user has credits = 0 AND refCredits = 0
- **THEN** request SHALL be rejected with HTTP 402
- **AND** response body SHALL contain `error.type = "insufficient_credits"`
- **AND** response body SHALL contain message "Insufficient credits. Please top up to continue."

#### Scenario: Invalid API key
- **WHEN** request contains invalid API key
- **THEN** request SHALL be rejected with HTTP 401
- **AND** response body SHALL contain authentication error

---

### Requirement: Rate Limiting
The system SHALL enforce rate limiting based on default RPM for all users with credits.

#### Scenario: Rate limit for users with credits
- **WHEN** user has credits > 0 OR refCredits > 0
- **THEN** user SHALL have 300 RPM (requests per minute) limit
- **AND** this applies to all users regardless of credit amount

#### Scenario: Rate limit exceeded
- **WHEN** user exceeds 300 RPM
- **THEN** request SHALL be rejected with HTTP 429
- **AND** response SHALL include retry-after header
