# user-dashboard Specification

## Purpose
TBD - created by archiving change add-user-api-keys-billing. Update Purpose after archive.
## Requirements
### Requirement: User API Key Management
The system SHALL provide each user with a unique API key that can be viewed and rotated.

#### Scenario: Generate API key for new user
- **WHEN** a new user registers successfully
- **THEN** the system SHALL generate a unique API key with format `sk-trollllm-{64-char-hex}`
- **AND** store the key hash in database
- **AND** set `apiKeyCreatedAt` to current timestamp

#### Scenario: View masked API key
- **WHEN** authenticated user visits Dashboard
- **THEN** the system SHALL display API key in masked format `sk-trollllm-****...****{last4}`
- **AND** provide "Show" button to reveal full key
- **AND** provide "Copy" button to copy to clipboard

#### Scenario: Reveal full API key
- **WHEN** user clicks "Show" button on API key section
- **THEN** the system SHALL display full API key temporarily
- **AND** auto-hide after 30 seconds for security

#### Scenario: Copy API key to clipboard
- **WHEN** user clicks "Copy" button
- **THEN** the system SHALL copy full API key to clipboard
- **AND** show success toast notification

#### Scenario: Rotate API key
- **WHEN** user clicks "Rotate" button
- **AND** confirms the action in dialog
- **THEN** the system SHALL generate new API key with same format
- **AND** invalidate the old API key immediately
- **AND** display the new key (once only)
- **AND** update `apiKeyCreatedAt` to current timestamp
- **AND** show warning that old key will stop working

#### Scenario: API key rotation warning
- **WHEN** user initiates key rotation
- **THEN** the system SHALL display confirmation dialog with message:
  - "Are you sure you want to rotate your API key?"
  - "Your current key will be immediately invalidated."
  - "All applications using the current key will stop working."

---

### Requirement: User Billing Dashboard
The system SHALL display billing information including token usage, current plan, and plan expiration.

#### Scenario: View total tokens remaining
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display total tokens remaining
- **AND** format large numbers with K/M suffixes (e.g., 1.5M)

#### Scenario: View tokens used this month
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display tokens used in current billing month
- **AND** show usage percentage as progress bar
- **AND** show reset date (first day of next month)

#### Scenario: View current plan
- **WHEN** authenticated user visits Dashboard Billing section
- **THEN** the system SHALL display current plan with badge
- **AND** plan types are: Free, Dev, Pro
- **AND** show plan limits (e.g., "Dev: 15M tokens/month")
- **AND** show plan expiration date for Dev/Pro plans

#### Scenario: Monthly token usage reset
- **WHEN** new billing month starts (first day of month, 00:00 UTC)
- **THEN** the system SHALL reset `monthlyTokensUsed` to 0
- **AND** update `monthlyResetDate` to current date

---

### Requirement: User Profile API
The system SHALL provide API endpoints for user profile and API key management.

#### Scenario: Get current user info
- **WHEN** authenticated user calls `GET /api/user/me`
- **THEN** response SHALL include:
  - `username`: user's username
  - `apiKey`: masked API key (sk-trollllm-****...****)
  - `apiKeyCreatedAt`: timestamp of key creation
  - `plan`: current plan (free/pro/enterprise)
  - `totalTokens`: total token quota
  - `tokensUsed`: lifetime tokens used
  - `monthlyTokensUsed`: tokens used this month
  - `monthlyResetDate`: when monthly usage resets

#### Scenario: Get full API key
- **WHEN** authenticated user calls `GET /api/user/api-key`
- **THEN** response SHALL include full API key
- **AND** this endpoint SHALL be rate-limited to 10 requests/hour

#### Scenario: Rotate API key
- **WHEN** authenticated user calls `POST /api/user/api-key/rotate`
- **THEN** response SHALL include:
  - `newApiKey`: the new full API key (only shown once)
  - `oldKeyInvalidated`: true
  - `createdAt`: timestamp of new key

#### Scenario: Get billing info
- **WHEN** authenticated user calls `GET /api/user/billing`
- **THEN** response SHALL include:
  - `plan`: current plan name
  - `planLimits`: { monthlyTokens, features }
  - `totalTokensRemaining`: total_tokens - tokens_used
  - `monthlyTokensUsed`: tokens used this month
  - `monthlyTokensLimit`: monthly limit based on plan
  - `monthlyResetDate`: next reset date
  - `usagePercentage`: (monthlyTokensUsed / monthlyTokensLimit) * 100

---

### Requirement: API Key Format
The system SHALL use a specific format for user API keys.

