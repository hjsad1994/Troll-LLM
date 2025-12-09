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
The system SHALL display plan start and expiration information prominently to users.

#### Scenario: Display plan period for paid users
- **WHEN** user with Dev or Pro plan views dashboard Credits section
- **THEN** the system SHALL display a "Plan Period" section showing:
  - `planStartDate` formatted as "Started: DD/MM/YYYY"
  - `planExpiresAt` formatted as "Expires: DD/MM/YYYY"
  - Days remaining until expiration (e.g., "(15 days)")

#### Scenario: Display plan period styling
- **WHEN** plan period is displayed
- **THEN** the dates SHALL be shown in a distinct visual section
- **AND** use appropriate colors (normal for active, amber for expiring soon)

#### Scenario: Display warning for expiring plan
- **WHEN** user's plan is expiring within 7 days
- **THEN** the system SHALL display a warning banner
- **AND** show message "Your plan will expire on {date}. Contact admin to renew."
- **AND** highlight the days remaining in amber/orange color

#### Scenario: Free tier user does not see plan period
- **WHEN** Free Tier user views dashboard Credits section
- **THEN** the system SHALL NOT display plan start date
- **AND** NOT display plan expiration date
- **AND** NOT display days remaining

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

### Requirement: User Dashboard - Credits Usage By Period
The user dashboard SHALL display credits used in recent time periods.

#### Scenario: Display credits usage breakdown
- **WHEN** user views their dashboard at `/dashboard`
- **THEN** the page SHALL display credits used in last 1 hour
- **AND** display credits used in last 24 hours
- **AND** display credits used in last 7 days
- **AND** display credits used in last 30 days
- **AND** format credits as USD with 2 decimal places

### Requirement: Admin Dashboard - Credits Burned Metric
The admin dashboard SHALL display total credits burned filtered by period.

#### Scenario: Display total credits burned
- **WHEN** admin views the dashboard at `/admin`
- **THEN** the User Stats card SHALL include "Credits Burned" metric
- **AND** credits burned SHALL be filtered by the selected time period
- **AND** format as USD with 2 decimal places

### Requirement: Admin Users Table - Referral Credits Column
The admin users table SHALL display referral credits (refCredits) information for each user.

#### Scenario: Display refCredits column in users table
- **WHEN** admin views the users table at `/users`
- **THEN** the table SHALL include a "Ref Credits" column
- **AND** display the user's `refCredits` balance formatted as USD (e.g., $25.00)
- **AND** use consistent styling with the existing "Credits" column

#### Scenario: Display refCredits in mobile card view
- **WHEN** admin views the users list on mobile device
- **THEN** each user card SHALL display "Ref Credits" in the stats grid
- **AND** format the value as USD with 2 decimal places

### Requirement: Admin Dashboard - Model Usage Statistics
The admin dashboard SHALL display usage statistics broken down by AI model.

#### Scenario: Display model usage table
- **WHEN** admin views the dashboard at `/admin`
- **THEN** the page SHALL display a "Model Usage" section
- **AND** show a table/list of all models used in the selected period
- **AND** for each model display: Input Tokens, Output Tokens, Total Tokens, Credits Burned, Request Count
- **AND** sort models by total tokens descending (most used first)

#### Scenario: Model usage respects period filter
- **WHEN** admin selects a time period (1h, 24h, 7d, all)
- **THEN** the model usage statistics SHALL be filtered to that period
- **AND** only show models with requests in that period

#### Scenario: Empty model usage
- **WHEN** no requests exist in the selected period
- **THEN** the system SHALL display "No model usage data" message

### Requirement: Model Stats API Endpoint
The system SHALL provide an API endpoint for fetching model usage statistics.

#### Scenario: Get model stats
- **WHEN** admin calls `GET /admin/model-stats?period=24h`
- **THEN** response SHALL include array of model stats objects
- **AND** each object contains: model, inputTokens, outputTokens, totalTokens, creditsBurned, requestCount
- **AND** results are sorted by totalTokens descending

