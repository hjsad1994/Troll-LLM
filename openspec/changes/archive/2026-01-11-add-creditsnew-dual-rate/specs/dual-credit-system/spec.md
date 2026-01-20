# Spec Delta: Dual Credit System

## ADDED Requirements

### Requirement: UserNew Model Support for Dual Credit Fields

The UserNew model SHALL support two separate credit balance fields to enable dual-rate pricing.

#### Scenario: New fields exist in schema
- **Given** the UserNew model in `backend/src/models/user-new.model.ts`
- **When** the schema is defined
- **Then** it SHALL include `creditsNew: { type: Number, default: 0 }`
- **And** it SHALL include `creditsNewUsed: { type: Number, default: 0 }`
- **And** the IUserNew interface SHALL include `creditsNew: number`
- **And** the IUserNew interface SHALL include `creditsNewUsed: number`

#### Scenario: Existing users default to zero new credits
- **Given** an existing user document in the usersNew collection
- **When** the schema update is deployed
- **Then** the user document SHALL have `creditsNew: 0` by default
- **And** the user document SHALL have `creditsNewUsed: 0` by default
- **And** the existing `credits` and `creditsUsed` fields SHALL remain unchanged

#### Scenario: New users start with zero new credits
- **Given** a new user registration
- **When** the user document is created
- **Then** `creditsNew` SHALL be initialized to `0`
- **And** `creditsNewUsed` SHALL be initialized to `0`

### Requirement: Separate Credit Deduction by Endpoint

The Go proxy SHALL deduct from different credit fields based on which endpoint (port) receives the request.

#### Scenario: Port 8005 (ohmygpt) uses legacy credits
- **Given** a user makes an API request to `chat.trollllm.xyz` (port 8005)
- **When** the request is processed and credits are deducted
- **Then** the system SHALL deduct from the `credits` field
- **And** the system SHALL increment the `creditsUsed` field
- **And** the `creditsNew` and `creditsNewUsed` fields SHALL remain unchanged

#### Scenario: Port 8004 (Openhands) uses new credits
- **Given** a user makes an API request to `chat2.trollllm.xyz` (port 8004)
- **When** the request is processed and credits are deducted
- **Then** the system SHALL deduct from the `creditsNew` field
- **And** the system SHALL increment the `creditsNewUsed` field
- **And** the `credits` and `creditsUsed` fields SHALL remain unchanged

#### Scenario: Insufficient new credits blocks port 8004 request
- **Given** a user with `creditsNew: 0` or `creditsNew < estimated_cost`
- **When** the user makes an API request to port 8004
- **Then** the request SHALL be rejected with HTTP 402
- **And** the error message SHALL indicate "Insufficient new credits"
- **And** no credits SHALL be deducted from any field

#### Scenario: Insufficient legacy credits blocks port 8005 request
- **Given** a user with `credits: 0` or `credits < estimated_cost`
- **When** the user makes an API request to port 8005
- **Then** the request SHALL be rejected with HTTP 402
- **And** the error message SHALL indicate "Insufficient credits"
- **And** no credits SHALL be deducted from any field

### Requirement: User Profile API Returns Both Credit Balances

The user profile API SHALL return both credit fields to allow frontend display of dual balances.

#### Scenario: Profile endpoint includes creditsNew
- **Given** an authenticated user
- **When** calling `GET /api/user/profile`
- **Then** the response SHALL include the `credits` field
- **And** the response SHALL include the `creditsNew` field
- **And** the response SHALL include the `creditsUsed` field
- **And** the response SHALL include the `creditsNewUsed` field

#### Scenario: Admin user list includes both credit fields
- **Given** an admin user
- **When** calling `GET /api/admin/users`
- **Then** each user object SHALL include both `credits` and `creditsNew`
- **And** each user object SHALL include both `creditsUsed` and `creditsNewUsed`

### Requirement: Go Proxy User Model Includes creditsNew

The Go proxy UserKey model SHALL include creditsNew fields for validation and deduction.

#### Scenario: UserKey struct has new credit fields
- **Given** the UserKey struct in `goproxy/internal/userkey/model.go`
- **When** the struct is defined
- **Then** it SHALL include `CreditsNew float64` field with bson tag `"creditsNew"`
- **And** it SHALL include `CreditsNewUsed float64` field with bson tag `"creditsNewUsed"`
- **And** it SHALL maintain existing `Credits` and `CreditsUsed` fields

#### Scenario: User key validation loads both credit fields
- **Given** a user key is fetched from MongoDB
- **When** the document is unmarshaled into UserKey struct
- **Then** the `CreditsNew` field SHALL be populated with the database value
- **And** the `CreditsNewUsed` field SHALL be populated with the database value

## MODIFIED Requirements

### Requirement: Credit Validation Checks Appropriate Field

Existing credit validation logic SHALL be extended to check the appropriate credit field based on endpoint.

#### Scenario: Validator checks creditsNew for port 8004
- **Given** a request to port 8004
- **When** the validator checks credit sufficiency
- **Then** it SHALL read the `creditsNew` field from the user document
- **And** it SHALL NOT check the `credits` field

#### Scenario: Validator checks credits for port 8005
- **Given** a request to port 8005
- **When** the validator checks credit sufficiency
- **Then** it SHALL read the `credits` field from the user document
- **And** it SHALL NOT check the `creditsNew` field

### Requirement: Usage Tracking Updates Appropriate Field

Existing usage tracking SHALL be extended to update the appropriate credit field based on endpoint.

#### Scenario: Usage tracker updates creditsNew for port 8004
- **Given** a request to port 8004 is completed with cost $X
- **When** the usage tracker records the usage
- **Then** it SHALL execute MongoDB update: `$inc: { creditsNew: -X, creditsNewUsed: X }`
- **And** it SHALL NOT modify `credits` or `creditsUsed`

#### Scenario: Usage tracker updates credits for port 8005
- **Given** a request to port 8005 is completed with cost $X
- **When** the usage tracker records the usage
- **Then** it SHALL execute MongoDB update: `$inc: { credits: -X, creditsUsed: X }`
- **And** it SHALL NOT modify `creditsNew` or `creditsNewUsed`

## Data Types

### UserNewCreditFields
```typescript
{
  credits: number           // Legacy credit balance (2500 VND/$1 rate)
  creditsUsed: number       // Legacy credits consumed (lifetime)
  creditsNew: number        // New credit balance (1500 VND/$1 rate)
  creditsNewUsed: number    // New credits consumed (lifetime)
}
```

### ProfileResponse
```typescript
{
  _id: string
  credits: number
  creditsNew: number
  creditsUsed: number
  creditsNewUsed: number
  // ... other fields
}
```

### GoUserKey
```go
type UserKey struct {
    ID             string    `bson:"_id"`
    Credits        float64   `bson:"credits"`
    CreditsUsed    float64   `bson:"creditsUsed"`
    CreditsNew     float64   `bson:"creditsNew"`
    CreditsNewUsed float64   `bson:"creditsNewUsed"`
    // ... other fields
}
```

## Constraints

- The `creditsNew` field is independent of the `credits` field
- No automatic conversion between credit fields
- Each endpoint deducts from exactly one credit field
- Both credit fields can coexist with non-zero values
- Credit expiration applies to both fields equally (same `expiresAt` date)
- Admin users can manually adjust both credit fields independently