#### Scenario: API key format validation
- **WHEN** validating an API key
- **THEN** the key SHALL match format: `sk-trollllm-{64-character-hex-string}`
- **AND** total length SHALL be 78 characters (11 + 1 + 64 + 1 + 64 = actually 11 + 64 = 75 chars: "sk-trollllm-" is 12 chars + 64 hex = 76 total)

#### Scenario: API key generation
- **WHEN** generating new API key
- **THEN** generate 32 bytes of cryptographically secure random data
- **AND** convert to 64-character lowercase hex string
- **AND** prepend `sk-trollllm-` prefix
- **AND** example: `sk-trollllm-4e969789b289aaaf1ec1c5ad3bd80f90dbb565691b0abae95a7e34b1d4f9b7d5`

---

### Requirement: Plan Configuration
The system SHALL support different user plans with varying token limits.

#### Scenario: Free plan limits
- **WHEN** user has plan "free"
- **THEN** monthly token limit SHALL be 0
- **AND** total token quota SHALL be 0
- **AND** RPM limit SHALL be 0
- **AND** user SHALL NOT be able to access API proxy

#### Scenario: Dev plan limits
- **WHEN** user has plan "dev"
- **THEN** plan value SHALL be $225 USD
- **AND** monthly token limit SHALL be calculated based on model pricing
- **AND** total token quota SHALL be calculated based on model pricing
- **AND** RPM limit SHALL be 300

#### Scenario: Pro plan limits
- **WHEN** user has plan "pro"
- **THEN** plan value SHALL be $600 USD
- **AND** monthly token limit SHALL be calculated based on model pricing
- **AND** total token quota SHALL be calculated based on model pricing
- **AND** RPM limit SHALL be 1000

---

### Requirement: Free Tier Upgrade Prompt
The system SHALL prompt Free Tier users to upgrade when they attempt to use restricted features.

#### Scenario: Display upgrade prompt for Free Tier
- **WHEN** Free Tier user views dashboard
- **THEN** the system SHALL display a banner indicating API access is restricted
- **AND** provide a link/button to upgrade plan

#### Scenario: Handle free_tier_restricted error
- **WHEN** API returns error type "free_tier_restricted"
- **THEN** the system SHALL display user-friendly upgrade message
- **AND** NOT show raw error details

### Requirement: Admin Route Protection
The system SHALL restrict access to admin pages based on user role. Only users with role = 'admin' SHALL be able to access admin routes.

#### Scenario: Admin user accesses admin page
- **WHEN** a user with role 'admin' navigates to an admin page (e.g., /admin, /admin/pricing, /users)
- **THEN** the page SHALL render normally

#### Scenario: Regular user attempts to access admin page
- **WHEN** a user with role 'user' navigates to an admin page
- **THEN** the system SHALL display an "Access Denied" message
- **AND** the system SHALL redirect the user to /dashboard

#### Scenario: Unauthenticated user attempts to access admin page
- **WHEN** an unauthenticated user navigates to an admin page
- **THEN** the system SHALL redirect to the login page

### Requirement: Admin Routes Definition
The following routes SHALL be protected as admin-only:
- /admin - Admin dashboard
- /admin/pricing - Model pricing management
- /users - User management
- /keys - User API keys management (admin write, user read)
- /factory-keys - Factory keys management
- /proxies - Proxy management

#### Scenario: Protected routes list
- **WHEN** accessing any route in the admin routes list
- **THEN** the admin role check SHALL be enforced

### Requirement: Request History View
The system SHALL provide users with visibility into their API request history showing detailed cost breakdown.

#### Scenario: View request history page
- **WHEN** authenticated user navigates to `/dashboard/request-history`
- **THEN** the system SHALL display a table of recent API requests
- **AND** show columns: Time, Model, Input Tokens, Output Tokens, Cache (Write/Hit), Credits Cost, Status, Latency
- **AND** sort by most recent first (descending by createdAt)

#### Scenario: Display request details
- **WHEN** request history table is displayed
- **THEN** each row SHALL show:
  - `createdAt`: formatted as "YYYY-MM-DD HH:mm:ss"
  - `model`: model ID used (e.g., "claude-sonnet-4-20250514")
  - `inputTokens`: number of input tokens
  - `outputTokens`: number of output tokens
  - `cacheWriteTokens`: cache write tokens (if any)
  - `cacheHitTokens`: cache hit tokens (if any)
  - `creditsCost`: cost in credits (formatted as $X.XXXXXX)
  - `statusCode`: HTTP status (200, 400, 500, etc.)
  - `latencyMs`: response time in milliseconds

#### Scenario: Paginate request history
- **WHEN** user has more than 20 requests
- **THEN** the system SHALL paginate results with 20 items per page
- **AND** show pagination controls (Previous, Next, page numbers)
- **AND** display total count of requests

