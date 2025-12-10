## MODIFIED Requirements

### Requirement: Admin Set User Credits
The system SHALL set user credits with a 7-day expiration period when admin updates credits.

#### Scenario: Admin sets credits for a user
- **WHEN** admin calls `PATCH /admin/users/:username/credits` with `{ credits: 50 }`
- **THEN** the system SHALL set user's `credits` to 50
- **AND** set `expiresAt` to 7 days from now
- **AND** set `purchasedAt` to current timestamp
- **AND** sync `expiresAt` to `user_keys` collection
- **AND** return response with `credits` and `expiresAt`

---

### Requirement: Admin Add User Credits
The system SHALL add credits to user balance and extend/set expiration period when admin adds credits.

#### Scenario: Admin adds credits to user with existing non-expired credits
- **WHEN** admin calls `POST /admin/users/:username/credits/add` with `{ amount: 20 }`
- **AND** user has existing credits with valid `expiresAt`
- **THEN** the system SHALL increment user's `credits` by 20
- **AND** extend `expiresAt` by 7 days from current `expiresAt`
- **AND** sync `expiresAt` to `user_keys` collection
- **AND** return response with `credits` and `expiresAt`

#### Scenario: Admin adds credits to user without expiration
- **WHEN** admin calls `POST /admin/users/:username/credits/add` with `{ amount: 20 }`
- **AND** user has no `expiresAt` or expired credits
- **THEN** the system SHALL increment user's `credits` by 20
- **AND** set `expiresAt` to 7 days from now
- **AND** set `purchasedAt` to current timestamp
- **AND** sync `expiresAt` to `user_keys` collection
- **AND** return response with `credits` and `expiresAt`
