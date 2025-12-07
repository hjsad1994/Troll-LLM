## ADDED Requirements

### Requirement: Friend API Key Management
The system SHALL allow users to create a secondary "Friend API Key" that can be shared with friends for testing, with per-model spending limits.

#### Scenario: Generate Friend API Key
- **WHEN** authenticated user calls `POST /api/user/friend-key`
- **AND** user does not already have a Friend Key
- **THEN** the system SHALL generate a new Friend API Key with format `sk-trollllm-friend-{64-char-hex}`
- **AND** associate it with the user's account
- **AND** return the full key (shown once only)
- **AND** set `createdAt` to current timestamp

#### Scenario: User already has Friend Key
- **WHEN** authenticated user calls `POST /api/user/friend-key`
- **AND** user already has an active Friend Key
- **THEN** the system SHALL return HTTP 409 Conflict
- **AND** include error message "Friend Key already exists. Use rotate to generate a new one."

#### Scenario: View Friend API Key
- **WHEN** authenticated user calls `GET /api/user/friend-key`
- **THEN** response SHALL include:
  - `friendKey`: masked key (sk-trollllm-friend-****...****{last4})
  - `isActive`: boolean
  - `createdAt`: timestamp
  - `modelLimits`: array of model limits with usage
  - `totalUsedUsd`: total credits used via Friend Key
  - `requestsCount`: total requests made

#### Scenario: Rotate Friend API Key
- **WHEN** authenticated user calls `POST /api/user/friend-key/rotate`
- **AND** confirms the action
- **THEN** the system SHALL generate new Friend API Key
- **AND** invalidate the old Friend API Key immediately
- **AND** reset usage counters to 0
- **AND** preserve model limits configuration
- **AND** return the new full key (shown once only)
- **AND** update `rotatedAt` to current timestamp

#### Scenario: Delete Friend API Key
- **WHEN** authenticated user calls `DELETE /api/user/friend-key`
- **THEN** the system SHALL mark Friend Key as inactive
- **AND** reject any subsequent requests using this key
- **AND** return success response

---

### Requirement: Friend Key Per-Model Spending Limits
The system SHALL allow users to set spending limits per AI model for their Friend Key.

#### Scenario: Set model limits
- **WHEN** authenticated user calls `PUT /api/user/friend-key/limits`
- **AND** body contains `modelLimits` array with `{ modelId, limitUsd }`
- **THEN** the system SHALL update the Friend Key's model limits
- **AND** validate that `limitUsd` is a non-negative number
- **AND** return updated limits configuration

#### Scenario: View model usage
- **WHEN** authenticated user calls `GET /api/user/friend-key/usage`
- **THEN** response SHALL include array of:
  - `modelId`: model identifier
  - `modelName`: human-readable model name
  - `limitUsd`: configured limit in USD
  - `usedUsd`: amount used in USD
  - `remainingUsd`: remaining budget (limitUsd - usedUsd)
  - `usagePercent`: percentage used (usedUsd / limitUsd * 100)
  - `isExhausted`: boolean (usedUsd >= limitUsd)

#### Scenario: Model limit of zero disables access
- **WHEN** a model limit is set to 0 or not configured
- **THEN** the Friend Key SHALL NOT be able to use that model
- **AND** requests for that model SHALL return HTTP 402 with error type "friend_key_model_not_allowed"

#### Scenario: Limit validation
- **WHEN** user sets model limits
- **THEN** the system SHALL validate:
  - `limitUsd` must be >= 0
  - `modelId` must be a valid model identifier
- **AND** reject invalid configurations with HTTP 400

---

### Requirement: Friend Key Usage Dashboard Page
The system SHALL provide a dashboard page for managing Friend Key and monitoring usage.

#### Scenario: View Friend Key management page
- **WHEN** authenticated user navigates to `/dashboard/friend-key`
- **THEN** the system SHALL display:
  - Friend Key section with masked key, copy button, rotate button
  - Model limits configuration table
  - Usage progress bars per model
  - Recent activity log

#### Scenario: Friend Key section - no key exists
- **WHEN** user has no Friend Key
- **THEN** the page SHALL display "Generate Friend Key" button
- **AND** explain the purpose of Friend Key

#### Scenario: Friend Key section - key exists
- **WHEN** user has active Friend Key
- **THEN** the page SHALL display:
  - Masked key (sk-trollllm-friend-****...{last4})
  - "Show" button to reveal full key temporarily
  - "Copy" button to copy to clipboard
  - "Rotate" button to generate new key
  - "Delete" button to remove Friend Key

#### Scenario: Model limits configuration
- **WHEN** user views model limits section
- **THEN** the system SHALL display a table with:
  - Model name column
  - Limit input field (USD) per model
  - Current usage display (e.g., "$5.00 / $50.00")
  - Progress bar visualization
- **AND** provide "Save Limits" button to save all changes

#### Scenario: Usage progress visualization
- **WHEN** displaying model usage
- **THEN** progress bars SHALL use color coding:
  - Green: < 70% used
  - Yellow/Amber: 70-90% used
  - Red: > 90% used
- **AND** show exact percentage and dollar amounts

#### Scenario: Activity log display
- **WHEN** user views activity section
- **THEN** the page SHALL display recent Friend Key requests with:
  - Timestamp
  - Model used
  - Input/Output tokens
  - Credits cost
  - Status (success/error)
- **AND** support pagination (20 items per page)

---

### Requirement: Friend Key Navigation
The system SHALL include Friend Key page in dashboard navigation.

#### Scenario: Show Friend Key menu item
- **WHEN** user views dashboard sidebar/navigation
- **THEN** "Friend Key" menu item SHALL be visible
- **AND** link to `/dashboard/friend-key`
- **AND** display appropriate icon (e.g., share/users icon)

#### Scenario: Active state for Friend Key menu
- **WHEN** user is on `/dashboard/friend-key` page
- **THEN** the "Friend Key" menu item SHALL be highlighted as active

---

### Requirement: Friend Key Usage Warnings
The system SHALL warn users when Friend Key usage is approaching limits.

#### Scenario: Display warning for high usage
- **WHEN** any model usage exceeds 80% of limit
- **THEN** the system SHALL display amber warning icon next to that model
- **AND** show tooltip with remaining budget

#### Scenario: Display alert for exhausted model
- **WHEN** a model's usage reaches 100% of limit
- **THEN** the system SHALL display red alert icon
- **AND** show "Limit reached" badge
- **AND** indicate that model is disabled for Friend Key
