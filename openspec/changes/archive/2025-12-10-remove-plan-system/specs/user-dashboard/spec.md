## REMOVED Requirements

### Requirement: Plan Configuration
**Reason**: Hệ thống Plan được loại bỏ hoàn toàn. Không còn các plan Free/Dev/Pro/Pro-Troll.
**Migration**: Users chỉ cần credits để sử dụng API.

---

### Requirement: Plan Expiration Tracking
**Reason**: Không còn plan nên không cần track expiration.
**Migration**: Credits có thể có expiration riêng nếu cần.

---

### Requirement: Automatic Plan Expiration
**Reason**: Không còn plan để expire.
**Migration**: N/A

---

### Requirement: Plan Expiration Display
**Reason**: Không còn plan để hiển thị.
**Migration**: Dashboard hiển thị credits balance thay vì plan info.

---

### Requirement: Auto-Grant Credits on Plan Upgrade
**Reason**: Không còn plan upgrade. Credits được thêm trực tiếp.
**Migration**: Admin thêm credits trực tiếp cho users.

---

### Requirement: Free Tier Upgrade Prompt
**Reason**: Không còn Free Tier concept.
**Migration**: Hiển thị prompt khi credits = 0.

---

### Requirement: Pro Troll Plan Display
**Reason**: Không còn plan display.
**Migration**: N/A

---

## MODIFIED Requirements

### Requirement: User Billing Dashboard
The system SHALL display billing information including credits balance and usage.

#### Scenario: View credits balance
- **WHEN** authenticated user visits Dashboard
- **THEN** the system SHALL display current credits balance in USD format
- **AND** display refCredits balance separately
- **AND** display total credits (credits + refCredits)

#### Scenario: View credits used
- **WHEN** authenticated user visits Dashboard
- **THEN** the system SHALL display lifetime credits used (creditsUsed)
- **AND** format as USD with 2 decimal places

#### Scenario: Zero credits warning
- **WHEN** user has credits = 0 AND refCredits = 0
- **THEN** the system SHALL display warning banner
- **AND** show message "Your credits have been exhausted. Please top up to continue using the API."
- **AND** provide link to payment/checkout page

#### Scenario: Low credits warning
- **WHEN** user has credits + refCredits < $5
- **AND** credits + refCredits > 0
- **THEN** the system SHALL display warning banner with amber/yellow styling
- **AND** show message "Low credits balance. Consider topping up soon."

---

### Requirement: User Profile API
The system SHALL provide API endpoints for user profile.

#### Scenario: Get current user info
- **WHEN** authenticated user calls `GET /api/user/me`
- **THEN** response SHALL include:
  - `username`: user's username
  - `apiKey`: masked API key (sk-trollllm-****...****)
  - `apiKeyCreatedAt`: timestamp of key creation
  - `credits`: current credits balance (USD)
  - `refCredits`: current referral credits balance (USD)
  - `creditsUsed`: lifetime credits used (USD)
  - `totalInputTokens`: lifetime input tokens
  - `totalOutputTokens`: lifetime output tokens
- **AND** response SHALL NOT include `plan` field