#### Scenario: Empty request history
- **WHEN** user has no API requests
- **THEN** the system SHALL display message "No requests yet"
- **AND** show helpful text about how to make API calls

---

### Requirement: Request History API
The system SHALL provide an API endpoint for fetching user's request history.

#### Scenario: Get request history
- **WHEN** authenticated user calls `GET /api/user/request-history`
- **THEN** response SHALL include:
  - `requests`: array of request log objects
  - `total`: total count of user's requests
  - `page`: current page number
  - `limit`: items per page
  - `totalPages`: total number of pages

#### Scenario: Pagination parameters
- **WHEN** user calls `GET /api/user/request-history?page=2&limit=20`
- **THEN** the system SHALL return the specified page
- **AND** default limit is 20, max limit is 100
- **AND** default page is 1

#### Scenario: Date range filtering
- **WHEN** user calls `GET /api/user/request-history?from=2025-01-01&to=2025-01-31`
- **THEN** the system SHALL filter requests within the date range
- **AND** dates are in ISO 8601 format

---

### Requirement: Enhanced Request Logging
The system SHALL log detailed information for each API request.

#### Scenario: Log request with token breakdown
- **WHEN** API proxy completes a request
- **THEN** the system SHALL log:
  - `userId`: username of the user making the request
  - `userKeyId`: the API key ID used
  - `factoryKeyId`: the factory key used
  - `model`: model ID requested
  - `inputTokens`: number of input tokens
  - `outputTokens`: number of output tokens
  - `cacheWriteTokens`: cache write tokens (0 if none)
  - `cacheHitTokens`: cache hit tokens (0 if none)
  - `creditsCost`: total credits cost for this request
  - `statusCode`: HTTP response status
  - `latencyMs`: request duration in milliseconds
  - `isSuccess`: boolean (statusCode === 200)
  - `createdAt`: timestamp

#### Scenario: Request log retention
- **WHEN** request logs are stored
- **THEN** logs SHALL be retained for 30 days
- **AND** automatically expire after TTL (MongoDB TTL index)

---

### Requirement: Dashboard Navigation - Request History
The system SHALL include Request History in the dashboard navigation.

#### Scenario: Show Request History menu item
- **WHEN** user views dashboard sidebar/navigation
- **THEN** "Request History" menu item SHALL be visible
- **AND** link to `/dashboard/request-history`
- **AND** display appropriate icon (e.g., clock/history icon)

#### Scenario: Active state for Request History menu
- **WHEN** user is on `/dashboard/request-history` page
- **THEN** the "Request History" menu item SHALL be highlighted as active

### Requirement: Auto-Grant Credits on Plan Upgrade
The system SHALL automatically grant credits to users when their plan is upgraded by admin and set plan expiration.

#### Scenario: Admin upgrades user to Dev plan
- **WHEN** admin sets user plan from Free to Dev
- **THEN** user receives $225 credits added to their balance
- **AND** `planStartDate` is set to current timestamp
- **AND** `planExpiresAt` is set to 1 month from now

#### Scenario: Admin upgrades user to Pro plan
- **WHEN** admin sets user plan from Free to Pro
- **THEN** user receives $500 credits added to their balance
- **AND** `planStartDate` is set to current timestamp
- **AND** `planExpiresAt` is set to 1 month from now

#### Scenario: Admin changes plan between paid tiers
- **WHEN** admin changes user plan from Dev to Pro
- **THEN** user receives the difference in credits ($500 - $225 = $275)
- **AND** `planStartDate` is updated to current timestamp
- **AND** `planExpiresAt` is updated to 1 month from now

### Requirement: Deduct Credits Per Request
The system SHALL deduct credits from user balance based on actual API usage cost.

#### Scenario: User makes API request
- **WHEN** user makes a request to the API proxy
- **THEN** credits are deducted based on model pricing (input_price_per_mtok * input_tokens + output_price_per_mtok * output_tokens)

#### Scenario: Credit deduction calculation
- **WHEN** request uses Claude Opus (input=$5/MTok, output=$25/MTok)
- **AND** request uses 1000 input tokens and 500 output tokens
- **THEN** deducted amount = (5 * 1000 / 1_000_000) + (25 * 500 / 1_000_000) = $0.0175

### Requirement: Admin Users Table - Tokens Used Column
The admin users table SHALL display token usage information for each user.

#### Scenario: Display tokens used column in users table
- **WHEN** admin views the users table at `/users`
- **THEN** the table SHALL include a "Tokens Used" column
- **AND** display total tokens used (lifetime) for each user
- **AND** display monthly tokens used below or beside the total
- **AND** format large numbers with K/M suffixes (e.g., 1.5M, 250K)