### Requirement: Admin Edit User Referral Credits
The admin users page SHALL allow editing of user's referral credits balance.

#### Scenario: Display refCredits input in edit modal
- **WHEN** admin clicks "Edit" button on a user row
- **THEN** the edit modal SHALL display a "Ref Credits" input field
- **AND** the input SHALL be pre-populated with user's current `refCredits` value
- **AND** the input SHALL accept decimal numbers (min 0)

#### Scenario: Update user refCredits
- **WHEN** admin enters a new refCredits value and clicks "Save"
- **THEN** the system SHALL call `PATCH /admin/users/:username/refCredits`
- **AND** update the user's `refCredits` field in database
- **AND** refresh the users list to show updated value
- **AND** display success feedback

### Requirement: Update RefCredits API Endpoint
The system SHALL provide an API endpoint for updating user referral credits.

#### Scenario: Update refCredits via API
- **WHEN** admin calls `PATCH /admin/users/:username/refCredits` with `{ refCredits: number }`
- **THEN** the system SHALL validate refCredits is a non-negative number
- **AND** update the user's `refCredits` field
- **AND** return success response with updated user data

### Requirement: Models Health Display on Dashboard
The system SHALL display a list of available AI models with their health status on the user dashboard.

#### Scenario: View models section on dashboard
- **WHEN** authenticated user visits `/dashboard`
- **THEN** the system SHALL display a "Models" section
- **AND** show all available AI models from the system configuration
- **AND** for each model display: name, type (anthropic/openai), health status

#### Scenario: Display healthy model indicator
- **WHEN** a model's upstream endpoint is reachable and responding
- **THEN** the system SHALL display a green indicator (dot or badge)
- **AND** show status text "Healthy" or equivalent visual indicator

#### Scenario: Display unhealthy model indicator
- **WHEN** a model's upstream endpoint is unreachable or returning errors
- **THEN** the system SHALL display a red indicator (dot or badge)
- **AND** show status text "Unhealthy" or equivalent visual indicator

#### Scenario: Loading state for models
- **WHEN** dashboard is loading model health data
- **THEN** the system SHALL display loading skeleton or spinner
- **AND** show placeholder cards for models

#### Scenario: Auto-refresh model health
- **WHEN** user is viewing the dashboard
- **THEN** the system SHALL refresh model health status every 30 seconds
- **AND** update UI without full page reload

---

### Requirement: Models Health API Endpoint
The system SHALL provide an API endpoint for fetching model list with health status.

#### Scenario: Get models with health status
- **WHEN** user calls `GET /api/models/health`
- **THEN** response SHALL include array of model objects
- **AND** each object contains: id, name, type, isHealthy, lastCheckedAt

#### Scenario: Health check implementation
- **WHEN** health check runs for a model
- **THEN** the system SHALL attempt to reach the model's upstream endpoint
- **AND** set isHealthy to true if response received within 5 seconds
- **AND** set isHealthy to false if timeout or error occurs
- **AND** update lastCheckedAt timestamp

### Requirement: Pro Troll Plan Display
The system SHALL display Pro Troll plan badge and styling across dashboard and admin pages.

#### Scenario: User with Pro Troll plan views dashboard
- **WHEN** user with pro-troll plan views dashboard
- **THEN** dashboard displays amber/orange Pro Troll badge
- **AND** credits card shows Pro Troll plan indicator

#### Scenario: Admin filters users by Pro Troll plan
- **WHEN** admin selects pro-troll filter on users page
- **THEN** only users with pro-troll plan are displayed

#### Scenario: Admin changes user plan to Pro Troll
- **WHEN** admin edits user and selects pro-troll plan
- **THEN** user plan is updated to pro-troll

### Requirement: Admin Custom Credits Input
The admin users page SHALL allow custom amounts for setting or adding credits via two separate input fields.