#### Scenario: Token usage display format
- **WHEN** displaying token usage in users table
- **THEN** total tokens SHALL be displayed with icon or label indicating "Total"
- **AND** monthly tokens SHALL be displayed with label indicating "Monthly"
- **AND** numbers over 1,000,000 SHALL show as X.XM
- **AND** numbers over 1,000 SHALL show as X.XK

### Requirement: Plan Expiration Tracking
The system SHALL track when a user's plan was upgraded and when it will expire.

#### Scenario: Set plan start date on upgrade
- **WHEN** admin upgrades user plan from Free to Dev or Pro
- **THEN** the system SHALL set `planStartDate` to current timestamp
- **AND** set `planExpiresAt` to 1 month from current timestamp

#### Scenario: Update plan expiration on plan change
- **WHEN** admin changes user plan between Dev and Pro
- **THEN** the system SHALL update `planStartDate` to current timestamp
- **AND** set `planExpiresAt` to 1 month from current timestamp

#### Scenario: Clear plan dates on downgrade to Free
- **WHEN** admin sets user plan to Free
- **THEN** the system SHALL set `planStartDate` to null
- **AND** set `planExpiresAt` to null

---

### Requirement: Automatic Plan Expiration
The system SHALL automatically reset expired plans to Free Tier.

#### Scenario: Check plan expiration on API request
- **WHEN** user makes an API request
- **AND** current time is past `planExpiresAt`
- **THEN** the system SHALL reset user's `plan` to `'free'`
- **AND** reset `credits` to `0`
- **AND** reset `totalTokens` to `0`
- **AND** set `planStartDate` to null
- **AND** set `planExpiresAt` to null
- **AND** continue processing the request with Free Tier limits

#### Scenario: Check plan expiration on login
- **WHEN** user logs in
- **AND** current time is past `planExpiresAt`
- **THEN** the system SHALL reset user's plan to Free Tier (same as API request scenario)

#### Scenario: Scheduled plan expiration check (optional)
- **WHEN** scheduled job runs (e.g., daily at 00:00 UTC)
- **THEN** the system SHALL find all users where `planExpiresAt < current time`
- **AND** reset their plans to Free Tier

---

### Requirement: Plan Expiration Display
The system SHALL display plan expiration information to users.

#### Scenario: Display plan expiration date in dashboard
- **WHEN** user with Dev or Pro plan views billing section
- **THEN** the system SHALL display `planExpiresAt` as "Plan expires on: YYYY-MM-DD"
- **AND** show countdown if expiring within 7 days

#### Scenario: Display warning for expiring plan
- **WHEN** user's plan is expiring within 7 days
- **THEN** the system SHALL display a warning banner
- **AND** show message "Your plan will expire on {date}. Contact admin to renew."

#### Scenario: Free tier user does not see expiration
- **WHEN** Free Tier user views billing section
- **THEN** the system SHALL NOT display plan expiration date
- **AND** NOT display expiration warning

---

### Requirement: User Model - Separate Input/Output Token Fields
The User model SHALL track input and output tokens separately from combined totals.

#### Scenario: User model stores input/output tokens
- **WHEN** a user makes API requests
- **THEN** the system SHALL track `totalInputTokens` for input tokens used
- **AND** track `totalOutputTokens` for output tokens used
- **AND** both fields SHALL default to 0 for new/existing users

### Requirement: Admin Users Table - Input/Output Token Columns
The admin users table SHALL display separate input and output token columns.

#### Scenario: Display input/output columns in users table
- **WHEN** admin views the users table at `/users`
- **THEN** the table SHALL include an "Input Tokens" column
- **AND** include an "Output Tokens" column
- **AND** format large numbers with K/M suffixes (e.g., 1.5M, 250K)

### Requirement: Admin Dashboard - System-Wide Token Breakdown
The admin dashboard SHALL display total input and output tokens across all users.

#### Scenario: Display total input/output tokens on admin page
- **WHEN** admin views the dashboard at `/admin`
- **THEN** the page SHALL display total input tokens for all users
- **AND** display total output tokens for all users
- **AND** format large numbers appropriately

### Requirement: Admin Dashboard - Time Period Filter
The admin dashboard SHALL allow filtering metrics by time period.

#### Scenario: Filter metrics by time period
- **WHEN** admin views the dashboard at `/admin`
- **THEN** the page SHALL display period filter options (1h, 24h, 7d, All)
- **AND** clicking a period SHALL re-fetch metrics for that time range
- **AND** the selected period SHALL be visually indicated
- **AND** metrics card SHALL display the current period context