#### Scenario: Display SET credits input
- **WHEN** admin views user row in users table
- **THEN** the system SHALL display a SET credits input with submit button
- **AND** input accepts decimal numbers >= 0
- **AND** button label is "SET"
- **AND** button has amber/warning styling

#### Scenario: Display ADD credits input
- **WHEN** admin views user row in users table
- **THEN** the system SHALL display an ADD credits input with submit button
- **AND** input accepts decimal numbers >= 0
- **AND** button label is "ADD"
- **AND** button has emerald/success styling

#### Scenario: SET credits action
- **WHEN** admin enters value in SET input and clicks SET button
- **AND** confirms the action
- **THEN** the system SHALL call `PATCH /admin/users/:username/credits` with `{ credits: number }`
- **AND** user's credits SHALL be replaced with the entered value
- **AND** refresh user list after success
- **AND** show error alert on failure

#### Scenario: ADD credits action
- **WHEN** admin enters value in ADD input and clicks ADD button
- **AND** confirms the action
- **THEN** the system SHALL call `POST /admin/users/:username/credits/add` with `{ amount: number }`
- **AND** entered value SHALL be added to user's existing credits
- **AND** refresh user list after success
- **AND** show error alert on failure

#### Scenario: Validation for credits inputs
- **WHEN** admin enters invalid value (negative, non-numeric)
- **THEN** the system SHALL prevent submission
- **AND** show validation error

#### Scenario: Confirmation dialog for credits actions
- **WHEN** admin clicks SET or ADD button
- **THEN** the system SHALL show confirmation dialog
- **AND** dialog shows: "SET credits to $X for {username}?" or "ADD $X credits to {username}?"
- **AND** user must confirm before action executes

### Requirement: User Dashboard Test Page
The system SHALL provide a user dashboard test page at `/dashboard-test` that displays detailed request analytics for the current user.

#### Scenario: User access own data
- **WHEN** a logged-in user accesses `/dashboard-test`
- **THEN** the system SHALL display detailed analytics for **that user only**

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user attempts to access `/dashboard-test`
- **THEN** the system SHALL redirect them to `/login`

### Requirement: User Detailed Usage Statistics Endpoint
The system SHALL provide an endpoint `GET /user/detailed-usage` that returns aggregated request metrics for the authenticated user.

#### Scenario: Get detailed usage by period
- **WHEN** user calls `GET /user/detailed-usage?period=24h`
- **THEN** the system SHALL return metrics for **current user only**:
  - `inputTokens`: Sum of all input tokens in the period
  - `outputTokens`: Sum of all output tokens in the period
  - `cacheWriteTokens`: Sum of all cache write tokens in the period
  - `cacheHitTokens`: Sum of all cache hit tokens in the period
  - `creditsBurned`: Sum of all credits cost in the period
  - `requestCount`: Total number of requests in the period

#### Scenario: Supported periods
- **WHEN** user specifies period parameter
- **THEN** the system SHALL support: `1h`, `24h`, `7d`, `30d`
- **AND** default to `24h` if not specified

#### Scenario: Data isolation
- **WHEN** user calls the endpoint
- **THEN** the system SHALL only return data where `userId` matches the authenticated user
- **AND** SHALL NOT expose any other user's data

### Requirement: Detailed Usage Display Card
The dashboard test page SHALL display a card showing detailed usage breakdown.

#### Scenario: Display detailed metrics
- **WHEN** user views the dashboard test page
- **THEN** the system SHALL display a card with:
  - Input Tokens (formatted with K/M/B suffix for large numbers)
  - Output Tokens (formatted with K/M/B suffix)
  - Cache Write Tokens (formatted with K/M/B suffix)
  - Cache Hit Tokens (formatted with K/M/B suffix)
  - Credits Burned (formatted as USD with 2 decimal places)
  - Request Count

#### Scenario: Period selector
- **WHEN** user clicks on a period button (1h, 24h, 7d, 30d)
- **THEN** the system SHALL update all displayed metrics to reflect the selected period

